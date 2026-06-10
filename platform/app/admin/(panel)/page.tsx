import { prisma } from "../../../lib/prisma";
import { getStore } from "../../../lib/pos";
import { fmt } from "../../../lib/format";

export const dynamic = "force-dynamic";

export default async function PanelHome() {
  const store = await getStore();
  const [prods, lowStock, paidOrders, allOrders, activeSubs, news, revenue] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.product.count({ where: { storeId: store.id, active: true, stock: { lte: prisma.product.fields.stockMin } } }),
    prisma.order.count({ where: { storeId: store.id, paymentStatus: "PAID" } }),
    prisma.order.count({ where: { storeId: store.id } }),
    prisma.subscription.count({ where: { storeId: store.id, status: "ACTIVE" } }),
    prisma.newsletter.count({ where: { storeId: store.id } }),
    prisma.order.aggregate({ where: { storeId: store.id, paymentStatus: "PAID" }, _sum: { total: true } }),
  ]);

  const stat = (v: string | number, l: string, href?: string) => {
    const card = <div className="dash-card"><span className="dash-val">{v}</span><span className="dash-lbl">{l}</span></div>;
    return href ? <a href={href} key={l} style={{ textDecoration: "none" }}>{card}</a> : <div key={l}>{card}</div>;
  };

  return (
    <div className="pos-wrap">
      <header className="pos-head">
        <span className="eyebrow">We · Cava & Gourmet — Administración</span>
        <h1 className="serif">Hola 👋</h1>
        <p className="pos-muted">Un solo lugar para el local y la tienda online. Comparten productos y stock.</p>
      </header>

      <div className="dash-grid">
        {stat(fmt(revenue._sum.total || 0), "Ventas online cobradas")}
        {stat(paidOrders, "Pedidos pagados", "/admin/pedidos")}
        {stat(allOrders, "Pedidos totales", "/admin/pedidos")}
        {stat(prods, "Productos", "/admin/productos")}
        {stat(lowStock, "Con stock bajo", "/admin/productos")}
        {stat(activeSubs, "Suscripciones activas")}
        {stat(news, "Newsletter")}
      </div>

      <div className="pos-cards">
        <a className="pos-card" href="/admin/productos"><h3 className="serif">Productos</h3><p>Catálogo, precios, costo, stock, fotos, SKU y Excel.</p></a>
        <a className="pos-card" href="/admin/categorias"><h3 className="serif">Categorías</h3><p>Tintos, blancos, espumantes, destilados, accesorios…</p></a>
        <a className="pos-card" href="/admin/proveedores"><h3 className="serif">Proveedores</h3><p>Datos y CUIT de cada proveedor.</p></a>
        <a className="pos-card" href="/admin/pedidos"><h3 className="serif">Pedidos</h3><p>Pedidos de la tienda online con dirección y estado.</p></a>
        <a className="pos-card" href="/admin/cupones"><h3 className="serif">Cupones</h3><p>Códigos de descuento para la tienda.</p></a>
        <div className="pos-card pos-card-soon"><h3 className="serif">Vender · Stock · Reportes · Caja</h3><p>Próximas fases del sistema del local.</p></div>
      </div>
    </div>
  );
}
