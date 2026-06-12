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

  const body = await req.json().catch(() => ({}));
  const cart: CartItem[] = Array.isArray(body?.items) ? body.items : [];
  if (!cart.length) return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 500 });

  // ── Comprador: logueado (Supabase) o INVITADO (datos cargados en el checkout) ──
  const logged = await currentCustomer();
  let buyer = logged;
  let shipSnapshot: {
    recipient: string | null; phone: string | null; street: string; number: string | null;
    city: string; province: string; zip: string | null; notes: string | null;
  } | null = null;

  if (buyer) {
    // logueado: usa la dirección elegida / predeterminada / primera
    const addressId = String(body?.addressId || "");
    const address =
      (addressId ? await prisma.address.findFirst({ where: { id: addressId, customerId: buyer.id } }) : null) ||
      (await prisma.address.findFirst({ where: { customerId: buyer.id, isDefault: true } })) ||
      (await prisma.address.findFirst({ where: { customerId: buyer.id }, orderBy: { createdAt: "asc" } }));
    if (!address) {
      return NextResponse.json({ error: "address", message: "Agregá una dirección de envío" }, { status: 400 });
    }
    shipSnapshot = {
      recipient: address.recipient, phone: address.phone, street: address.street, number: address.number,
      city: address.city, province: address.province, zip: address.zip, notes: address.notes,
    };
  } else {
    // invitado: validamos sus datos y creamos/reutilizamos el Customer por email
    const g = body?.guest || {};
    const email = String(g.email || "").trim().toLowerCase();
    const name = String(g.name || "").trim();
    const phone = String(g.phone || "").trim();
    const street = String(g.street || "").trim();
    const city = String(g.city || "").trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !name || !street || !city) {
      return NextResponse.json({ error: "guest", message: "Completá tus datos de envío" }, { status: 400 });
    }
    buyer = await prisma.customer.upsert({
      where: { storeId_email: { storeId: store.id, email } },
      update: { name: name || undefined, phone: phone || undefined },
      create: { storeId: store.id, email, name: name || null, phone: phone || null },
    });
    shipSnapshot = {
      recipient: name, phone, street, number: String(g.number || "").trim() || null,
      city, province: String(g.province || "").trim() || "Entre Ríos",
      zip: String(g.zip || "").trim() || null, notes: String(g.notes || "").trim() || null,
    };
    // guardamos la dirección si todavía no tiene ninguna (para su cuenta / próximas compras)
    const has = await prisma.address.count({ where: { customerId: buyer.id } });
    if (!has) {
      await prisma.address.create({
        data: {
          storeId: store.id, customerId: buyer.id,
          recipient: name, phone: shipSnapshot.phone, street: shipSnapshot.street, number: shipSnapshot.number,
          city: shipSnapshot.city, province: shipSnapshot.province, zip: shipSnapshot.zip, notes: shipSnapshot.notes,
          isDefault: true,
        },
      });
    }
  }

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

  const isTransfer = String(body?.method || "") === "transferencia";

  const order = await prisma.order.create({
    data: {
      storeId: store.id,
      customerId: buyer.id,
      subtotal,
      total,
      paymentMethod: isTransfer ? "transferencia" : "mercadopago",
      shipAddress: shipSnapshot,
      giftNote: String(body?.giftNote || "").trim().slice(0, 300) || null,
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

  // Transferencia: el pedido queda PENDIENTE; el admin sube el comprobante y lo marca pagado.
  if (isTransfer) {
    return NextResponse.json({
      transfer: true,
      orderId: order.id,
      code: order.id.slice(-6).toUpperCase(),
      alias: store.alias,
      total,
    });
  }

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
          email: buyer.email,
          name: shipSnapshot.recipient || buyer.name || undefined,
          phone: shipSnapshot.phone ? { number: shipSnapshot.phone } : undefined,
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
    await prisma.order
      .update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } })
      .catch(() => {});
    return NextResponse.json(
      { error: "No se pudo iniciar el pago en Mercado Pago" },
      { status: 502 }
    );
  }
}
