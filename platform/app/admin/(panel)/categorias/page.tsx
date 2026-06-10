import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosCategorias from "../../../../components/PosCategorias";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const store = await getStore();
  const cats = await prisma.category.findMany({
    where: { storeId: store.id },
    include: { _count: { select: { products: true } } },
    orderBy: { order: "asc" },
  });
  const rows = cats.map((c) => ({ id: c.id, name: c.name, order: c.order, count: c._count.products }));
  return <PosCategorias categorias={rows} />;
}
