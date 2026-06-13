import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma";
import { getStore, POS_USER_COOKIE, comboStock } from "../../../../lib/pos";
import Vender from "../../../../components/Vender";

export const dynamic = "force-dynamic";

export default async function VenderPage() {
  const store = await getStore();
  const [products, customers, openCash] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, active: true },
      select: {
        id: true, name: true, sku: true, quickCode: true, barcode: true, brand: true,
        price: true, promoPrice: true, priceCase: true, unitsPerCase: true, stock: true, isKit: true,
        kitOf: { select: { qty: true, component: { select: { stock: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { storeId: store.id },
      select: { id: true, name: true, email: true, ccBalance: true },
      orderBy: [{ name: "asc" }],
    }),
    prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, select: { id: true } }),
  ]);

  const activeId = cookies().get(POS_USER_COOKIE)?.value || "";
  const seller = activeId ? await prisma.posUser.findUnique({ where: { id: activeId }, select: { nombre: true } }) : null;

  const catalog = products.map((p) => ({
    id: p.id, name: p.name, sku: p.sku || "", quickCode: p.quickCode || "", barcode: p.barcode || "", brand: p.brand || "",
    price: p.price, promo: p.promoPrice ?? null, priceCase: p.priceCase ?? null,
    unitsPerCase: p.unitsPerCase,
    // combos: el stock disponible sale de los componentes
    stock: p.isKit ? comboStock(p.kitOf) : p.stock,
  }));
  const clients = customers.map((c) => ({ id: c.id, name: c.name || (c.email.includes("@local.we") ? "Cliente" : c.email), ccBalance: c.ccBalance }));

  return <Vender catalog={catalog} clients={clients} store={{ name: store.name }} sellerName={seller?.nombre || null} cashOpen={!!openCash} />;
}
