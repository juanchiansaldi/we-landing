import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "we_admin";
const SECRET = process.env.ADMIN_SECRET || "we-cava-dev-secret-change-me";

function sign(payload: string): string {
  const h = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${payload}.${h}`;
}

function verify(token: string | undefined | null): boolean {
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const payload = token.slice(0, i);
  const expected = sign(payload);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const exp = parseInt(payload, 10);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Token de sesión firmado, expira en `days` días. */
export function createSessionToken(days = 7): string {
  return sign(String(Date.now() + days * 86_400_000));
}

/** Compara la contraseña ingresada con ADMIN_PASSWORD (tiempo constante). */
export function checkPassword(pw: string): boolean {
  const real = process.env.ADMIN_PASSWORD || "";
  if (!real) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(real);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** ¿Hay sesión de admin válida en la cookie? */
export function isAuthed(): boolean {
  return verify(cookies().get(COOKIE_NAME)?.value);
}
