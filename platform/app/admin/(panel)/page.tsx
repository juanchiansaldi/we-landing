import { prisma } from "../../../lib/prisma";
import { getStore } from "../../../lib/pos";
import { fmt } from "../../../lib/format";
import ReportesChart from "../../../components/ReportesChart";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const store = await getStore();

  const start7 = new Date(); start7.setDate(start7.getDate() - 6); start7.setHours(0, 0, 0, 0);
  const startToday = new Date(new Date().setHours(0, 0, 0, 0));
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [
    prods, lowStock, lowList, pendingPay, last7,
    posToday, onlineMonth, openCash, fiado,
  ] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id, isKit: false } }),
    prisma.product.count({ where: { storeId: store.id, active: true, isKit: false, stock: { lte: prisma.product.fields.stockMin } } }),
    prisma.product.findMany({ where: { storeId: store.id, active: true, isKit: false, stock: { lte: prisma.product.fields.stockMin } }, select: { id: true, name: true, stock: true, stockMin: true }, orderBy: { stock: "asc" }, take: 5 }),
    prisma.order.count({ where: { storeId: store.id, paymentStatus: { not: "PAID" } } }),
    prisma.sale.findMany({ where: { storeId: store.id, voided: false, createdAt: { gte: start7 } }, select: { total: true, createdAt: true } }),
    prisma.sale.aggregate({ where: { storeId: store.id, voided: false, createdAt: { gte: startToday } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID", createdAt: { gte: startMonth } }, _sum: { total: true } }),
    prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, orderBy: { openedAt: "desc" }, select: { id: true, openingAmount: true } }),
    prisma.customer.aggregate({ where: { storeId: store.id, ccBalance: { gt: 0 } }, _sum: { ccBalance: true }, _count: true }),
  ]);

  // efectivo esperado en caja (si está abierta)
  let cashExpected = 0;
  if (openCash) {
    const s = await prisma.sale.aggregate({ where: { cashSessionId: openCash.id, voided: false }, _sum: { payCash: true } });
    cashExpected = openCash.openingAmount + (s._sum.payCash || 0);
  }

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
        <div className="dash-card"><span className="dash-val">{fmt(posToday._sum.total || 0)}</span><span className="dash-lbl">Caja de hoy ({posToday._count} ventas)</span></div>
        <a href="/admin/caja" style={{ textDecoration: "none" }}><div className="dash-card">
          <span className="dash-val" style={{ color: openCash ? "#3fb950" : "var(--red)", fontSize: "1.4rem" }}>{openCash ? "Abierta" : "Cerrada"}</span>
          <span className="dash-lbl">{openCash ? `Caja · esperado ${fmt(cashExpected)}` : "Caja · sin abrir"}</span>
        </div></a>
        <a href="/admin/clientes" style={{ textDecoration: "none" }}><div className="dash-card">
          <span className="dash-val" style={{ color: (fiado._sum.ccBalance || 0) ? "var(--red)" : undefined }}>{fmt(fiado._sum.ccBalance || 0)}</span>
          <span className="dash-lbl">Fiado · te deben ({fiado._count})</span>
        </div></a>
        <a href="/admin/stock" style={{ textDecoration: "none" }}><div className="dash-card">
          <span className="dash-val" style={{ color: lowStock ? "var(--red)" : undefined }}>{lowStock}</span><span className="dash-lbl">Productos en bajo stock</span>
        </div></a>
        <a href="/admin/pedidos?f=pendiente" style={{ textDecoration: "none" }}><div className="dash-card"><span className="dash-val" style={{ color: pendingPay ? "#f1b42c" : undefined }}>{pendingPay}</span><span className="dash-lbl">Pedidos esperando pago</span></div></a>
        <div className="dash-card"><span className="dash-val">{fmt(onlineMonth._sum.total || 0)}</span><span className="dash-lbl">Tienda online · mes</span></div>
      </div>

      {lowList.length > 0 && (
        <section className="acc-section">
          <div className="acc-section-head">
            <h2 className="serif">⚠️ Reponer pronto</h2>
            <a className="btn btn-ghost" href="/admin/compras">Cargar compra</a>
          </div>
          <div className="dash-low">
            {lowList.map((p) => (
              <a key={p.id} href="/admin/stock" className="dash-low-row">
                <span>{p.name}</span>
                <span><b className="stk-low">{p.stock}</b> <em className="pos-muted">/ mín {p.stockMin}</em></span>
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="acc-section">
        <div className="acc-section-head">
          <h2 className="serif">Ventas del local · últimos 7 días</h2>
          <a className="btn btn-ghost" href="/admin/reportes">Ver reportes</a>
        </div>
        <ReportesChart serie={serie} />
      </section>

      <div className="pos-cards">
        <a className="pos-card" href="/admin/vender"><h3 className="serif">Vender 🧾</h3><p>Caja del local: lector de código, carrito y ticket.</p></a>
        <a className="pos-card" href="/admin/caja"><h3 className="serif">Caja</h3><p>Abrir, cerrar y arquear el efectivo del día.</p></a>
        <a className="pos-card" href="/admin/stock"><h3 className="serif">Stock</h3><p>Conteo, mermas y ajustes con historial.</p></a>
        <a className="pos-card" href="/admin/compras"><h3 className="serif">Compras</h3><p>Cargar mercadería que entra y actualizar costos.</p></a>
        <a className="pos-card" href="/admin/clientes"><h3 className="serif">Clientes</h3><p>Cuenta corriente: fiado y pagos.</p></a>
        <a className="pos-card" href="/admin/reportes"><h3 className="serif">Reportes</h3><p>Ventas, ganancia y valorización de stock.</p></a>
      </div>
    </div>
  );
}
