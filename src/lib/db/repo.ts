import type { Poster, PosterPatch, Product, ProductInput, Store } from "../types";

export type StorePatch = Partial<Omit<Store, "id" | "updatedAt">>;
export type NewPoster = Omit<Poster, "id" | "storeId" | "slug" | "createdAt" | "updatedAt">;

/** Storage contract. MongoDB in production, a local JSON file for development and demos. */
export interface Repo {
  readonly kind: "mongo" | "local";
  getStore(): Promise<Store>;
  updateStore(patch: StorePatch): Promise<Store>;

  listProducts(): Promise<Product[]>;
  createProducts(inputs: ProductInput[]): Promise<Product[]>;
  updateProduct(id: string, patch: Partial<ProductInput>): Promise<Product | null>;
  deleteProduct(id: string): Promise<boolean>;

  listPosters(): Promise<Poster[]>;
  getPoster(id: string): Promise<Poster | null>;
  getPosterBySlug(slug: string): Promise<Poster | null>;
  createPoster(input: NewPoster): Promise<Poster>;
  updatePoster(id: string, patch: PosterPatch): Promise<Poster | null>;
  deletePoster(id: string): Promise<boolean>;
}
