import { connection } from "next/server";
import { getRepo } from "@/lib/db";
import { handle, readJson } from "@/lib/http";
import { productBulkSchema, productInputSchema } from "@/lib/validation";

export const GET = handle(async () => {
  await connection();
  return Response.json(await getRepo().listProducts());
});

/** Body: one product, or { products: [...] } for a bulk import. */
export const POST = handle(async (request: Request) => {
  const body = await readJson(request);
  const repo = getRepo();
  if (body && typeof body === "object" && "products" in body) {
    const { products } = productBulkSchema.parse(body);
    return Response.json(await repo.createProducts(products), { status: 201 });
  }
  const [created] = await repo.createProducts([productInputSchema.parse(body)]);
  return Response.json(created, { status: 201 });
});
