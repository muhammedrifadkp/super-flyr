import { getRepo } from "@/lib/db";
import { handle, notFound, readJson } from "@/lib/http";
import { posterPatchSchema } from "@/lib/validation";

export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/posters/[id]">) => {
  const { id } = await ctx.params;
  const poster = await getRepo().getPoster(id);
  return poster ? Response.json(poster) : notFound("Poster");
});

export const PATCH = handle(async (request: Request, ctx: RouteContext<"/api/posters/[id]">) => {
  const { id } = await ctx.params;
  const patch = posterPatchSchema.parse(await readJson(request));
  const updated = await getRepo().updatePoster(id, patch);
  return updated ? Response.json(updated) : notFound("Poster");
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/posters/[id]">) => {
  const { id } = await ctx.params;
  const deleted = await getRepo().deletePoster(id);
  return deleted ? new Response(null, { status: 204 }) : notFound("Poster");
});
