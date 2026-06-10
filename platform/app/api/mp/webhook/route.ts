import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mpPayment } from "../../../../lib/mp";
import { syncByPreapproval } from "../../../../lib/subscriptions";

const WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";

/**
 * Valida la firma x-signature de Mercado Pago (HMAC-SHA256).
 * Si MP_WEBHOOK_SECRET no está seteado, no valida (compat) — conviene setearlo.
 */
function validSignature(req: Request, dataId: string): boolean {
  if (!WEBHOOK_SECRET) return true; // sin secret configurado: no bloqueamos (todavía)
  const sig = req.headers.get("x-signature") || "";
  const requestId = req.headers.get("x-request-id") || "";
  const parts = Object.fromEntries(
    sig.split(",").map((kv) => kv.split("=").map((s) => s.trim()) as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1 || !dataId) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(v1));
  } catch {
    return false;
  }
}

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

    // defensa: validar que la notificación venga firmada por Mercado Pago
    if (!validSignature(req, String(dataId || ""))) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

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
