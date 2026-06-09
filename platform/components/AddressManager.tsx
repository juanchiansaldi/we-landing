"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveAddress, deleteAddress, setDefaultAddress } from "../app/cuenta/actions";

export type Addr = {
  id: string;
  label: string | null;
  recipient: string;
  phone: string | null;
  street: string;
  number: string | null;
  city: string;
  province: string;
  zip: string | null;
  notes: string | null;
  isDefault: boolean;
};

const EMPTY: Addr = {
  id: "", label: "", recipient: "", phone: "", street: "", number: "",
  city: "", province: "Entre Ríos", zip: "", notes: "", isDefault: false,
};

export default function AddressManager({
  addresses,
  openNew = false,
}: {
  addresses: Addr[];
  openNew?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Addr | null>(openNew && addresses.length === 0 ? { ...EMPTY } : null);
  const [pending, start] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await saveAddress(fd);
      setEditing(null);
      router.refresh();
    });
  }

  function act(action: (fd: FormData) => Promise<void>, id: string) {
    const fd = new FormData();
    fd.set("id", id);
    start(async () => {
      await action(fd);
      router.refresh();
    });
  }

  return (
    <section className="acc-section">
      <div className="acc-section-head">
        <h2 className="serif">Mis direcciones</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setEditing({ ...EMPTY })}>
          + Agregar
        </button>
      </div>

      {addresses.length === 0 && !editing && (
        <p className="admin-muted">Todavía no cargaste una dirección de envío.</p>
      )}

      <div className="addr-grid">
        {addresses.map((a) => (
          <div className={`addr-card${a.isDefault ? " is-default" : ""}`} key={a.id}>
            {a.isDefault && <span className="addr-default">Predeterminada</span>}
            <b>{a.label || a.recipient}</b>
            <span>{a.street} {a.number}</span>
            <span>{a.city}, {a.province}{a.zip ? ` (${a.zip})` : ""}</span>
            {a.phone && <span className="admin-muted">Tel: {a.phone}</span>}
            {a.notes && <span className="admin-muted">{a.notes}</span>}
            <div className="addr-actions">
              {!a.isDefault && (
                <button type="button" onClick={() => act(setDefaultAddress, a.id)} disabled={pending}>
                  Predeterminar
                </button>
              )}
              <button type="button" onClick={() => setEditing(a)} disabled={pending}>Editar</button>
              <button type="button" className="admin-del" onClick={() => act(deleteAddress, a.id)} disabled={pending}>
                Borrar
              </button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">{editing.id ? "Editar dirección" : "Nueva dirección"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />
            <div className="admin-grid2">
              <label>Etiqueta <input name="label" defaultValue={editing.label ?? ""} placeholder="Casa, Trabajo…" /></label>
              <label>Quién recibe <input name="recipient" defaultValue={editing.recipient} placeholder="Nombre y apellido" /></label>
            </div>
            <div className="admin-grid2">
              <label>Calle <input name="street" defaultValue={editing.street} required /></label>
              <label>Número <input name="number" defaultValue={editing.number ?? ""} /></label>
            </div>
            <div className="admin-grid2">
              <label>Ciudad <input name="city" defaultValue={editing.city} required /></label>
              <label>Provincia <input name="province" defaultValue={editing.province} /></label>
            </div>
            <div className="admin-grid2">
              <label>Código postal <input name="zip" defaultValue={editing.zip ?? ""} /></label>
              <label>Teléfono <input name="phone" defaultValue={editing.phone ?? ""} /></label>
            </div>
            <label>Referencia / entre calles / depto
              <input name="notes" defaultValue={editing.notes ?? ""} />
            </label>
            <label className="admin-check">
              <input type="checkbox" name="isDefault" defaultChecked={editing.isDefault} /> Usar como predeterminada
            </label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
