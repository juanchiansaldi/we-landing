import { prisma } from "../../../lib/prisma";
import { getStore } from "../../../lib/pos";
import { fmt } from "../../../lib/format";
import ReportesChart from "../../../components/ReportesChart";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const store = await getStore();

  const start7 = new Date(); start7.setDate(start7.getDate() - 6); start7.setHours(0, 0, 0, 0);

  const [prods, lowStock, paidOrders, pendingPay, last7, todayAgg, monthAgg] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, active: true, stock: { lte: prisma.product.fields.stockMin } } }),
    prisma.order.count({ where: { storeId: store.id, paymentStatus: "PAID" } }),
    prisma.order.count({ where: { storeId: store.id, paymentStatus: { not: "PAID" } } }),
    prisma.order.findMany({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: start7 } }, select: { total: true, createdAt: true } }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } }, _sum: { total: true } }),
  ]);

  const dayMap: Record<string, number> = {};
  for (const o of last7) { const k = o.createdAt.toISOString().slice(0, 10); dayMap[k] = (dayMap[k] || 0) + o.total; }
  const serie: { label: string; value: number }[] = [];
  for (let i = 0; i < 7; i++) { const d = new Date(start7); d.setDate(d.getDate() + i); const k = d.toISOString().slice(0, 10); serie.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: dayMap[k] || 0 }); }

  return (
    <div className="pos-wrap">
      <header className="pos-head">
        <span className="eyebrow">We · Cava & Gourmet — Administración</span>
        <h1 className="serif">Hola 👋</h1>
        <p className="pos-muted">El local y la tienda online, en un solo lugar. Comparten productos y stock.</p>
      </header>

      <div className="dash-grid">
        <div className="dash-card"><span className="dash-val">{fmt(todayAgg._sum.total || 0)}</span><span className="dash-lbl">Ventas hoy</span></div>
        <div className="dash-card"><span className="dash-val">{fmt(monthAgg._sum.total || 0)}</span><span className="dash-lbl">Ventas del mes</span></div>
        <a href="/admin/pedidos?f=pendiente" style={{ textDecoration: "none" }}><div className="dash-card"><span className="dash-val" style={{ color: pendingPay ? "#f1b42c" : undefined }}>{pendingPay}</span><span className="dash-lbl">Esperando pago</span></div></a>
        <a href="/admin/pedidos" style={{ textDecoration: "none" }}><div className="dash-card"><span className="dash-val">{paidOrders}</span><span className="dash-lbl">Pedidos pagados</span></div></a>
        <a href="/admin/productos" style={{ textDecoration: "none" }}><div className="dash-card"><span className="dash-val">{prods}</span><span className="dash-lbl">Productos</span></div></a>
        <a href="/admin/productos" style={{ textDecoration: "none" }}><div className="dash-card"><span className="dash-val" style={{ color: lowStock ? "var(--red)" : undefined }}>{lowStock}</span><span className="dash-lbl">Stock bajo</span></div></a>
      </div>

      <section className="acc-section">
        <div className="acc-section-head">
          <h2 className="serif">Ventas · últimos 7 días</h2>
          <a className="btn btn-ghost" href="/admin/reportes">Ver reportes</a>
        </div>
        <ReportesChart serie={serie} />
      </section>

      <div className="pos-cards">
        <a className="pos-card" href="/admin/productos"><h3 className="serif">Productos</h3><p>Catálogo, costo, stock, fotos, SKU y Excel.</p></a>
        <a className="pos-card" href="/admin/pedidos"><h3 className="serif">Pedidos</h3><p>Pedidos online, marcar pagado y subir comprobantes.</p></a>
        <a className="pos-card" href="/admin/reportes"><h3 className="serif">Reportes</h3><p>Ventas, ganancia y valorización de stock.</p></a>
        <a className="pos-card" href="/admin/cupones"><h3 className="serif">Cupones</h3><p>Códigos de descuento.</p></a>
        <div className="pos-card pos-card-soon"><h3 className="serif">Vender · Stock · Caja</h3><p>Próximas fases del sistema del local.</p></div>
      </div>
    </div>
  );
}
