import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosStock from "../../../../components/PosStock";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const store = await getStore();
  const [products, moves] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, isKit: false },
      select: { id: true, name: true, sku: true, quickCode: true, stock: true, stockMin: true, cost: true, unitsPerCase: true, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { storeId: store.id },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  const rows = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku || "", quickCode: p.quickCode || "",
    stock: p.stock, stockMin: p.stockMin, cost: p.cost ?? 0, unitsPerCase: p.unitsPerCase, active: p.active,
  }));

  const movements = moves.map((m) => ({
    id: m.id, name: m.product?.name || "—", type: m.type, qty: m.qty, reason: m.reason,
    resultingStock: m.resultingStock, at: m.createdAt.toISOString(),
  }));

  return <PosStock products={rows} movements={movements} />;
}
