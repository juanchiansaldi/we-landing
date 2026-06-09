import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { isAuthed } from "../../../lib/auth";
import { fmt } from "../../../lib/format";

export const dynamic = "force-dynamic";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export default async function DashboardPage() {
  if (!isAuthed()) redirect("/admin/login");
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return <div className="admin-wrap">No hay tienda.</div>;

  const [paidOrders, allOrders, activeSubs, news, lowStock, paidAgg] = await Promise.all([
    prisma.order.count({ where: { storeId: store.id, paymentStatus: "PAID" } }),
    prisma.order.count({ where: { storeId: store.id } }),
    prisma.subscription.count({ where: { storeId: store.id, status: "ACTIVE" } }),
    prisma.newsletter.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, active: true, stock: { gt: 0, lte: 5 } } }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID" }, _sum: { total: true } }),
  ]);

  // top productos por cantidad vendida (de órdenes pagadas)
  const paidItems = await prisma.orderItem.findMany({
    where: { order: { storeId: store.id, paymentStatus: "PAID" } },
    select: { name: true, qty: true },
  });
  const topMap: Record<string, number> = {};
  for (const i of paidItems) topMap[i.name] = (topMap[i.name] || 0) + i.qty;
  const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const revenue = paidAgg._sum.total || 0;

  const stat = (label: string, value: string) => (
    <div className="dash-card">
      <span className="dash-val">{value}</span>
      <span className="dash-lbl">{label}</span>
    </div>
  );

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">We · Cava — Panel</span>
          <h1 className="serif">Resumen</h1>
        </div>
        <div className="admin-top-actions">
          <a className="btn btn-ghost" href="/admin">Productos</a>
          <a className="btn btn-ghost" href="/admin/orders">Pedidos</a>
          <a className="btn btn-ghost" href="/admin/coupons">Cupones</a>
        </div>
      </header>

      <div className="dash-grid">
        {stat("Ventas cobradas", fmt(revenue))}
        {stat("Pedidos pagados", String(paidOrders))}
        {stat("Pedidos totales", String(allOrders))}
        {stat("Suscripciones activas", String(activeSubs))}
        {stat("Suscriptos al newsletter", String(news))}
        {stat("Productos con stock bajo", String(lowStock))}
      </div>

      <section className="acc-section">
        <div className="acc-section-head"><h2 className="serif">Más vendidos</h2></div>
        {top.length === 0 ? (
          <p className="admin-muted">Todavía no hay ventas pagadas.</p>
        ) : (
          <div className="orders-list">
            {top.map(([name, qty]) => (
              <div className="order-row" key={name}>
                <div className="order-meta"><b>{name}</b></div>
                <div className="order-items-mini" />
                <div className="order-right"><b>{qty} u.</b></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
