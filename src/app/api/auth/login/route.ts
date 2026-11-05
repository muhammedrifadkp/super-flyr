import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_MAX_AGE, authEnabled, checkPassword, createSessionToken } from "@/lib/auth";
import { handle, readJson } from "@/lib/http";

export const POST = handle(async (request: Request) => {
  if (!authEnabled()) return Response.json({ ok: true });
  const body = (await readJson(request)) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!(await checkPassword(password))) {
    return Response.json({ error: "Wrong password. Try again." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return Response.json({ ok: true });
});
