import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { mpPreApproval } from "../../../../lib/mp";
import { currentCustomer } from "../../../../lib/customer";

export async function POST(req: Request) {
  const customer = await currentCustomer();
  if (!customer) return NextResponse.json({ error: "auth" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const subId = String(body?.subId || "");
  const sub = await prisma.subscription.findFirst({
    where: { id: subId, customerId: customer.id },
  });
  if (!sub) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  if (sub.mpPreapprovalId) {
    try {
      await mpPreApproval.update({ id: sub.mpPreapprovalId, body: { status: "cancelled" } });
    } catch {
      // seguimos: igual marcamos cancelada localmente
    }
  }
  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
