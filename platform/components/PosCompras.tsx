"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posSavePurchase } from "../app/pos/actions";

type Cat = { id: string; name: string; brand: string; quickCode: string; barcode: string; cost: number };
type Purchase = { id: string; supplier: string; invoice: string; total: number; items: number; at: string };
type Line = { productId: string; name: string; qty: number; unitCost: number };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });

export default function PosCompras({ purchases, suppliers, catalog }: { purchases: Purchase[]; suppliers: { id: string; nombre: string }[]; catalog: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  const [supplierId, setSupplierId] = useState("");
  const [invoice, setInvoice] = useState("");
  const [note, setNote] = useState("");
  const [updateCost, setUpdateCost] = useState(true);
  const [lines, setLines] = useState<Line[]>([]);
  const [pickQ, setPickQ] = useState("");

  const pickResults = useMemo(() => {
    const t = pickQ.trim().toLowerCase();
    if (!t) return [];
    return catalog.filter((p) => `${p.name} ${p.brand} ${p.quickCode} ${p.barcode}`.toLowerCase().includes(t)).slice(0, 8);
  }, [pickQ, catalog]);

  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  function reset() { setSupplierId(""); setInvoice(""); setNote(""); setUpdateCost(true); setLines([]); setPickQ(""); }
  function addLine(c: Cat) {
    setLines((ls) => ls.find((l) => l.productId === c.id) ? ls : [...ls, { productId: c.id, name: c.name, qty: 1, unitCost: c.cost || 0 }]);
    setPickQ("");
  }
  function setLine(id: string, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => l.productId === id ? { ...l, ...patch } : l));
  }
  function rmLine(id: string) { setLines((ls) => ls.filter((l) => l.productId !== id)); }

  function save() {
    if (!lines.length) { alert("Agregá al menos un producto"); return; }
    start(async () => {
      const res = await posSavePurchase({
        supplierId: supplierId || undefined, invoiceNumber: invoice, note, updateCost,
        items: lines.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost })),
      });
      if (res?.ok === false) { alert(res.error); return; }
      setOpen(false); reset(); router.refresh();
    });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Compras</h1>
          <p className="pos-muted">Cargá la mercadería que entra. Suma stock y (opcional) actualiza el costo.</p>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => { reset(); setOpen(true); }}>+ Nueva compra</button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1fr 1.4fr 1fr .8fr 1fr" }}>
          <span>Fecha</span><span>Proveedor</span><span>Factura</span><span>Ítems</span><span>Total</span>
        </div>
        {purchases.length === 0 && <div className="admin-empty">Sin compras registradas.</div>}
        {purchases.map((p) => (
          <div className="admin-tr" key={p.id} style={{ gridTemplateColumns: "1fr 1.4fr 1fr .8fr 1fr" }}>
            <span style={{ color: "var(--gray)" }}>{fmtDate(p.at)}</span>
            <span className="admin-name"><b>{p.supplier}</b></span>
            <span style={{ color: "var(--gray)" }}>{p.invoice || "—"}</span>
            <span>{p.items}</span>
            <span><b style={{ fontFamily: "var(--font-spectral)" }}>{money(p.total)}</b></span>
          </div>
        ))}
      </div>

      {open && (
        <div className="admin-modal" onClick={() => !pending && setOpen(false)}>
          <form className="admin-card admin-editor" style={{ width: "min(680px,100%)" }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <h2 className="serif">Nueva compra</h2>
            <div className="admin-grid2">
              <label>Proveedor
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">— Sin proveedor —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select></label>
              <label>N° de factura / remito<input value={invoice} onChange={(e) => setInvoice(e.target.value)} placeholder="opcional" /></label>
            </div>

            <label>Agregar productos</label>
            <div className="combo-pick-wrap">
              <input className="combo-search" value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Buscá por nombre o código…" autoComplete="off" />
              {pickResults.length > 0 && (
                <div className="combo-results">
                  {pickResults.map((p) => (
                    <button key={p.id} type="button" className="combo-result" onClick={() => addLine(p)}>
                      <span>{p.quickCode && <span className="vd-code">{p.quickCode}</span>}{p.name}{p.brand ? ` · ${p.brand}` : ""}</span>
                      <span className="pos-muted">{p.cost ? money(p.cost) : "sin costo"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="buy-lines">
              {lines.length === 0 && <span className="pos-muted">Todavía no agregaste productos.</span>}
              {lines.map((l) => (
                <div className="buy-line" key={l.productId}>
                  <span className="buy-name">{l.name}</span>
                  <label className="buy-f">Cant.<input type="number" min="1" value={l.qty} onChange={(e) => setLine(l.productId, { qty: Math.max(1, Number(e.target.value) || 1) })} /></label>
                  <label className="buy-f">Costo u.<input type="number" min="0" value={l.unitCost} onChange={(e) => setLine(l.productId, { unitCost: Math.max(0, Number(e.target.value) || 0) })} /></label>
                  <b className="buy-sub">{money(l.qty * l.unitCost)}</b>
                  <button type="button" className="vd-rm" onClick={() => rmLine(l.productId)}>✕</button>
                </div>
              ))}
            </div>

            <label className="admin-check"><input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} /> Actualizar el costo de cada producto con esta compra</label>
            <label>Nota<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="opcional" /></label>

            <div className="buy-total"><span>Total compra</span><b>{money(total)}</b></div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending || !lines.length}>{pending ? "Guardando…" : "Registrar compra"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
