import { connection } from "next/server";
import { getRepo } from "@/lib/db";
import { handle, readJson } from "@/lib/http";
import { storePatchSchema } from "@/lib/validation";

export const GET = handle(async () => {
  await connection();
  return Response.json(await getRepo().getStore());
});

export const PATCH = handle(async (request: Request) => {
  const patch = storePatchSchema.parse(await readJson(request));
  return Response.json(await getRepo().updateStore(patch));
});
