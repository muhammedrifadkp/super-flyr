import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultStore } from "../defaults";
import { randomId } from "../format";
import type { Poster, Product, Store } from "../types";
import type { Repo } from "./repo";

interface LocalData {
  stores: Store[];
  products: Product[];
  posters: Poster[];
}

export const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function load(): Promise<LocalData> {
  try {
    const raw = await readFile(DB_FILE, "utf8");
    const data = JSON.parse(raw) as Partial<LocalData>;
    return { stores: data.stores ?? [], products: data.products ?? [], posters: data.posters ?? [] };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { stores: [], products: [], posters: [] };
    throw error;
  }
}

async function save(data: LocalData) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, DB_FILE);
}

// One write queue per process, shared across route bundles, so concurrent writes never interleave.
const queueHolder = globalThis as unknown as { __superFlyrQueue?: Promise<unknown> };

function mutate<T>(fn: (data: LocalData) => T): Promise<T> {
  const run = async () => {
    const data = await load();
    const result = fn(data);
    await save(data);
    return result;
  };
  const next = (queueHolder.__superFlyrQueue ?? Promise.resolve()).then(run, run);
  queueHolder.__superFlyrQueue = next.catch(() => undefined);
  return next;
}

const now = () => new Date().toISOString();
const byNewest = <T extends { updatedAt: string }>(a: T, b: T) => b.updatedAt.localeCompare(a.updatedAt);

export function createLocalRepo(storeId: string): Repo {
  return {
    kind: "local",

    async getStore() {
      const data = await load();
      return data.stores.find((s) => s.id === storeId) ?? defaultStore(storeId);
    },

    updateStore(patch) {
      return mutate((data) => {
        const index = data.stores.findIndex((s) => s.id === storeId);
        const current = index >= 0 ? data.stores[index] : defaultStore(storeId);
        const next: Store = { ...current, ...patch, id: storeId, updatedAt: now() };
        if (index >= 0) data.stores[index] = next;
        else data.stores.push(next);
        return next;
      });
    },

    async listProducts() {
      const data = await load();
      return data.products.filter((p) => p.storeId === storeId).sort((a, b) => a.name.localeCompare(b.name));
    },

    createProducts(inputs) {
      return mutate((data) => {
        const created = inputs.map<Product>((input) => ({
          ...input,
          id: randomId(),
          storeId,
          createdAt: now(),
          updatedAt: now(),
        }));
        data.products.push(...created);
        return created;
      });
    },

    updateProduct(id, patch) {
      return mutate((data) => {
        const index = data.products.findIndex((p) => p.id === id && p.storeId === storeId);
        if (index < 0) return null;
        data.products[index] = { ...data.products[index], ...patch, updatedAt: now() };
        return data.products[index];
      });
    },

    deleteProduct(id) {
      return mutate((data) => {
        const before = data.products.length;
        data.products = data.products.filter((p) => !(p.id === id && p.storeId === storeId));
        return data.products.length < before;
      });
    },

    async listPosters() {
      const data = await load();
      return data.posters.filter((p) => p.storeId === storeId).sort(byNewest);
    },

    async getPoster(id) {
      const data = await load();
      return data.posters.find((p) => p.id === id && p.storeId === storeId) ?? null;
    },

    async getPosterBySlug(slug) {
      const data = await load();
      return data.posters.find((p) => p.slug === slug && p.storeId === storeId) ?? null;
    },

    createPoster(input) {
      return mutate((data) => {
        const poster: Poster = {
          ...input,
          id: randomId(),
          slug: randomId(8),
          storeId,
          createdAt: now(),
          updatedAt: now(),
        };
        data.posters.push(poster);
        return poster;
      });
    },

    updatePoster(id, patch) {
      return mutate((data) => {
        const index = data.posters.findIndex((p) => p.id === id && p.storeId === storeId);
        if (index < 0) return null;
        data.posters[index] = { ...data.posters[index], ...patch, updatedAt: now() };
        return data.posters[index];
      });
    },

    deletePoster(id) {
      return mutate((data) => {
        const before = data.posters.length;
        data.posters = data.posters.filter((p) => !(p.id === id && p.storeId === storeId));
        return data.posters.length < before;
      });
    },
  };
}
