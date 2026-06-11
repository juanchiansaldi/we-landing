import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { isAuthed } from "./auth";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

/** Cookie del vendedor activo en el POS (estampa las ventas con su posUserId). */
export const POS_USER_COOKIE = "we_pos_user";

/** Por ahora el POS se protege con el login de admin. Fase 7 = usuarios propios. */
export function posGuard() {
  if (!isAuthed()) redirect("/admin/login");
}

export async function getStore() {
  const s = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!s) throw new Error("Tienda no encontrada");
  return s;
}

/** Próximo SKU interno: WE-000123 (correlativo). */
export async function nextSku(storeId: string): Promise<string> {
  const rows = await prisma.product.findMany({
    where: { storeId, sku: { startsWith: "WE-" } },
    select: { sku: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt((r.sku || "").replace("WE-", ""), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `WE-${String(max + 1).padStart(6, "0")}`;
}

export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
