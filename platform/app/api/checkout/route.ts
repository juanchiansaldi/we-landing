import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { mpPreference, mpReady } from "../../../lib/mp";
import { currentCustomer } from "../../../lib/customer";
import { validateCoupon, discountFor, couponLabel } from "../../../lib/coupon";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

type CartItem = { id: string; qty: number };

export async function POST(req: Request) {
  if (!mpReady()) {
    return NextResponse.json({ error: "Mercado Pago no está configurado" }, { status: 500 });
  }

  // 1) tiene que estar logueado
  const customer = await currentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "auth", message: "Iniciá sesión para comprar" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const cart: CartItem[] = Array.isArray(body?.items) ? body.items : [];
  if (!cart.length) return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });

  // 2) tiene que tener una dirección de envío (la elegida o la predeterminada)
  const addressId = String(body?.addressId || "");
  const address =
    (addressId
      ? await prisma.address.findFirst({ where: { id: addressId, customerId: customer.id } })
      : null) ||
    (await prisma.address.findFirst({ where: { customerId: customer.id, isDefault: true } })) ||
    (await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "asc" } }));
  if (!address) {
    return NextResponse.json({ error: "address", message: "Agregá una dirección de envío" }, { status: 400 });
  }

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

  // cupón (revalidado en el server)
  const couponCode = String(body?.coupon || "");
  const coupon = couponCode ? await validateCoupon(store.id, couponCode) : null;
  const discount = discountFor(coupon, subtotal);
  const total = subtotal - discount;

  const shipSnapshot = {
    recipient: address.recipient,
    phone: address.phone,
    street: address.street,
    number: address.number,
    city: address.city,
    province: address.province,
    zip: address.zip,
    notes: address.notes,
  };

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      customerId: customer.id,
      subtotal,
      total,
      paymentMethod: "mercadopago",
      shipAddress: shipSnapshot,
      notes: coupon ? `Cupón ${couponLabel(coupon)} (-$${discount})` : null,
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

  // si hay descuento, mandamos a MP un único ítem por el total (MP no acepta importes negativos)
  const mpItems =
    discount > 0
      ? [{ id: order.id, title: `Pedido We (cupón ${coupon!.code})`, quantity: 1, unit_price: total, currency_id: "ARS" }]
      : lines.map((l) => ({
          id: l.product.id,
          title: l.product.name,
          quantity: l.qty,
          unit_price: l.price,
          currency_id: "ARS",
        }));

  try {
    const pref = await mpPreference.create({
      body: {
        items: mpItems,
        payer: {
          email: customer.email,
          name: address.recipient || customer.name || undefined,
          phone: address.phone ? { number: address.phone } : undefined,
        },
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
