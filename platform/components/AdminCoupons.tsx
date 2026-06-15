"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCoupon, deleteCoupon } from "../app/admin/actions";

type Row = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  expiresAt: string;
};

const EMPTY: Row = { id: "", code: "", type: "PERCENT", value: 10, active: true, expiresAt: "" };

export default function AdminCoupons({ coupons }: { coupons: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [pending, start] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await saveCoupon(fd);
      setEditing(null);
      router.refresh();
    });
  }

  function onDelete(row: Row) {
    if (!confirm(`¿Borrar el cupón ${row.code}?`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    start(async () => {
      await deleteCoupon(fd);
      router.refresh();
    });
  }

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">Administración</span>
          <h1 className="serif">Cupones</h1>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => setEditing({ ...EMPTY })}>
            + Nuevo cupón
          </button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.2fr 1fr 1fr .8fr 1fr" }}>
          <span>Código</span>
          <span>Descuento</span>
          <span>Vence</span>
          <span>Activo</span>
          <span></span>
        </div>
        {coupons.length === 0 && <div className="admin-empty">Todavía no hay cupones. Creá el primero.</div>}
        {coupons.map((c) => (
          <div className="admin-tr" key={c.id} style={{ gridTemplateColumns: "1.2fr 1fr 1fr .8fr 1fr" }}>
            <span className="admin-name"><b style={{ fontFamily: "var(--font-spectral)" }}>{c.code}</b></span>
            <span data-label="Descuento">{c.type === "PERCENT" ? `${c.value}%` : `$ ${c.value.toLocaleString("es-AR")}`}</span>
            <span data-label="Vence">{c.expiresAt || "—"}</span>
            <span data-label="Activo" style={{ color: c.active ? "#3fb950" : "var(--gray)" }}>{c.active ? "Sí" : "No"}</span>
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
            <h2 className="serif">{editing.id ? "Editar cupón" : "Nuevo cupón"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />
            <label>Código
              <input name="code" defaultValue={editing.code} placeholder="VERANO10" required style={{ textTransform: "uppercase" }} />
            </label>
            <div className="admin-grid2">
              <label>Tipo
                <select name="type" defaultValue={editing.type}>
                  <option value="PERCENT">Porcentaje (%)</option>
                  <option value="FIXED">Monto fijo ($)</option>
                </select>
              </label>
              <label>Valor
                <input name="value" type="number" min="0" defaultValue={editing.value} />
              </label>
            </div>
            <label>Vence (opcional)
              <input name="expiresAt" type="date" defaultValue={editing.expiresAt} />
            </label>
            <label className="admin-check">
              <input type="checkbox" name="active" defaultChecked={editing.active} /> Activo
            </label>
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
