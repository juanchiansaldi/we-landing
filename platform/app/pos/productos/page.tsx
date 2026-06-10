import { prisma } from "../../../lib/prisma";
import { getStore } from "../../../lib/pos";
import PosProducts from "../../../components/PosProducts";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const store = await getStore();
  const [products, categories, suppliers] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id },
      include: { category: true, supplier: true },
      orderBy: { name: "asc" },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { order: "asc" } }),
    prisma.supplier.findMany({ where: { storeId: store.id, activo: true }, orderBy: { nombre: "asc" } }),
  ]);

  const rows = products.map((p) => ({
    id: p.id,
    sku: p.sku || "",
    barcode: p.barcode || "",
    name: p.name,
    brand: p.brand || "",
    categoryId: p.categoryId || "",
    categoryName: p.category?.name || "",
    supplierId: p.supplierId || "",
    supplierName: p.supplier?.nombre || "",
    price: p.price,
    priceCase: p.priceCase ?? null,
    cost: p.cost ?? null,
    unitsPerCase: p.unitsPerCase,
    stock: p.stock,
    stockMin: p.stockMin,
    varietal: p.varietal || "",
    vintage: p.vintage ?? null,
    abv: p.abv ?? null,
    volumeMl: p.volumeMl ?? 750,
    highValue: p.highValue,
    active: p.active,
    shortDesc: p.shortDesc || "",
  }));

  return (
    <PosProducts
      products={rows}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      suppliers={suppliers.map((s) => ({ id: s.id, name: s.nombre }))}
    />
  );
}
