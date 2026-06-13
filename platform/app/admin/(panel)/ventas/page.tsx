import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosVentas from "../../../../components/PosVentas";

export const dynamic = "force-dynamic";

export default async function VentasPage() {
  const store = await getStore();
  const start = new Date(); start.setDate(start.getDate() - 30); start.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { storeId: store.id, createdAt: { gte: start } },
    include: { items: true, posUser: { select: { nombre: true } }, customer: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const rows = sales.map((s) => ({
    id: s.id,
    code: s.id.slice(-6).toUpperCase(),
    at: s.createdAt.toISOString(),
    subtotal: s.subtotal, discount: s.discount, total: s.total,
    payMethod: s.payMethod, voided: s.voided, customerId: s.customerId,
    seller: s.posUser?.nombre || "",
    customer: s.customer?.name || "",
    items: s.items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, unit: i.unit, subtotal: i.subtotal })),
  }));

  return <PosVentas sales={rows} />;
}
