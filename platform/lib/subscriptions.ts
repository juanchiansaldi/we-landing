import { prisma } from "./prisma";
import { mpPreApproval } from "./mp";

function mapStatus(s: string): "ACTIVE" | "PAUSED" | "CANCELLED" | "PENDING" {
  if (s === "authorized") return "ACTIVE";
  if (s === "paused") return "PAUSED";
  if (s === "cancelled") return "CANCELLED";
  return "PENDING";
}

/** Consulta el preapproval en MP y refleja el estado en la base. */
export async function syncSubscription(subId: string) {
  const sub = await prisma.subscription.findUnique({ where: { id: subId } });
  if (!sub?.mpPreapprovalId) return;
  try {
    const pa: any = await mpPreApproval.get({ id: sub.mpPreapprovalId });
    const status = mapStatus(pa.status);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: status as any,
        ...(status === "ACTIVE" && !sub.startedAt ? { startedAt: new Date() } : {}),
        ...(status === "CANCELLED" && !sub.cancelledAt ? { cancelledAt: new Date() } : {}),
      },
    });
  } catch {
    // si MP falla, dejamos el estado como está
  }
}

/** Sincroniza las suscripciones pendientes de un cliente (al volver del checkout). */
export async function syncPendingForCustomer(customerId: string) {
  const subs = await prisma.subscription.findMany({
    where: { customerId, status: "PENDING", mpPreapprovalId: { not: null } },
  });
  await Promise.all(subs.map((s) => syncSubscription(s.id)));
}

/** Busca la suscripción por el id del preapproval (para el webhook). */
export async function syncByPreapproval(preapprovalId: string) {
  const sub = await prisma.subscription.findFirst({ where: { mpPreapprovalId: preapprovalId } });
  if (sub) await syncSubscription(sub.id);
}
