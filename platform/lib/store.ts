import { prisma } from "./prisma";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export type StoreProduct = {
  id: string;
  name: string;
  brand: string | null;
  cat: string;
  price: number;
  promo: number | null;
  img: string | null;
  notes: string | null;
  desc: string | null;
  stock: boolean;
  stockQty: number;
  nuevo: boolean;
  combo: boolean;
  meta: { k: string; v: string }[];
};

/** Trae la tienda + productos activos + categorías, listo para el storefront. */
export async function getStorefront() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return null;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id, active: true },
      include: {
        images: { orderBy: { order: "asc" }, take: 1 },
        category: true,
        // para combos: traemos los componentes y su stock para calcular disponibilidad
        kitOf: { include: { component: { select: { stock: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { order: "asc" } }),
  ]);

  // ./assets/... (rutas del sitio estático) -> /assets/... (servidas desde public/)
  const normImg = (u: string | null | undefined) =>
    u ? u.replace(/^\.\//, "/") : null;

  const mapped: StoreProduct[] = products.map((p) => {
    // combos: la disponibilidad es cuántos combos se pueden armar con el stock de los componentes
    const qty = p.isKit
      ? (p.kitOf.length
          ? Math.min(...p.kitOf.map((k) => Math.floor(k.component.stock / Math.max(1, k.qty))))
          : 0)
      : p.stock;
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      cat: p.category?.name ?? "",
      price: p.price,
      promo: p.promoPrice,
      img: normImg(p.images[0]?.url),
      notes: p.shortDesc,
      desc: p.description,
      stock: qty > 0,
      stockQty: qty,
      nuevo: p.isNew,
      combo: p.isKit,
      meta: Array.isArray(p.meta) ? (p.meta as { k: string; v: string }[]) : [],
    };
  });

  return {
    store: {
      name: store.name,
      whatsapp: store.whatsapp,
      alias: store.alias,
      titular: store.titular,
      shipNote: store.shipNote,
    },
    products: mapped,
    cats: categories.map((c) => c.name),
  };
}
