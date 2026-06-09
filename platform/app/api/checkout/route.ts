import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { mpPreference, mpReady } from "../../../lib/mp";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type CartItem = { id: string; qty: number };

export async function POST(req: Request) {
  if (!mpReady()) {
    return NextResponse.json({ error: "Mercado Pago no está configurado" }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const cart: CartItem[] = Array.isArray(body?.items) ? body.items : [];
  if (!cart.length) return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 500 });

  const ids = cart.map((c) => c.id);
  const products = await prisma.product.findMany({
    where: { storeId: store.id, id: { in: ids }, active: true },
  });
  const pmap = new Map(products.map((p) => [p.id, p]));

  const lines = cart
    .map((c) => {
      const p = pmap.get(c.id);
      if (!p) return null;
      const qty = Math.max(1, Math.min(99, Math.floor(Number(c.qty) || 1)));
      const price = p.promoPrice ?? p.price;
      return { product: p, qty, price };
    })
    .filter(Boolean) as { product: (typeof products)[number]; qty: number; price: number }[];

  if (!lines.length) return NextResponse.json({ error: "No hay items válidos" }, { status: 400 });

  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      subtotal,
      total: subtotal,
      paymentMethod: "mercadopago",
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          price: l.price,
          qty: l.qty,
        })),
      },
    },
  });

  try {
    const pref = await mpPreference.create({
      body: {
        items: lines.map((l) => ({
          id: l.product.id,
          title: l.product.name,
          quantity: l.qty,
          unit_price: l.price,
          currency_id: "ARS",
        })),
        back_urls: {
          success: `${SITE}/checkout/success`,
          failure: `${SITE}/checkout/failure`,
          pending: `${SITE}/checkout/pending`,
        },
        auto_return: "approved",
        external_reference: order.id,
        notification_url: `${SITE}/api/mp/webhook`,
        statement_descriptor: "WE CAVA",
      },
    });

    return NextResponse.json({ init_point: pref.init_point, orderId: order.id });
  } catch (e: any) {
    // si MP falla, dejamos la orden marcada como fallida
    await prisma.order
      .update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } })
      .catch(() => {});
    return NextResponse.json(
      { error: "No se pudo iniciar el pago en Mercado Pago" },
      { status: 502 }
    );
  }
}
