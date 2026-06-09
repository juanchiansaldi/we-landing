import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mpPayment } from "../../../../lib/mp";
import { syncByPreapproval } from "../../../../lib/subscriptions";

// Mercado Pago manda notificaciones de pago y de suscripción. Confirmamos el
// estado real consultando la API y actualizamos la orden / suscripción.
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({} as any));
    const type = body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");
    const dataId =
      body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id");
    const paymentId = dataId;

    // suscripciones (débito automático)
    if ((type === "subscription_preapproval" || type === "preapproval") && dataId) {
      await syncByPreapproval(String(dataId));
      return NextResponse.json({ ok: true });
    }

    if ((type === "payment" || type === "merchant_order") && paymentId) {
      const pay = await mpPayment.get({ id: String(paymentId) });
      const orderId = pay.external_reference;
      const status = pay.status; // approved | rejected | pending | in_process | cancelled

      if (orderId) {
        const paymentStatus =
          status === "approved" ? "PAID" : status === "rejected" || status === "cancelled" ? "FAILED" : "PENDING";
        const before = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
        await prisma.order
          .update({
            where: { id: orderId },
            data: {
              paymentStatus: paymentStatus as any,
              mpPaymentId: String(paymentId),
              ...(status === "approved" ? { status: "CONFIRMED" as any } : {}),
            },
          })
          .catch(() => {});
        // descontar stock una sola vez, al pasar a pagado
        if (status === "approved" && before?.paymentStatus !== "PAID") {
          const items = await prisma.orderItem.findMany({ where: { orderId } });
          for (const it of items) {
            if (it.productId) {
              await prisma.product
                .update({ where: { id: it.productId }, data: { stock: { decrement: it.qty } } })
                .catch(() => {});
            }
          }
          await prisma.product.updateMany({ where: { stock: { lt: 0 } }, data: { stock: 0 } }).catch(() => {});
        }
      }
    }
  } catch {
    // nunca tiramos error: MP reintenta si no devolvemos 200
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
