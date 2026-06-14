import { prisma } from "../../../../lib/prisma";
import { getStore , adminGuard } from "../../../../lib/pos";
import { fmt } from "../../../../lib/format";
import ReportesChart from "../../../../components/ReportesChart";

export const dynamic = "force-dynamic";

type Period = "hoy" | "7d" | "30d" | "mes";

function rangeFor(period: Period): { start: Date; days: number } {
  const now = new Date();
  if (period === "hoy") {
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    return { start, days: 1 };
  }
  if (period === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, days: now.getDate() };
  }
  const days = period === "7d" ? 7 : 30;
  const start = new Date(now); start.setDate(start.getDate() - (days - 1)); start.setHours(0, 0, 0, 0);
  return { start, days };
}

export default async function ReportesPage({ searchParams }: { searchParams: { period?: string } }) {
  adminGuard();
  const period = (["hoy", "7d", "30d", "mes"].includes(searchParams.period || "") ? searchParams.period : "30d") as Period;
  const store = await getStore();
  const { start, days } = rangeFor(period);

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: start } },
      include: { items: { include: { product: { select: { cost: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.product.findMany({ where: { storeId: store.id, active: true }, select: { stock: true, cost: true, price: true } }),
  ]);

  // totales
  let ventas = 0, costo = 0;
  const topMap: Record<string, number> = {};
  const dayMap: Record<string, number> = {};
  for (const o of orders) {
    ventas += o.total;
    const dk = o.createdAt.toISOString().slice(0, 10);
    dayMap[dk] = (dayMap[dk] || 0) + o.total;
    for (const it of o.items) {
      topMap[it.name] = (topMap[it.name] || 0) + it.qty;
      costo += (it.product?.cost || 0) * it.qty;
    }
  }
  const ganancia = ventas - costo;
  const ticket = orders.length ? Math.round(ventas / orders.length) : 0;
  const stockValorCosto = products.reduce((s, p) => s + (p.cost || 0) * p.stock, 0);
  const stockValorVenta = products.reduce((s, p) => s + p.price * p.stock, 0);

  // serie diaria para el gráfico
  const serie: { label: string; value: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start); d.setDate(d.getDate() + i);
    const dk = d.toISOString().slice(0, 10);
    serie.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, value: dayMap[dk] || 0 });
  }

  const top = Object.entries(topMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const PERIODS: [Period, string][] = [["hoy", "Hoy"], ["7d", "7 días"], ["30d", "30 días"], ["mes", "Este mes"]];

  return (
    <div className="pos-wrap">
      <header className="pos-head">
        <span className="eyebrow">Administración</span>
        <h1 className="serif">Reportes</h1>
        <p className="pos-muted">Ventas, ganancia estimada y valorización de stock.</p>
      </header>

      <div className="ord-filter" style={{ marginBottom: 18 }}>
        {PERIODS.map(([p, l]) => (
          <a key={p} href={`/admin/reportes?period=${p}`} className={period === p ? "on" : ""}>{l}</a>
        ))}
        <a href="/api/admin/reportes/export" className="rep-export">Exportar Excel ↓</a>
      </div>

      <div className="dash-grid">
        <div className="dash-card"><span className="dash-val">{fmt(ventas)}</span><span className="dash-lbl">Ventas (cobradas)</span></div>
        <div className="dash-card"><span className="dash-val" style={{ color: ganancia >= 0 ? "#3fb950" : "var(--red)" }}>{fmt(ganancia)}</span><span className="dash-lbl">Ganancia estimada</span></div>
        <div className="dash-card"><span className="dash-val">{orders.length}</span><span className="dash-lbl">Pedidos pagados</span></div>
        <div className="dash-card"><span className="dash-val">{fmt(ticket)}</span><span className="dash-lbl">Ticket promedio</span></div>
        <div className="dash-card"><span className="dash-val">{fmt(stockValorCosto)}</span><span className="dash-lbl">Stock valorizado (costo)</span></div>
        <div className="dash-card"><span className="dash-val">{fmt(stockValorVenta)}</span><span className="dash-lbl">Stock valorizado (venta)</span></div>
      </div>

      <section className="acc-section">
        <div className="acc-section-head"><h2 className="serif">Ventas por día</h2></div>
        <ReportesChart serie={serie} />
      </section>

      <section className="acc-section">
        <div className="acc-section-head"><h2 className="serif">Más vendidos del período</h2></div>
        {top.length === 0 ? (
          <p className="admin-muted">Sin ventas en este período.</p>
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

      <p className="pos-muted" style={{ marginTop: 24 }}>
        La ganancia es estimada (ventas − costo actual de cada producto). Los <b>gastos/compras</b> se suman cuando armemos el módulo de Compras (Fase 5). Por ahora solo cuenta las ventas online pagadas; las ventas del mostrador entran con el POS (Fase 2).
      </p>
    </div>
  );
}
