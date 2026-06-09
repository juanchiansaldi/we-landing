"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "../lib/format";
import { saveProduct, deleteProduct, toggleActive } from "../app/admin/actions";

type Row = {
  id: string;
  name: string;
  brand: string | null;
  categoryId: string | null;
  categoryName: string;
  price: number;
  promoPrice: number | null;
  shortDesc: string | null;
  description: string | null;
  stock: number;
  isNew: boolean;
  active: boolean;
  img: string;
};

type Cat = { id: string; name: string };

const EMPTY: Row = {
  id: "",
  name: "",
  brand: "",
  categoryId: null,
  categoryName: "",
  price: 0,
  promoPrice: null,
  shortDesc: "",
  description: "",
  stock: 0,
  isNew: false,
  active: true,
  img: "",
};

export default function AdminProducts({
  storeName,
  products,
  categories,
}: {
  storeName: string;
  products: Row[];
  categories: Cat[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [pending, start] = useTransition();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await saveProduct(fd);
      setEditing(null);
      router.refresh();
    });
  }

  function onDelete(row: Row) {
    if (!confirm(`¿Borrar "${row.name}"? No se puede deshacer.`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    start(async () => {
      await deleteProduct(fd);
      router.refresh();
    });
  }

  function onToggle(row: Row) {
    const fd = new FormData();
    fd.set("id", row.id);
    fd.set("active", String(!row.active));
    start(async () => {
      await toggleActive(fd);
      router.refresh();
    });
  }

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">{storeName} · Panel</span>
          <h1 className="serif">Productos</h1>
        </div>
        <div className="admin-top-actions">
          <a className="btn btn-ghost" href="/" target="_blank">Ver tienda ↗</a>
          <button className="btn btn-ghost" type="button" onClick={logout}>Salir</button>
          <button className="btn btn-primary" type="button" onClick={() => setEditing({ ...EMPTY })}>
            + Nuevo producto
          </button>
        </div>
      </header>

      <div className="admin-stats">
        <span><b>{products.length}</b> productos</span>
        <span><b>{products.filter((p) => p.active).length}</b> activos</span>
        <span><b>{products.filter((p) => p.stock <= 0).length}</b> sin stock</span>
      </div>

      <div className="admin-table">
        <div className="admin-tr admin-th">
          <span></span>
          <span>Producto</span>
          <span>Categoría</span>
          <span>Precio</span>
          <span>Stock</span>
          <span>Activo</span>
          <span></span>
        </div>
        {products.length === 0 && <div className="admin-empty">Todavía no hay productos. Creá el primero.</div>}
        {products.map((p) => (
          <div className="admin-tr" key={p.id}>
            <span className="admin-thumb">
              {p.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.img} alt="" />
              ) : (
                <i>We</i>
              )}
            </span>
            <span className="admin-name">
              <b>{p.name}</b>
              {p.brand && <em>{p.brand}</em>}
            </span>
            <span>{p.categoryName || "—"}</span>
            <span>
              {p.promoPrice != null ? (
                <>
                  <s>{fmt(p.price)}</s> <b className="admin-sale">{fmt(p.promoPrice)}</b>
                </>
              ) : (
                fmt(p.price)
              )}
            </span>
            <span className={p.stock <= 0 ? "admin-nostock" : ""}>{p.stock}</span>
            <span>
              <button
                type="button"
                className={`admin-toggle${p.active ? " on" : ""}`}
                onClick={() => onToggle(p)}
                aria-label="Activar/desactivar"
              >
                <i />
              </button>
            </span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => setEditing(p)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => onDelete(p)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">{editing.id ? "Editar producto" : "Nuevo producto"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />

            <label>
              Nombre *
              <input name="name" defaultValue={editing.name} required autoFocus />
            </label>

            <div className="admin-grid2">
              <label>
                Bodega / marca
                <input name="brand" defaultValue={editing.brand ?? ""} />
              </label>
              <label>
                Categoría
                <select name="categoryId" defaultValue={editing.categoryId ?? ""}>
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-grid2">
              <label>
                Precio ($)
                <input name="price" type="number" min="0" defaultValue={editing.price} />
              </label>
              <label>
                Precio oferta ($) <span className="admin-opt">opcional</span>
                <input name="promoPrice" type="number" min="0" defaultValue={editing.promoPrice ?? ""} />
              </label>
            </div>

            <div className="admin-grid2">
              <label>
                Stock
                <input name="stock" type="number" min="0" defaultValue={editing.stock} />
              </label>
              <label>
                Imagen (URL o /assets/…)
                <input name="img" defaultValue={editing.img} placeholder="/assets/img/productos/..." />
              </label>
            </div>

            <label>
              Descripción corta (se ve en la card)
              <input name="shortDesc" defaultValue={editing.shortDesc ?? ""} />
            </label>

            <label>
              Descripción larga (modal de detalle)
              <textarea name="description" rows={4} defaultValue={editing.description ?? ""} />
            </label>

            <div className="admin-checks">
              <label className="admin-check">
                <input type="checkbox" name="isNew" defaultChecked={editing.isNew} /> Novedad
              </label>
              <label className="admin-check">
                <input type="checkbox" name="active" defaultChecked={editing.active} /> Activo (visible en la tienda)
              </label>
            </div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={pending}>
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
