"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posSaveUser, posDeleteUser, setActiveSeller } from "../app/pos/actions";

type Row = { id: string; username: string; nombre: string; role: string; activo: boolean; sales: number };
const EMPTY: Row = { id: "", username: "", nombre: "", role: "VENDEDOR", activo: true, sales: 0 };

export default function PosUsuarios({ users, activeId }: { users: Row[]; activeId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<Row | null>(null);

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { const res = await posSaveUser(fd); if (res?.ok === false) { alert(res.error); return; } setEdit(null); router.refresh(); });
  }
  function del(r: Row) {
    if (!confirm(`¿Borrar al usuario "${r.nombre}"?`)) return;
    const fd = new FormData(); fd.set("id", r.id);
    start(async () => { await posDeleteUser(fd); router.refresh(); });
  }
  function setActive(id: string) {
    const fd = new FormData(); fd.set("id", id);
    start(async () => { await setActiveSeller(fd); router.refresh(); });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Usuarios</h1>
          <p className="pos-muted">Vendedores del local. El vendedor activo queda registrado en cada venta.</p>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => setEdit({ ...EMPTY })}>+ Nuevo usuario</button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.3fr 1fr .8fr .7fr 1.4fr" }}>
          <span>Nombre</span><span>Usuario</span><span>Rol</span><span>Ventas</span><span></span>
        </div>
        {users.length === 0 && <div className="admin-empty">Sin usuarios. Creá el primero.</div>}
        {users.map((u) => {
          const active = u.id === activeId;
          return (
            <div className="admin-tr" key={u.id} style={{ gridTemplateColumns: "1.3fr 1fr .8fr .7fr 1.4fr", opacity: u.activo ? 1 : 0.5 }}>
              <span className="admin-name"><b>{active && <span className="vd-code" style={{ background: "#3fb950" }}>activo</span>}{u.nombre}</b>{!u.activo && <em>inactivo</em>}</span>
              <span style={{ color: "var(--gray)" }}>@{u.username}</span>
              <span>{u.role === "ADMIN" ? "Admin" : "Vendedor"}</span>
              <span>{u.sales}</span>
              <span className="admin-row-actions">
                {!active && u.activo && <button type="button" onClick={() => setActive(u.id)}>Activar</button>}
                {active && <button type="button" onClick={() => setActive("")}>Salir</button>}
                <button type="button" onClick={() => setEdit(u)}>Editar</button>
                <button type="button" className="admin-del" onClick={() => del(u)}>Borrar</button>
              </span>
            </div>
          );
        })}
      </div>

      {edit && (
        <div className="admin-modal" onClick={() => !pending && setEdit(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <h2 className="serif">{edit.id ? "Editar usuario" : "Nuevo usuario"}</h2>
            <input type="hidden" name="id" defaultValue={edit.id} />
            <label>Nombre *<input name="nombre" defaultValue={edit.nombre} required autoFocus /></label>
            <div className="admin-grid2">
              <label>Usuario *<input name="username" defaultValue={edit.username} required placeholder="juan" disabled={!!edit.id} /></label>
              <label>Rol
                <select name="role" defaultValue={edit.role}>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="ADMIN">Admin</option>
                </select></label>
            </div>
            <label>Contraseña {edit.id && <span className="admin-opt">dejá vacío para no cambiarla</span>}
              <input name="password" type="password" defaultValue="" placeholder={edit.id ? "••••••" : "obligatoria"} /></label>
            <label className="admin-check"><input type="checkbox" name="activo" defaultChecked={edit.activo} /> Activo</label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
