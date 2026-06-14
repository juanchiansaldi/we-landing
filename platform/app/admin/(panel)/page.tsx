import { prisma } from "../../../lib/prisma";
import { getStore , adminGuard } from "../../../lib/pos";
import { fmt } from "../../../lib/format";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  adminGuard();
  const store = await getStore();

  const start14 = new Date(); start14.setDate(start14.getDate() - 13); start14.setHours(0, 0, 0, 0);
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    posToday, ordersMonth, salesMonthAvg, products, lowList,
    sales14, orders14, saleTop, orderTop, openCash,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: { storeId: store.id, voided: false, createdAt: { gte: startToday } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: startMonth } }, _sum: { total: true }, _count: true }),
    prisma.sale.aggregate({ where: { storeId: store.id, voided: false, createdAt: { gte: startMonth } }, _avg: { total: true } }),
    prisma.product.findMany({ where: { storeId: store.id, isKit: false }, select: { stock: true, cost: true } }),
    prisma.product.findMany({ where: { storeId: store.id, active: true, isKit: false, stock: { lte: prisma.product.fields.stockMin } }, select: { id: true, name: true, stock: true }, orderBy: { stock: "asc" }, take: 4 }),
    prisma.sale.findMany({ where: { storeId: store.id, voided: false, createdAt: { gte: start14 } }, select: { total: true, createdAt: true } }),
    prisma.order.findMany({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: start14 } }, select: { total: true, createdAt: true } }),
    prisma.saleItem.groupBy({ by: ["productId"], where: { productId: { not: null }, sale: { storeId: store.id, voided: false } }, _sum: { qty: true } }),
    prisma.orderItem.groupBy({ by: ["productId"], where: { productId: { not: null }, order: { storeId: store.id, paymentStatus: "PAID" } }, _sum: { qty: true } }),
    prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, select: { id: true } }),
  ]);

  // KPIs
  const ventasHoy = posToday._sum.total || 0;
  const invValue = products.reduce((s, p) => s + p.stock * (p.cost || 0), 0);
  const invUnits = products.reduce((s, p) => s + p.stock, 0);
  const ticket = Math.round(salesMonthAvg._avg.total || 0);

  // serie 14 días: local (Sale) + online (Order)
  const bucket = (rows: { total: number; createdAt: Date }[]) => {
    const m: Record<string, number> = {};
    for (const r of rows) { const k = r.createdAt.toISOString().slice(0, 10); m[k] = (m[k] || 0) + r.total; }
    return m;
  };
  const localMap = bucket(sales14), onlineMap = bucket(orders14);
  const serie: { label: string; local: number; online: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(start14); d.setDate(d.getDate() + i); const k = d.toISOString().slice(0, 10);
    serie.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, local: localMap[k] || 0, online: onlineMap[k] || 0 });
  }
  const maxV = Math.max(1, ...serie.map((d) => Math.max(d.local, d.online)));
  const X = (i: number) => (serie.length > 1 ? (i / (serie.length - 1)) * 600 : 300);
  const Y = (v: number) => 190 - (v / maxV) * 176;
  const line = (key: "local" | "online") => serie.map((d, i) => `${i ? "L" : "M"}${X(i).toFixed(1)} ${Y(d[key]).toFixed(1)}`).join(" ");
  const localArea = `${line("local")} L600 200 L0 200 Z`;
  const periodTotal = serie.reduce((s, d) => s + d.local + d.online, 0);

  // más vendidos (local + online combinados)
  const sold: Record<string, number> = {};
  for (const r of [...saleTop, ...orderTop]) { if (r.productId) sold[r.productId] = (sold[r.productId] || 0) + (r._sum.qty || 0); }
  let topIds = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id]) => id);
  if (topIds.length < 4) {
    const fill = await prisma.product.findMany({ where: { storeId: store.id, active: true, isKit: false, id: { notIn: topIds } }, select: { id: true }, orderBy: { stock: "desc" }, take: 4 - topIds.length });
    topIds = [...topIds, ...fill.map((f) => f.id)];
  }
  const topProds = await prisma.product.findMany({ where: { id: { in: topIds } }, select: { id: true, name: true } });
  const topMap = new Map(topProds.map((p) => [p.id, p.name]));
  const topList = topIds.map((id) => ({ name: topMap.get(id) || "—", qty: sold[id] || 0 })).filter((t) => t.name !== "—");

  const today = new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="pos-wrap">
      <div className="dash-top">
        <div>
          <h1 className="serif">Dashboard</h1>
          <p className="dash-date">{today}</p>
        </div>
        <a className="btn btn-primary" href="/admin/vender">+ Nueva venta</a>
      </div>

      <div className="dash-kpis">
        <div className="kpi">
          <span className="kpi-l">Ventas hoy</span>
          <b className="kpi-v">{fmt(ventasHoy)}</b>
          <span className="kpi-d muted">{posToday._count} {posToday._count === 1 ? "venta" : "ventas"} en el local</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Pedidos online · mes</span>
          <b className="kpi-v">{ordersMonth._count}</b>
          <span className="kpi-d muted">{fmt(ordersMonth._sum.total || 0)} facturado</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Ticket promedio</span>
          <b className="kpi-v">{fmt(ticket)}</b>
          <span className="kpi-d muted">promedio del mes</span>
        </div>
        <div className="kpi">
          <span className="kpi-l">Valor inventario</span>
          <b className="kpi-v">{fmt(invValue)}</b>
          <span className="kpi-d muted">{invUnits.toLocaleString("es-AR")} u. en stock</span>
        </div>
      </div>

      <div className="dash-cols">
        <div className="dash-card2">
          <div className="c-head">
            <h2 className="serif">Ventas · últimos 14 días</h2>
            <div className="dash-legend">
              <span><i style={{ background: "var(--red)" }} />Local</span>
              <span><i style={{ background: "#818CF8" }} />Online</span>
            </div>
          </div>
          <svg className="dash-chart" viewBox="0 0 600 200" preserveAspectRatio="none">
            <defs>
              <linearGradient id="dashg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F12C36" stopOpacity="0.3" />
                <stop offset="1" stopColor="#F12C36" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={localArea} fill="url(#dashg)" />
            <path d={line("local")} fill="none" stroke="#F12C36" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            <path d={line("online")} fill="none" stroke="#818CF8" strokeWidth="2" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
          </svg>
          <p style={{ textAlign: "center", color: "var(--gray)", fontSize: ".8rem", marginTop: 6 }}>Total del período: <b style={{ color: "var(--white)" }}>{fmt(periodTotal)}</b></p>
        </div>

        <div className="dash-side">
          <div className="dash-panel">
            <h3 className="serif">Más vendidos</h3>
            {topList.length === 0 ? (
              <p className="pos-muted">Todavía sin ventas.</p>
            ) : (
              topList.map((t, i) => (
                <div className="top-item" key={t.name + i}>
                  <span className="n">0{i + 1}</span>
                  <span className="t">{t.name}</span>
                  {t.qty > 0 && <span className="q">{t.qty} u.</span>}
                </div>
              ))
            )}
          </div>

          <div className="dash-panel warn">
            <h3 className="serif">⚠️ Bajo stock</h3>
            {lowList.length === 0 ? (
              <p className="pos-muted">Todo con stock 👌</p>
            ) : (
              lowList.map((p) => (
                <a className="low-item" key={p.id} href="/admin/stock" style={{ textDecoration: "none" }}>
                  <span className="t">{p.name}</span>
                  <span className={`low-pill${p.stock <= 0 ? " out" : ""}`}>{p.stock <= 0 ? "Agotado" : `${p.stock} u.`}</span>
                </a>
              ))
            )}
          </div>

          {!openCash && (
            <a className="dash-panel" href="/admin/caja" style={{ textDecoration: "none", display: "block" }}>
              <h3 className="serif" style={{ marginBottom: 4 }}>Caja cerrada</h3>
              <p className="pos-muted" style={{ margin: 0 }}>Abrí la caja para registrar las ventas del día →</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
