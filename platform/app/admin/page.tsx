import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { isAuthed } from "../../lib/auth";
import AdminProducts from "../../components/AdminProducts";

export const dynamic = "force-dynamic";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export default async function AdminPage() {
  if (!isAuthed()) redirect("/admin/login");

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) {
    return (
      <div className="admin-wrap">
        <p>No hay tienda. Corré el seed de Prisma.</p>
      </div>
    );
  }

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId: store.id },
      include: { images: { orderBy: { order: "asc" }, take: 1 }, category: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.category.findMany({ where: { storeId: store.id }, orderBy: { order: "asc" } }),
  ]);

  const rows = products.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? "",
    price: p.price,
    promoPrice: p.promoPrice,
    shortDesc: p.shortDesc,
    description: p.description,
    stock: p.stock,
    isNew: p.isNew,
    active: p.active,
    img: p.images[0]?.url ?? "",
  }));

  return (
    <AdminProducts
      storeName={store.name}
      products={rows}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
