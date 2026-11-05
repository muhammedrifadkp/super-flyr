import { HttpError, handle } from "@/lib/http";
import { saveImage } from "@/lib/storage";

export const POST = handle(async (request: Request) => {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) throw new HttpError(400, "Choose an image to upload.");
  const url = await saveImage(file);
  return Response.json({ url }, { status: 201 });
});
