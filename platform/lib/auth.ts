import crypto from "crypto";
import { cookies } from "next/headers";

export const COOKIE_NAME = "we_admin";

// fail-closed: nunca firmamos con un secreto público por defecto.
// En dev permite un fallback explícito; en prod exige ADMIN_SECRET.
function getSecret(): string {
  const s = process.env.ADMIN_SECRET || "";
  if (s) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_SECRET es obligatorio en producción");
  }
  return "we-cava-dev-only-secret";
}

function sign(payload: string): string {
  const SECRET = getSecret();
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

// ───────── Sesión de vendedor (PosUser) ─────────
export const POS_COOKIE = "we_pos";

/** Verifica la contraseña de un PosUser (hash scrypt salt:hash). */
export function verifyPosPassword(pw: string, stored: string): boolean {
  const [salt, hash] = (stored || "").split(":");
  if (!salt || !hash) return false;
  const h = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(h);
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Token firmado de sesión de vendedor: exp|posUserId|role|nombre(base64url). */
export function createPosToken(posUserId: string, role: string, name: string, days = 7): string {
  const exp = Date.now() + days * 86_400_000;
  return sign(`${exp}|${posUserId}|${role}|${Buffer.from(name).toString("base64url")}`);
}

function verifyPosToken(token: string | undefined | null): { posUserId: string; role: string; name: string } | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const a = Buffer.from(token);
  const b = Buffer.from(sign(payload));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const [expS, posUserId, role, nameB64] = payload.split("|");
  const exp = parseInt(expS, 10);
  if (!(Number.isFinite(exp) && exp > Date.now()) || !posUserId) return null;
  return { posUserId, role: role || "VENDEDOR", name: Buffer.from(nameB64 || "", "base64url").toString() };
}

export function posSession() {
  return verifyPosToken(cookies().get(POS_COOKIE)?.value);
}

/** ¿Hay sesión válida en el panel? Dueño (we_admin) o vendedor (we_pos). */
export function isAuthed(): boolean {
  return verify(cookies().get(COOKIE_NAME)?.value) || !!posSession();
}

export type Role = "OWNER" | "ADMIN" | "VENDEDOR";

/** Sesión actual con su rol. OWNER = dueño (contraseña admin); ADMIN/VENDEDOR = PosUser. */
export function currentSession(): { role: Role; name: string; posUserId: string | null } | null {
  if (verify(cookies().get(COOKIE_NAME)?.value)) return { role: "OWNER", name: "Dueño", posUserId: null };
  const p = posSession();
  if (p) return { role: p.role === "ADMIN" ? "ADMIN" : "VENDEDOR", name: p.name, posUserId: p.posUserId };
  return null;
}

/** true si la sesión actual tiene acceso total (dueño o admin). */
export function isFullAccess(): boolean {
  const s = currentSession();
  return s?.role === "OWNER" || s?.role === "ADMIN";
}
