import { connection } from "next/server";
import { getRepo } from "@/lib/db";
import { handle, readJson } from "@/lib/http";
import { buildPoster } from "@/lib/poster/create";
import { posterCreateSchema } from "@/lib/validation";

export const GET = handle(async () => {
  await connection();
  return Response.json(await getRepo().listPosters());
});

export const POST = handle(async (request: Request) => {
  const input = posterCreateSchema.parse(await readJson(request));
  const repo = getRepo();
  const [store, products] = await Promise.all([repo.getStore(), repo.listProducts()]);
  const poster = await repo.createPoster(buildPoster({ ...input, store, products }));
  return Response.json(poster, { status: 201 });
});
