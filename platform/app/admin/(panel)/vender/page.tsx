import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import Vender from "../../../../components/Vender";

export const dynamic = "force-dynamic";

export default async function VenderPage() {
  const store = await getStore();
  const products = await prisma.product.findMany({
    where: { storeId: store.id, active: true },
    select: {
      id: true, name: true, sku: true, barcode: true, brand: true,
      price: true, promoPrice: true, priceCase: true, unitsPerCase: true, stock: true,
    },
    orderBy: { name: "asc" },
  });

  const catalog = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku || "", barcode: p.barcode || "", brand: p.brand || "",
    price: p.price, promo: p.promoPrice ?? null, priceCase: p.priceCase ?? null,
    unitsPerCase: p.unitsPerCase, stock: p.stock,
  }));

  return <Vender catalog={catalog} store={{ name: store.name }} />;
}
