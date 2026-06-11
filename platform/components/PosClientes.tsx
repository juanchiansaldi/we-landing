"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { posSaveCustomer, posDeleteCustomer, posLedgerEntry } from "../app/pos/actions";

type Row = { id: string; name: string; email: string; phone: string; cuit: string; vip: boolean; ccBalance: number };
type Move = { id: string; customerId: string; type: string; amount: number; resultingBalance: number; note: string; at: string };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const EMPTY: Row = { id: "", name: "", email: "", phone: "", cuit: "", vip: false, ccBalance: 0 };

export default function PosClientes({ customers, ledger }: { customers: Row[]; ledger: Move[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Row | null>(null);
  const [cc, setCc] = useState<Row | null>(null); // cuenta corriente abierta
  const [ccType, setCcType] = useState<"CARGO" | "PAGO">("PAGO");
  const [ccAmount, setCcAmount] = useState("");
  const [ccNote, setCcNote] = useState("");

  const totalFiado = customers.reduce((s, c) => s + Math.max(0, c.ccBalance), 0);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return customers;
    return customers.filter((c) => `${c.name} ${c.email} ${c.phone} ${c.cuit}`.toLowerCase().includes(t));
  }, [q, customers]);

  const ccHistory = useMemo(() => cc ? ledger.filter((l) => l.customerId === cc.id) : [], [cc, ledger]);

  function saveCustomer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => { await posSaveCustomer(fd); setEdit(null); router.refresh(); });
  }
  function delCustomer(r: Row) {
    if (!confirm(`¿Borrar a "${r.name || r.email}"?`)) return;
    const fd = new FormData(); fd.set("id", r.id);
    start(async () => { const res = await posDeleteCustomer(fd); if (res?.ok === false) alert(res.error); router.refresh(); });
  }
  function saveLedger() {
    if (!cc) return;
    const amt = Number(ccAmount) || 0;
    if (amt <= 0) { alert("Poné un monto"); return; }
    const fd = new FormData();
    fd.set("customerId", cc.id); fd.set("type", ccType); fd.set("amount", String(amt)); fd.set("note", ccNote);
    start(async () => {
      const res = await posLedgerEntry(fd);
      if (res?.ok === false) { alert(res.error); return; }
      setCc(null); setCcAmount(""); setCcNote(""); router.refresh();
    });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Clientes</h1>
          <p className="pos-muted">Cuenta corriente: lo que te deben (fiado) y los pagos.</p>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-primary" type="button" onClick={() => setEdit({ ...EMPTY })}>+ Nuevo cliente</button>
        </div>
      </header>

      <div className="dash-grid" style={{ marginBottom: 18 }}>
        <div className="dash-kpi"><span>Clientes</span><b>{customers.length}</b></div>
        <div className="dash-kpi"><span>Total fiado (te deben)</span><b style={{ color: totalFiado ? "var(--red)" : "inherit" }}>{money(totalFiado)}</b></div>
      </div>

      <div className="admin-toolbar">
        <input className="admin-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" />
      </div>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.3fr" }}>
          <span>Nombre</span><span>Teléfono</span><span>CUIT</span><span>Saldo</span><span></span>
        </div>
        {filtered.length === 0 && <div className="admin-empty">Sin clientes.</div>}
        {filtered.map((c) => (
          <div className="admin-tr" key={c.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1.3fr" }}>
            <span className="admin-name"><b>{c.vip && <span className="vd-code" style={{ background: "#caa14a" }}>VIP</span>}{c.name || "(sin nombre)"}</b>{c.email && <em>{c.email}</em>}</span>
            <span style={{ color: "var(--gray)" }}>{c.phone || "—"}</span>
            <span style={{ color: "var(--gray)" }}>{c.cuit || "—"}</span>
            <span><b className={c.ccBalance > 0 ? "stk-low" : "stk-ok"}>{money(c.ccBalance)}</b></span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => { setCc(c); setCcType("PAGO"); setCcAmount(""); setCcNote(""); }}>Cuenta</button>
              <button type="button" onClick={() => setEdit(c)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => delCustomer(c)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {edit && (
        <div className="admin-modal" onClick={() => !pending && setEdit(null)}>
          <form className="admin-card admin-editor" onClick={(e) => e.stopPropagation()} onSubmit={saveCustomer}>
            <h2 className="serif">{edit.id ? "Editar cliente" : "Nuevo cliente"}</h2>
            <input type="hidden" name="id" defaultValue={edit.id} />
            <label>Nombre *<input name="name" defaultValue={edit.name} required autoFocus /></label>
            <div className="admin-grid2">
              <label>Teléfono<input name="phone" defaultValue={edit.phone} /></label>
              <label>CUIT<input name="cuit" defaultValue={edit.cuit} placeholder="opcional" /></label>
            </div>
            <label>Email<input name="email" type="email" defaultValue={edit.email} placeholder="opcional" /></label>
            <label className="admin-check"><input type="checkbox" name="vip" defaultChecked={edit.vip} /> Cliente VIP</label>
            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}

      {cc && (
        <div className="admin-modal" onClick={() => !pending && setCc(null)}>
          <div className="admin-card admin-editor" style={{ width: "min(520px,100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2 className="serif">Cuenta de {cc.name || "cliente"}</h2>
            <p className="pos-muted" style={{ marginTop: -6 }}>Saldo actual: <b className={cc.ccBalance > 0 ? "stk-low" : "stk-ok"}>{money(cc.ccBalance)}</b>{cc.ccBalance > 0 ? " (te debe)" : ""}</p>

            <div className="seg">
              <button type="button" className={ccType === "PAGO" ? "on" : ""} onClick={() => setCcType("PAGO")}>Registrar pago</button>
              <button type="button" className={ccType === "CARGO" ? "on" : ""} onClick={() => setCcType("CARGO")}>Cargar deuda</button>
            </div>
            <div className="admin-grid2">
              <label>Monto<input type="number" min="0" value={ccAmount} onChange={(e) => setCcAmount(e.target.value)} autoFocus /></label>
              <label>Nota<input value={ccNote} onChange={(e) => setCcNote(e.target.value)} placeholder="opcional" /></label>
            </div>
            <button type="button" className="btn btn-primary" onClick={saveLedger} disabled={pending}>{pending ? "Guardando…" : ccType === "PAGO" ? "Registrar pago" : "Cargar deuda"}</button>

            <h3 style={{ margin: "16px 0 6px", fontSize: ".95rem" }}>Historial</h3>
            <div className="cc-hist">
              {ccHistory.length === 0 && <span className="pos-muted">Sin movimientos.</span>}
              {ccHistory.map((m) => (
                <div className="cc-row" key={m.id}>
                  <span style={{ color: "var(--gray)", fontSize: ".78rem" }}>{fmtDate(m.at)}</span>
                  <span className={m.type === "CARGO" ? "stk-low" : "stk-ok"}>{m.type === "CARGO" ? "Deuda" : "Pago"} {money(m.amount)}</span>
                  <span className="pos-muted">{m.note}</span>
                  <span style={{ color: "var(--gray)" }}>saldo {money(m.resultingBalance)}</span>
                </div>
              ))}
            </div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setCc(null)} disabled={pending}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
