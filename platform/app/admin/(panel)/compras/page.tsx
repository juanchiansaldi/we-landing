import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosCompras from "../../../../components/PosCompras";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const store = await getStore();
  const [purchases, suppliers, products] = await Promise.all([
    prisma.purchase.findMany({
      where: { storeId: store.id },
      include: { supplier: { select: { nombre: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.supplier.findMany({ where: { storeId: store.id, activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.product.findMany({
      where: { storeId: store.id, isKit: false },
      select: { id: true, name: true, brand: true, quickCode: true, barcode: true, cost: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows = purchases.map((p) => ({
    id: p.id, supplier: p.supplier?.nombre || "—", invoice: p.invoiceNumber || "",
    total: p.total, items: p._count.items, at: p.createdAt.toISOString(),
  }));
  const catalog = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand || "", quickCode: p.quickCode || "", barcode: p.barcode || "", cost: p.cost ?? 0 }));

  return <PosCompras purchases={rows} suppliers={suppliers} catalog={catalog} />;
}
