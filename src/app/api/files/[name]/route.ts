import { readLocalImage } from "@/lib/storage";

/** Serves images uploaded in local mode (no Cloudinary). File names are random and never change. */
export async function GET(_request: Request, ctx: RouteContext<"/api/files/[name]">) {
  const { name } = await ctx.params;
  const file = await readLocalImage(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: {
      "Content-Type": file.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
