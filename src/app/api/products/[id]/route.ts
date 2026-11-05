import { getRepo } from "@/lib/db";
import { handle, notFound, readJson } from "@/lib/http";
import { productPatchSchema } from "@/lib/validation";

export const PATCH = handle(async (request: Request, ctx: RouteContext<"/api/products/[id]">) => {
  const { id } = await ctx.params;
  const patch = productPatchSchema.parse(await readJson(request));
  const updated = await getRepo().updateProduct(id, patch);
  return updated ? Response.json(updated) : notFound("Product");
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/products/[id]">) => {
  const { id } = await ctx.params;
  const deleted = await getRepo().deleteProduct(id);
  return deleted ? new Response(null, { status: 204 }) : notFound("Product");
});
