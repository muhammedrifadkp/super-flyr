import "server-only";
import { ZodError } from "zod";
import { UploadError } from "./storage";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function notFound(what = "Item"): never {
  throw new HttpError(404, `${what} not found.`);
}

/** Wraps a route handler: JSON errors for validation, HTTP and unexpected failures. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        const first = error.issues[0];
        const field = first?.path.join(".");
        return Response.json(
          { error: first ? `${field ? `${field}: ` : ""}${first.message}` : "Invalid input.", issues: error.issues },
          { status: 400 },
        );
      }
      if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
      if (error instanceof UploadError) return Response.json({ error: error.message }, { status: 400 });
      console.error("[api]", error);
      const message = error instanceof Error ? error.message : "Something went wrong.";
      return Response.json({ error: message }, { status: 500 });
    }
  };
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON.");
  }
}
