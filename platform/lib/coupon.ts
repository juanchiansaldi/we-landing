import { prisma } from "./prisma";

export type CouponLite = { id: string; code: string; type: "PERCENT" | "FIXED"; value: number };

/** Busca un cupón válido (activo y no vencido) para la tienda. */
export async function validateCoupon(storeId: string, codeRaw: string) {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;
  const c = await prisma.coupon.findFirst({
    where: { storeId, code, active: true },
  });
  if (!c) return null;
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return null;
  return c;
}

/** Monto de descuento (en pesos), nunca mayor al subtotal. */
export function discountFor(
  coupon: { type: "PERCENT" | "FIXED"; value: number } | null,
  subtotal: number
): number {
  if (!coupon) return 0;
  const d = coupon.type === "PERCENT" ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  return Math.max(0, Math.min(d, subtotal));
}

export function couponLabel(coupon: { code: string; type: "PERCENT" | "FIXED"; value: number }): string {
  return coupon.type === "PERCENT" ? `${coupon.code} (-${coupon.value}%)` : `${coupon.code}`;
}
