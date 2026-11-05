import { connection } from "next/server";
import { authEnabled } from "@/lib/auth";
import { storageKind } from "@/lib/storage";

/** Tells the dashboard which services are configured, so it can warn about demo mode. */
export async function GET() {
  await connection();
  return Response.json({
    auth: authEnabled(),
    database: process.env.MONGODB_URI?.trim() ? "mongo" : "local",
    storage: storageKind(),
  });
}
