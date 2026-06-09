import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { isAuthed } from "../../../lib/auth";
import AdminOrders from "../../../components/AdminOrders";

export const dynamic = "force-dynamic";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export default async function AdminOrdersPage() {
  if (!isAuthed()) redirect("/admin/login");

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return <div className="admin-wrap">No hay tienda.</div>;

  const orders = await prisma.order.findMany({
    where: { storeId: store.id },
    include: { items: true, customer: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows = orders.map((o) => ({
    id: o.id,
    code: o.id.slice(-6).toUpperCase(),
    date: new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(o.createdAt),
    customer: o.customer ? { name: o.customer.name, email: o.customer.email } : null,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    total: o.total,
    paymentStatus: o.paymentStatus,
    paymentMethod: o.paymentMethod,
    status: o.status,
    ship: (o.shipAddress as any) || null,
  }));

  return <AdminOrders orders={rows} />;
}
