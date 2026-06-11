"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posAdjustStock } from "../app/pos/actions";

type Row = {
  id: string; name: string; sku: string; quickCode: string;
  stock: number; stockMin: number; cost: number; unitsPerCase: number; active: boolean;
};
type Move = { id: string; name: string; type: string; qty: number; reason: string; resultingStock: number; at: string };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function PosStock({ products, movements }: { products: Row[]; movements: Move[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [adjust, setAdjust] = useState<Row | null>(null);
  const [mode, setMode] = useState<"set" | "delta">("set");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("conteo");

  const lowCount = products.filter((p) => p.stock <= p.stockMin).length;
  const invValue = products.reduce((s, p) => s + p.stock * p.cost, 0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return products.filter((p) => {
      if (onlyLow && p.stock > p.stockMin) return false;
      if (!t) return true;
      return `${p.name} ${p.sku} ${p.quickCode}`.toLowerCase().includes(t);
    });
  }, [q, onlyLow, products]);

  function openAdjust(r: Row) {
    setAdjust(r); setMode("set"); setValue(String(r.stock)); setReason("conteo");
  }
  function save() {
    if (!adjust) return;
    const fd = new FormData();
    fd.set("productId", adjust.id); fd.set("mode", mode); fd.set("value", value || "0"); fd.set("reason", reason);
    start(async () => {
      const res = await posAdjustStock(fd);
      if (res?.ok === false) { alert(res.error); return; }
      setAdjust(null); router.refresh();
    });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Stock</h1>
          <p className="pos-muted">Conteo físico, mermas y ajustes. Cada cambio queda registrado.</p>
        </div>
      </header>

      <div className="dash-grid" style={{ marginBottom: 18 }}>
        <div className="dash-kpi"><span>Productos</span><b>{products.length}</b></div>
        <div className="dash-kpi"><span>Bajo stock</span><b style={{ color: lowCount ? "var(--red)" : "inherit" }}>{lowCount}</b></div>
        <div className="dash-kpi"><span>Valor inventario (costo)</span><b>{money(invValue)}</b></div>
      </div>

      <div className="admin-toolbar">
        <input className="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, SKU o código…" />
        <label className="admin-check"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Solo bajo stock</label>
      </div>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.8fr .8fr .7fr .7fr 1fr .8fr" }}>
          <span>Producto</span><span>Stock</span><span>Mínimo</span><span>Costo</span><span>Valor</span><span></span>
        </div>
        {filtered.length === 0 && <div className="admin-empty">Sin resultados.</div>}
        {filtered.map((p) => {
          const low = p.stock <= p.stockMin;
          return (
            <div className="admin-tr" key={p.id} style={{ gridTemplateColumns: "1.8fr .8fr .7fr .7fr 1fr .8fr", opacity: p.active ? 1 : 0.5 }}>
              <span className="admin-name"><b>{p.quickCode && <span className="vd-code">{p.quickCode}</span>}{p.name}</b>{p.sku && <em>{p.sku}</em>}</span>
              <span><b className={low ? "stk-low" : "stk-ok"}>{p.stock}</b></span>
              <span style={{ color: "var(--gray)" }}>{p.stockMin}</span>
              <span style={{ color: "var(--gray)" }}>{p.cost ? money(p.cost) : "—"}</span>
              <span>{money(p.stock * p.cost)}</span>
              <span className="admin-row-actions"><button type="button" onClick={() => openAdjust(p)}>Ajustar</button></span>
            </div>
          );
        })}
      </div>

      <h2 className="serif" style={{ marginTop: 28, fontSize: "1.1rem" }}>Movimientos recientes</h2>
      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1fr 1.6fr 1fr .7fr .9fr" }}>
          <span>Fecha</span><span>Producto</span><span>Motivo</span><span>Cant.</span><span>Resultó</span>
        </div>
        {movements.length === 0 && <div className="admin-empty">Sin movimientos todavía.</div>}
        {movements.map((m) => (
          <div className="admin-tr" key={m.id} style={{ gridTemplateColumns: "1fr 1.6fr 1fr .7fr .9fr" }}>
            <span style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(m.at)}</span>
            <span>{m.name}</span>
            <span style={{ color: "var(--gray)" }}>{m.reason}</span>
            <span><b className={m.qty >= 0 ? "stk-ok" : "stk-low"}>{m.qty >= 0 ? "+" : ""}{m.qty}</b></span>
            <span style={{ color: "var(--gray)" }}>{m.resultingStock}</span>
          </div>
        ))}
      </div>

      {adjust && (
        <div className="admin-modal" onClick={() => !pending && setAdjust(null)}>
          <form className="admin-card admin-editor" style={{ width: "min(440px,100%)" }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <h2 className="serif">Ajustar stock</h2>
            <p className="pos-muted" style={{ marginTop: -6 }}>{adjust.name} · stock actual <b>{adjust.stock}</b></p>
            <div className="seg">
              <button type="button" className={mode === "set" ? "on" : ""} onClick={() => { setMode("set"); setValue(String(adjust.stock)); }}>Contar (queda en)</button>
              <button type="button" className={mode === "delta" ? "on" : ""} onClick={() => { setMode("delta"); setValue(""); }}>Sumar / restar</button>
            </div>
            <label>{mode === "set" ? "Stock real contado" : "Cantidad (negativo para restar, ej. -3)"}
              <input type="number" value={value} onChange={(e) => setValue(e.target.value)} autoFocus required /></label>
            <label>Motivo
              <select value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="conteo">Conteo físico</option>
                <option value="merma">Merma / rotura</option>
                <option value="robo">Faltante / robo</option>
                <option value="devolucion">Devolución</option>
                <option value="ajuste">Otro ajuste</option>
              </select></label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setAdjust(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Aplicar ajuste"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
