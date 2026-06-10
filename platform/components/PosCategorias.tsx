"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posSaveCategory, posDeleteCategory } from "../app/pos/actions";

type Row = { id: string; name: string; order: number; count: number };
const EMPTY: Row = { id: "", name: "", order: 0, count: 0 };

export default function PosCategorias({ categorias }: { categorias: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [pending, start] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { await posSaveCategory(fd); setEditing(null); router.refresh(); });
  }
  function onDelete(r: Row) {
    if (r.count > 0) { alert("No se puede borrar: tiene productos. Movelos de categoría primero."); return; }
    if (!confirm(`¿Borrar la categoría "${r.name}"?`)) return;
    const fd = new FormData(); fd.set("id", r.id);
    start(async () => { await posDeleteCategory(fd); router.refresh(); });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Categorías</h1></div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => setEditing({ ...EMPTY })}>+ Nueva</button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "2fr .6fr .8fr 1fr" }}>
          <span>Nombre</span><span>Orden</span><span>Productos</span><span></span>
        </div>
        {categorias.length === 0 && <div className="admin-empty">Sin categorías.</div>}
        {categorias.map((c) => (
          <div className="admin-tr" key={c.id} style={{ gridTemplateColumns: "2fr .6fr .8fr 1fr" }}>
            <span><b style={{ fontFamily: "var(--font-spectral)" }}>{c.name}</b></span>
            <span>{c.order}</span>
            <span>{c.count}</span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => setEditing(c)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => onDelete(c)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">{editing.id ? "Editar categoría" : "Nueva categoría"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />
            <label>Nombre *<input name="name" defaultValue={editing.name} required autoFocus /></label>
            <label>Orden<input name="order" type="number" defaultValue={editing.order} /></label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
