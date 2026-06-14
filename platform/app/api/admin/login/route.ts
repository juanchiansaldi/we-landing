import { NextResponse } from "next/server";
import { checkPassword, createSessionToken, COOKIE_NAME, POS_COOKIE, createPosToken, verifyPosPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { POS_USER_COOKIE } from "../../../../lib/pos";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";
const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: 7 * 86_400 };

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const username = String(body?.username || "").trim().toLowerCase();
  const password = String(body?.password || "");

  // ── Login de vendedor (usuario + contraseña) ──
  if (username) {
    const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG }, select: { id: true } });
    const user = store ? await prisma.posUser.findFirst({ where: { storeId: store.id, username, activo: true } }) : null;
    if (!user || !verifyPosPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true, role: user.role, name: user.nombre });
    res.cookies.set(POS_COOKIE, createPosToken(user.id, user.role, user.nombre), opts);
    res.cookies.set(POS_USER_COOKIE, user.id, opts); // el vendedor logueado queda como "vendedor activo"
    res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  }

  // ── Login del dueño (solo contraseña de admin) ──
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, role: "OWNER" });
  res.cookies.set(COOKIE_NAME, createSessionToken(), opts);
  res.cookies.set(POS_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
