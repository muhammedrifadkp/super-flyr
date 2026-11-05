// Copies the local demo data (.data/db.json + .data/uploads) into MongoDB and Cloudinary.
// Useful when you prepare a client's products locally and then move them to their deployment.
// Refuses to run if the target database already has products or posters.
//
// Usage: npm run import:local                      (reads .env.local)
//        node --env-file=.env.production scripts/import-local.mjs

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";

const root = process.cwd();
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || "superflyr";
const storeId = process.env.STORE_ID?.trim() || "default";
const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL?.trim() ?? "");
if (!uri || !match) {
  console.error("MONGODB_URI and CLOUDINARY_URL must both be set.");
  process.exit(1);
}
const [, apiKey, apiSecret, cloudName] = match;
const folder = process.env.CLOUDINARY_FOLDER?.trim() || `super-flyr/${dbName}/${storeId}`;

const local = JSON.parse(await readFile(path.join(root, ".data", "db.json"), "utf8"));
const store = (local.stores ?? []).find((s) => s.id === storeId);
const products = (local.products ?? []).filter((p) => p.storeId === storeId);
const posters = (local.posters ?? []).filter((p) => p.storeId === storeId);
console.log(`Local data: ${store ? 1 : 0} store, ${products.length} products, ${posters.length} posters`);

const client = new MongoClient(uri, { appName: "super-flyr-import" });
await client.connect();
const db = client.db(dbName);
try {
  const existing = (await db.collection("products").countDocuments({ storeId })) + (await db.collection("posters").countDocuments({ storeId }));
  if (existing > 0) {
    console.error(`Database "${dbName}" already has ${existing} products/posters for store "${storeId}". Nothing imported.`);
    process.exitCode = 1;
  } else {
    // 1. Upload local images to Cloudinary, once per file.
    const uploaded = new Map();
    async function moveImage(url) {
      if (!url || !url.startsWith("/api/files/")) return url;
      if (uploaded.has(url)) return uploaded.get(url);
      const name = url.slice("/api/files/".length);
      const bytes = await readFile(path.join(root, ".data", "uploads", name));
      const ext = name.split(".").pop();
      const type = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
      const form = new FormData();
      form.append("file", new Blob([bytes], { type }), name);
      form.append("api_key", apiKey);
      form.append("timestamp", timestamp);
      form.append("folder", folder);
      form.append("signature", signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.secure_url) throw new Error(`Upload failed for ${name}: ${json.error?.message ?? res.status}`);
      uploaded.set(url, json.secure_url);
      return json.secure_url;
    }

    const toDoc = ({ id, ...rest }) => ({ _id: id, ...rest });

    if (store) {
      const { id, ...rest } = { ...store, logoUrl: await moveImage(store.logoUrl) };
      await db.collection("stores").replaceOne({ _id: id }, rest, { upsert: true });
      console.log("  ✓ store branding");
    }
    const productDocs = [];
    for (const p of products) productDocs.push(toDoc({ ...p, imageUrl: await moveImage(p.imageUrl) }));
    if (productDocs.length) await db.collection("products").insertMany(productDocs);
    console.log(`  ✓ ${productDocs.length} products (${uploaded.size} images uploaded to ${folder})`);
    if (posters.length) await db.collection("posters").insertMany(posters.map(toDoc));
    console.log(`  ✓ ${posters.length} posters`);

    await Promise.all([
      db.collection("products").createIndex({ storeId: 1, name: 1 }),
      db.collection("posters").createIndex({ storeId: 1, updatedAt: -1 }),
      db.collection("posters").createIndex({ slug: 1 }, { unique: true }),
    ]);
    console.log(`Done. Imported into database "${dbName}".`);
  }
} finally {
  await client.close();
}
