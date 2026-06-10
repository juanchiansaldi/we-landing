"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCombo, deleteCombo } from "../app/pos/actions";

type Cat = { id: string; name: string; brand: string; quickCode: string; barcode: string; cost: number; price: number };
type Comp = { productId: string; name: string; qty: number };
type Combo = {
  id: string; name: string; quickCode: string; barcode: string; margin: number | null;
  cost: number; price: number; active: boolean; components: Comp[];
};

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

const EMPTY: Combo = { id: "", name: "", quickCode: "", barcode: "", margin: 30, cost: 0, price: 0, active: true, components: [] };

export default function PosCombos({ combos, catalog }: { combos: Combo[]; catalog: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Combo | null>(null);
  const [pending, start] = useTransition();

  // estado del editor
  const [name, setName] = useState("");
  const [quickCode, setQuickCode] = useState("");
  const [barcode, setBarcode] = useState("");
  const [comps, setComps] = useState<Comp[]>([]);
  const [margin, setMargin] = useState<string>("30");
  const [manualPrice, setManualPrice] = useState<string>("");
  const [pickQ, setPickQ] = useState("");

  const catById = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  const pickResults = useMemo(() => {
    const t = pickQ.trim().toLowerCase();
    if (!t) return [];
    return catalog
      .filter((p) => `${p.name} ${p.brand} ${p.quickCode} ${p.barcode}`.toLowerCase().includes(t))
      .slice(0, 8);
  }, [pickQ, catalog]);

  function open(c: Combo) {
    setEditing(c);
    setName(c.name); setQuickCode(c.quickCode); setBarcode(c.barcode);
    setComps(c.components.map((x) => ({ ...x })));
    setMargin(c.margin != null ? String(c.margin) : "");
    setManualPrice(c.margin == null && c.price ? String(c.price) : "");
    setPickQ("");
  }

  const cost = useMemo(() => comps.reduce((s, c) => s + (catById.get(c.productId)?.cost || 0) * c.qty, 0), [comps, catById]);
  const m = margin.trim() === "" ? null : Math.max(0, Number(margin) || 0);
  const price = m != null ? Math.round(cost * (1 + m / 100)) : 0;

  function addComp(productId: string) {
    if (!productId) return;
    setComps((cs) => cs.find((c) => c.productId === productId) ? cs : [...cs, { productId, name: catById.get(productId)?.name || "", qty: 1 }]);
    setPickQ("");
  }
  function setQty(id: string, qty: number) {
    setComps((cs) => qty <= 0 ? cs.filter((c) => c.productId !== id) : cs.map((c) => c.productId === id ? { ...c, qty } : c));
  }

  function onSave() {
    if (!name.trim() || !comps.length) { alert("Poné nombre y al menos un producto"); return; }
    start(async () => {
      const res = await saveCombo({
        id: editing?.id || undefined,
        name: name.trim(),
        quickCode: quickCode.trim(),
        barcode: barcode.trim(),
        components: comps.map((c) => ({ productId: c.productId, qty: c.qty })),
        margin: m,
        manualPrice: m == null ? (Number(manualPrice) || 0) : null,
        active: editing?.active ?? true,
      });
      if (res?.ok) { setEditing(null); router.refresh(); }
      else alert(res?.error || "No se pudo guardar");
    });
  }
  function onDelete(c: Combo) {
    if (!confirm(`¿Borrar el combo "${c.name}"?`)) return;
    const fd = new FormData(); fd.set("id", c.id);
    start(async () => { await deleteCombo(fd); router.refresh(); });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Administración</span><h1 className="serif">Combos</h1>
          <p className="pos-muted">Agrupá productos (ej. Fernet + 2 Cocas). Suma los costos, le ponés un margen y sale el precio solo.</p>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => open({ ...EMPTY })}>+ Nuevo combo</button>
        </div>
      </header>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.6fr 1.4fr .7fr .6fr .8fr 1fr" }}>
          <span>Combo</span><span>Lleva</span><span>Costo</span><span>Margen</span><span>Precio</span><span></span>
        </div>
        {combos.length === 0 && <div className="admin-empty">Sin combos. Creá el primero.</div>}
        {combos.map((c) => (
          <div className="admin-tr" key={c.id} style={{ gridTemplateColumns: "1.6fr 1.4fr .7fr .6fr .8fr 1fr", opacity: c.active ? 1 : 0.5 }}>
            <span className="admin-name"><b>{c.quickCode && <span className="vd-code">{c.quickCode}</span>}{c.name}</b>{!c.active && <em>inactivo</em>}</span>
            <span style={{ fontSize: ".82rem", color: "var(--gray)" }}>{c.components.map((x) => `${x.qty}× ${x.name}`).join(" + ")}</span>
            <span style={{ color: "var(--gray)" }}>{money(c.cost)}</span>
            <span>{c.margin != null ? `${c.margin}%` : "—"}</span>
            <span><b style={{ fontFamily: "var(--font-spectral)" }}>{money(c.price)}</b></span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => open(c)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => onDelete(c)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" style={{ width: "min(620px,100%)" }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); onSave(); }}>
            <h2 className="serif">{editing.id ? "Editar combo" : "Nuevo combo"}</h2>
            <label>Nombre *<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fernet + 2 Cocas" required /></label>
            <div className="admin-grid2">
              <label>Código rápido del combo <span className="admin-opt">tipear en caja</span>
                <input value={quickCode} onChange={(e) => setQuickCode(e.target.value)} placeholder="191" /></label>
              <label>Código de barras<input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="opcional" /></label>
            </div>

            <label>Productos que lleva</label>
            <div className="combo-pick-wrap">
              <input className="combo-search" value={pickQ} onChange={(e) => setPickQ(e.target.value)} placeholder="Buscá por nombre o código (ej. coca, 170)…" autoComplete="off" />
              {pickResults.length > 0 && (
                <div className="combo-results">
                  {pickResults.map((p) => (
                    <button key={p.id} type="button" className="combo-result" onClick={() => addComp(p.id)}>
                      <span>{p.quickCode && <span className="vd-code">{p.quickCode}</span>}{p.name}{p.brand ? ` · ${p.brand}` : ""}</span>
                      <span className="pos-muted">{money(p.cost)} costo</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="combo-comps">
              {comps.length === 0 && <span className="pos-muted">Todavía no agregaste productos.</span>}
              {comps.map((c) => (
                <div className="combo-comp" key={c.productId}>
                  <span>{c.name}</span>
                  <span className="pos-muted">{money(catById.get(c.productId)?.cost || 0)} c/u</span>
                  <div className="qty">
                    <button type="button" onClick={() => setQty(c.productId, c.qty - 1)}>−</button>
                    <span>{c.qty}</span>
                    <button type="button" onClick={() => setQty(c.productId, c.qty + 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="admin-grid2">
              <label>Margen % <span className="admin-opt">vacío = precio manual</span>
                <input type="number" min="0" value={margin} onChange={(e) => setMargin(e.target.value)} placeholder="30" /></label>
              <div className="combo-calc">
                <div><span>Costo combinado</span><b>{money(cost)}</b></div>
                <div><span>Precio de venta</span>
                  {m != null
                    ? <b style={{ color: "var(--red)" }}>{money(price)}</b>
                    : <input type="number" min="0" value={manualPrice} onChange={(e) => setManualPrice(e.target.value)} placeholder="precio" />}
                </div>
              </div>
            </div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar combo"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
