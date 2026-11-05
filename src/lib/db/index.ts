import "server-only";
import { currentStoreId } from "../defaults";
import { createLocalRepo } from "./local";
import { createMongoRepo } from "./mongo";
import type { Repo } from "./repo";

export type { Repo } from "./repo";

/**
 * MONGODB_URI set   -> MongoDB Atlas (production, Vercel).
 * MONGODB_URI unset -> .data/db.json on this machine (development and demos only).
 */
export function getRepo(): Repo {
  const storeId = currentStoreId();
  if (process.env.MONGODB_URI?.trim()) return createMongoRepo(storeId);
  if (process.env.VERCEL) {
    throw new Error("MONGODB_URI is not set. Vercel cannot store data on disk; add your MongoDB Atlas connection string.");
  }
  return createLocalRepo(storeId);
}
