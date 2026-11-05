import { getRepo } from "@/lib/db";
import { randomId } from "@/lib/format";
import { handle, notFound } from "@/lib/http";

export const POST = handle(async (_request: Request, ctx: RouteContext<"/api/posters/[id]/duplicate">) => {
  const { id } = await ctx.params;
  const repo = getRepo();
  const source = await repo.getPoster(id);
  if (!source) notFound("Poster");
  const copy = await repo.createPoster({
    title: `${source.title} (copy)`.slice(0, 80),
    templateId: source.templateId,
    published: false,
    layout: source.layout,
    style: source.style,
    content: source.content,
    items: source.items.map((item) => ({ ...item, id: randomId(8) })),
  });
  return Response.json(copy, { status: 201 });
});
