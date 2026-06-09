"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "../app/cuenta/actions";

export default function ProfileEditor({
  name,
  phone,
}: {
  name: string;
  phone: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await updateProfile(fd);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button className="btn btn-ghost" type="button" onClick={() => setOpen(true)}>
        Editar datos
      </button>
      {open && (
        <div className="admin-modal" onClick={() => !pending && setOpen(false)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">Mis datos</h2>
            <label>Nombre
              <input name="name" defaultValue={name} placeholder="Tu nombre" />
            </label>
            <label>Teléfono
              <input name="phone" defaultValue={phone} placeholder="+54 9 ..." />
            </label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
