import { prisma } from "../../lib/prisma";
import { getStore } from "../../lib/pos";

export const dynamic = "force-dynamic";

export default async function PosHome() {
  const store = await getStore();
  const [prods, cats, provs, lowStock] = await Promise.all([
    prisma.product.count({ where: { storeId: store.id } }),
    prisma.category.count({ where: { storeId: store.id } }),
    prisma.supplier.count({ where: { storeId: store.id, activo: true } }),
    prisma.product.count({ where: { storeId: store.id, active: true, stock: { lte: prisma.product.fields.stockMin } } }),
  ]);

  const stat = (v: string | number, l: string, href?: string) => {
    const card = (
      <div className="dash-card">
        <span className="dash-val">{v}</span>
        <span className="dash-lbl">{l}</span>
      </div>
    );
    return href ? <a href={href} key={l} style={{ textDecoration: "none" }}>{card}</a> : <div key={l}>{card}</div>;
  };

  return (
    <div className="pos-wrap">
      <header className="pos-head">
        <div>
          <span className="eyebrow">We · Cava & Gourmet — Gestión</span>
          <h1 className="serif">Hola 👋</h1>
          <p className="pos-muted">Catálogo, inventario y reportes del local. Compartido con la tienda online.</p>
        </div>
      </header>

      <div className="dash-grid">
        {stat(prods, "Productos", "/pos/productos")}
        {stat(cats, "Categorías", "/pos/categorias")}
        {stat(provs, "Proveedores", "/pos/proveedores")}
        {stat(lowStock, "Con stock bajo")}
      </div>

      <div className="pos-cards">
        <a className="pos-card" href="/pos/productos">
          <h3 className="serif">Productos</h3>
          <p>Alta, edición, importar/exportar Excel y etiquetas.</p>
        </a>
        <a className="pos-card" href="/pos/categorias">
          <h3 className="serif">Categorías</h3>
          <p>Tintos, blancos, espumantes, destilados, accesorios…</p>
        </a>
        <a className="pos-card" href="/pos/proveedores">
          <h3 className="serif">Proveedores</h3>
          <p>Datos de contacto y CUIT de cada proveedor.</p>
        </a>
        <div className="pos-card pos-card-soon">
          <h3 className="serif">Vender · Stock · Reportes · Caja</h3>
          <p>Próximas fases. Ya está el catálogo listo para arrancar.</p>
        </div>
      </div>
    </div>
  );
}
