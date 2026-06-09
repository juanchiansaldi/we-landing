import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { validateCoupon, discountFor, couponLabel } from "../../../lib/coupon";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "");
  const subtotal = Math.max(0, Math.floor(Number(body?.subtotal) || 0));

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return NextResponse.json({ valid: false }, { status: 500 });

  const coupon = await validateCoupon(store.id, code);
  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Código inválido o vencido" }, { status: 200 });
  }

  const discount = discountFor(coupon, subtotal);
  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discount,
    label: couponLabel(coupon),
  });
}
