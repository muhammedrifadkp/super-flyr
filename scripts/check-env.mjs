// Checks that MongoDB and Cloudinary credentials work. Read-only: writes nothing.
// Usage: npm run check:env            (reads .env.local)
//        node --env-file=.env.production scripts/check-env.mjs

import { MongoClient } from "mongodb";

const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  console.log(`  ✗ ${msg}`);
  process.exitCode = 1;
};

console.log("Staff login");
if (process.env.ADMIN_PASSWORD) ok("ADMIN_PASSWORD is set");
else fail("ADMIN_PASSWORD is empty (login is off)");
if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) ok("AUTH_SECRET is set");
else fail("AUTH_SECRET is missing or shorter than 32 characters");

console.log("MongoDB");
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB?.trim() || "superflyr";
if (!uri) {
  fail("MONGODB_URI is empty");
} else {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000, appName: "super-flyr-check" });
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    ok(`connected to ${new URL(uri.replace("mongodb+srv://", "https://")).hostname}`);
    const db = client.db(dbName);
    const names = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name);
    const counts = await Promise.all(["stores", "products", "posters"].map(async (c) => `${c}: ${names.includes(c) ? await db.collection(c).countDocuments() : 0}`));
    ok(`database "${dbName}" – ${counts.join(", ")}`);
  } catch (error) {
    fail(`cannot connect: ${error.message}`);
    if (/whitelist|IP|ENOTFOUND|timed out|Server selection/i.test(error.message)) {
      console.log("    Hint: in Atlas → Network Access, allow this IP (or 0.0.0.0/0 for Vercel).");
    }
  } finally {
    await client.close().catch(() => {});
  }
}

console.log("Cloudinary");
const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(process.env.CLOUDINARY_URL?.trim() ?? "");
if (!match) {
  fail("CLOUDINARY_URL is missing or not in cloudinary://<key>:<secret>@<cloud> format");
} else {
  const [, key, secret, cloud] = match;
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/ping`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
  }).catch((error) => ({ ok: false, status: 0, statusText: error.message }));
  if (res.ok) ok(`credentials accepted for cloud "${cloud}"`);
  else fail(`Cloudinary rejected the credentials (${res.status} ${res.statusText})`);
}
