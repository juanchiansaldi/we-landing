import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { mpPreApproval, mpReady } from "../../../lib/mp";
import { currentCustomer } from "../../../lib/customer";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  if (!mpReady()) {
    return NextResponse.json({ error: "Mercado Pago no está configurado" }, { status: 500 });
  }

  const customer = await currentCustomer();
  if (!customer) {
    return NextResponse.json({ error: "auth", message: "Iniciá sesión para suscribirte" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planSlug = String(body?.plan || "");

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 500 });

  const plan = await prisma.plan.findFirst({
    where: { storeId: store.id, slug: planSlug, active: true },
  });
  if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 404 });

  // ¿ya tiene una suscripción activa?
  const active = await prisma.subscription.findFirst({
    where: { customerId: customer.id, status: "ACTIVE" },
  });
  if (active) {
    return NextResponse.json({ error: "already", message: "Ya tenés una suscripción activa" }, { status: 409 });
  }

  const sub = await prisma.subscription.create({
    data: { storeId: store.id, customerId: customer.id, planId: plan.id, status: "PENDING" },
  });

  try {
    const pa: any = await mpPreApproval.create({
      body: {
        reason: `Club We · ${plan.name}`,
        external_reference: sub.id,
        payer_email: customer.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.price,
          currency_id: "ARS",
        },
        back_url: `${SITE}/cuenta?sub=ok`,
        status: "pending",
      },
    });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { mpPreapprovalId: pa.id },
    });
    return NextResponse.json({ init_point: pa.init_point, subId: sub.id });
  } catch (e) {
    await prisma.subscription
      .update({ where: { id: sub.id }, data: { status: "CANCELLED" } })
      .catch(() => {});
    return NextResponse.json({ error: "No se pudo iniciar la suscripción" }, { status: 502 });
  }
}
