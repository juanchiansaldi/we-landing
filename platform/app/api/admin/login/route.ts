import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, COOKIE_NAME } from "../../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = String(body?.password || "");
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, createSessionToken(), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86_400,
  });
  return res;
}
