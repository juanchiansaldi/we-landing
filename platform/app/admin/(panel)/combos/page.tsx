import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosCombos from "../../../../components/PosCombos";

export const dynamic = "force-dynamic";

export default async function CombosPage() {
  const store = await getStore();
  const [combos, products] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, isKit: true },
      include: { kitOf: { include: { component: { select: { id: true, name: true } } } } },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { storeId: store.id, isKit: false },
      select: { id: true, name: true, brand: true, quickCode: true, barcode: true, cost: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const comboRows = combos.map((c) => ({
    id: c.id,
    name: c.name,
    quickCode: c.quickCode || "",
    barcode: c.barcode || "",
    margin: c.margin ?? null,
    cost: c.cost ?? 0,
    price: c.price,
    active: c.active,
    components: c.kitOf.map((k) => ({ productId: k.componentId, name: k.component.name, qty: k.qty })),
  }));

  const catalog = products.map((p) => ({ id: p.id, name: p.name, brand: p.brand || "", quickCode: p.quickCode || "", barcode: p.barcode || "", cost: p.cost ?? 0, price: p.price }));

  return <PosCombos combos={comboRows} catalog={catalog} />;
}
