import { MongoClient, type Collection, type Db } from "mongodb";
import { defaultStore } from "../defaults";
import { randomId } from "../format";
import type { Poster, Product, Store } from "../types";
import type { Repo } from "./repo";

type Doc<T extends { id: string }> = Omit<T, "id"> & { _id: string };

const holder = globalThis as unknown as { __superFlyrMongo?: Promise<Db> };

function connect(): Promise<Db> {
  if (!holder.__superFlyrMongo) {
    const uri = process.env.MONGODB_URI!;
    const client = new MongoClient(uri, { maxPoolSize: 5, appName: "super-flyr" });
    holder.__superFlyrMongo = client
      .connect()
      .then(async (c) => {
        const db = c.db(process.env.MONGODB_DB?.trim() || "superflyr");
        await Promise.all([
          db.collection("products").createIndex({ storeId: 1, name: 1 }),
          db.collection("posters").createIndex({ storeId: 1, updatedAt: -1 }),
          db.collection("posters").createIndex({ slug: 1 }, { unique: true }),
        ]);
        return db;
      })
      .catch((error) => {
        holder.__superFlyrMongo = undefined;
        throw error;
      });
  }
  return holder.__superFlyrMongo;
}

function fromDoc<T extends { id: string }>(doc: Doc<T> | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: _id } as unknown as T;
}

const now = () => new Date().toISOString();

export function createMongoRepo(storeId: string): Repo {
  const stores = async () => (await connect()).collection<Doc<Store>>("stores");
  const products = async () => (await connect()).collection<Doc<Product>>("products");
  const posters = async (): Promise<Collection<Doc<Poster>>> => (await connect()).collection<Doc<Poster>>("posters");

  return {
    kind: "mongo",

    async getStore() {
      const doc = await (await stores()).findOne({ _id: storeId });
      return fromDoc<Store>(doc) ?? defaultStore(storeId);
    },

    async updateStore(patch) {
      const current = await this.getStore();
      const next: Store = { ...current, ...patch, id: storeId, updatedAt: now() };
      const { id: _ignored, ...rest } = next;
      void _ignored;
      await (await stores()).replaceOne({ _id: storeId }, rest, { upsert: true });
      return next;
    },

    async listProducts() {
      const docs = await (await products()).find({ storeId }).sort({ name: 1 }).toArray();
      return docs.map((d) => fromDoc<Product>(d)!);
    },

    async createProducts(inputs) {
      const docs = inputs.map<Doc<Product>>((input) => ({
        ...input,
        _id: randomId(),
        storeId,
        createdAt: now(),
        updatedAt: now(),
      }));
      await (await products()).insertMany(docs);
      return docs.map((d) => fromDoc<Product>(d)!);
    },

    async updateProduct(id, patch) {
      const doc = await (await products()).findOneAndUpdate(
        { _id: id, storeId },
        { $set: { ...patch, updatedAt: now() } },
        { returnDocument: "after" },
      );
      return fromDoc<Product>(doc);
    },

    async deleteProduct(id) {
      const result = await (await products()).deleteOne({ _id: id, storeId });
      return result.deletedCount > 0;
    },

    async listPosters() {
      const docs = await (await posters()).find({ storeId }).sort({ updatedAt: -1 }).toArray();
      return docs.map((d) => fromDoc<Poster>(d)!);
    },

    async getPoster(id) {
      return fromDoc<Poster>(await (await posters()).findOne({ _id: id, storeId }));
    },

    async getPosterBySlug(slug) {
      return fromDoc<Poster>(await (await posters()).findOne({ slug, storeId }));
    },

    async createPoster(input) {
      const doc: Doc<Poster> = {
        ...input,
        _id: randomId(),
        slug: randomId(8),
        storeId,
        createdAt: now(),
        updatedAt: now(),
      };
      await (await posters()).insertOne(doc);
      return fromDoc<Poster>(doc)!;
    },

    async updatePoster(id, patch) {
      const doc = await (await posters()).findOneAndUpdate(
        { _id: id, storeId },
        { $set: { ...patch, updatedAt: now() } },
        { returnDocument: "after" },
      );
      return fromDoc<Poster>(doc);
    },

    async deletePoster(id) {
      const result = await (await posters()).deleteOne({ _id: id, storeId });
      return result.deletedCount > 0;
    },
  };
}
