import { NextResponse } from "next/server";
import { COOKIE_NAME, POS_COOKIE } from "../../../../lib/auth";
import { POS_USER_COOKIE } from "../../../../lib/pos";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clear = { httpOnly: true, path: "/", maxAge: 0 };
  res.cookies.set(COOKIE_NAME, "", clear);
  res.cookies.set(POS_COOKIE, "", clear);
  res.cookies.set(POS_USER_COOKIE, "", clear);
  return res;
}
