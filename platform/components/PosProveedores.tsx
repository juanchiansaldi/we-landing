"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posSaveSupplier, posDeleteSupplier } from "../app/pos/actions";

type Row = {
  id: string; nombre: string; cuit: string; contacto: string; telefono: string;
  email: string; notas: string; direccion: string; mapsUrl: string;
  lat: number | null; lng: number | null; activo: boolean; count: number;
};
const EMPTY: Row = {
  id: "", nombre: "", cuit: "", contacto: "", telefono: "", email: "", notas: "",
  direccion: "", mapsUrl: "", lat: null, lng: null, activo: true, count: 0,
};

// Extrae nombre + coordenadas de un link de Google Maps pegado.
function parseMaps(url: string): { name?: string; lat?: number; lng?: number } {
  const out: { name?: string; lat?: number; lng?: number } = {};
  // coordenadas del pin real: !3d<lat>!4d<lng>  · si no, el centro del mapa: @lat,lng
  let m = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (!m) m = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) { out.lat = parseFloat(m[1]); out.lng = parseFloat(m[2]); }
  // nombre del lugar: /place/<Nombre>/
  const pm = url.match(/\/place\/([^/@]+)/);
  if (pm) {
    try { out.name = decodeURIComponent(pm[1].replace(/\+/g, " ")).trim(); }
    catch { out.name = pm[1].replace(/\+/g, " ").trim(); }
  }
  return out;
}

// solo permitimos http(s) en el href (evita javascript:/data: si pegan algo raro)
const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : "");
const mapsLink = (r: { mapsUrl: string; lat: number | null; lng: number | null }) =>
  r.lat != null && r.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${r.lat},${r.lng}`
    : safeUrl(r.mapsUrl || "");

export default function PosProveedores({ proveedores }: { proveedores: Row[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [pending, start] = useTransition();
  // campos con autocompletado desde Maps
  const [nombre, setNombre] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapInfo, setMapInfo] = useState("");

  function open(r: Row) {
    setEditing(r);
    setNombre(r.nombre); setMapsUrl(r.mapsUrl); setLat(r.lat); setLng(r.lng); setMapInfo("");
  }

  function onMaps(url: string) {
    setMapsUrl(url);
    const p = parseMaps(url);
    if (p.lat != null && p.lng != null) { setLat(p.lat); setLng(p.lng); }
    if (p.name && !nombre.trim()) setNombre(p.name);
    if (p.name || p.lat != null) setMapInfo(`📍 ${p.name || "Ubicación"} detectada — el resto cargalo a mano`);
    else if (url.trim()) setMapInfo("No pude leer ese link. Pegá el link completo de Google Maps.");
    else setMapInfo("");
  }

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { await posSaveSupplier(fd); setEditing(null); router.refresh(); });
  }
  function onDelete(r: Row) {
    const msg = r.count > 0 ? `"${r.nombre}" tiene ${r.count} productos. Se va a desactivar (no borrar). ¿Seguimos?` : `¿Borrar "${r.nombre}"?`;
    if (!confirm(msg)) return;
    const fd = new FormData(); fd.set("id", r.id);
    start(async () => { await posDeleteSupplier(fd); router.refresh(); });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Proveedores</h1></div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => open({ ...EMPTY })}>+ Nuevo</button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.5fr 1fr 1fr .6fr 1fr" }}>
          <span>Nombre</span><span>CUIT</span><span>Teléfono</span><span>Prod.</span><span></span>
        </div>
        {proveedores.length === 0 && <div className="admin-empty">Sin proveedores.</div>}
        {proveedores.map((p) => (
          <div className="admin-tr" key={p.id} style={{ gridTemplateColumns: "1.5fr 1fr 1fr .6fr 1fr", opacity: p.activo ? 1 : 0.5 }}>
            <span className="admin-name">
              <b>{p.nombre}</b>
              {p.contacto && <em>{p.contacto}</em>}
              {mapsLink(p) && <a className="prov-map" href={mapsLink(p)} target="_blank" rel="noopener">📍 Cómo llegar</a>}
              {!p.activo && <em style={{ color: "var(--gray)" }}>inactivo</em>}
            </span>
            <span data-label="CUIT">{p.cuit || "—"}</span>
            <span data-label="Teléfono">{p.telefono || "—"}</span>
            <span data-label="Productos">{p.count}</span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => open(p)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => onDelete(p)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">{editing.id ? "Editar proveedor" : "Nuevo proveedor"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />
            <input type="hidden" name="lat" value={lat ?? ""} readOnly />
            <input type="hidden" name="lng" value={lng ?? ""} readOnly />

            <label>Link de Google Maps <span className="admin-opt">pegá y autocompleta nombre + ubicación</span>
              <input name="mapsUrl" value={mapsUrl} onChange={(e) => onMaps(e.target.value)} placeholder="https://www.google.com/maps/place/..." />
            </label>
            {mapInfo && (
              <div className="prov-mapinfo">
                <span>{mapInfo}</span>
                {lat != null && lng != null && (
                  <a href={mapsLink({ mapsUrl, lat, lng })} target="_blank" rel="noopener">Ver en el mapa ↗</a>
                )}
              </div>
            )}

            <label>Nombre *<input name="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus /></label>
            <label>Dirección<input name="direccion" defaultValue={editing.direccion} placeholder="Calle, número, ciudad" /></label>
            <div className="admin-grid2">
              <label>CUIT<input name="cuit" defaultValue={editing.cuit} placeholder="30-12345678-9" /></label>
              <label>Contacto<input name="contacto" defaultValue={editing.contacto} placeholder="Nombre del referente" /></label>
            </div>
            <div className="admin-grid2">
              <label>Teléfono<input name="telefono" defaultValue={editing.telefono} /></label>
              <label>Email<input name="email" type="email" defaultValue={editing.email} /></label>
            </div>
            <label>Notas<input name="notas" defaultValue={editing.notas} /></label>
            <label className="admin-check"><input type="checkbox" name="activo" defaultChecked={editing.activo} /> Activo</label>
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
