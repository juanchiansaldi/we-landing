"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCash, closeCash } from "../app/pos/actions";

type Current = {
  id: string; openingAmount: number; openedAt: string;
  count: number; cash: number; card: number; transfer: number; account: number; total: number; expectedCash: number;
};
type Hist = { id: string; openedAt: string; closedAt: string; openingAmount: number; expected: number; counted: number; difference: number };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function PosCaja({ current, history }: { current: Current | null; history: Hist[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");

  const diff = current && counted !== "" ? (Number(counted) || 0) - current.expectedCash : null;

  function doOpen() {
    const fd = new FormData(); fd.set("openingAmount", opening || "0");
    start(async () => { const res = await openCash(fd); if (res?.ok === false) { alert(res.error); return; } setOpening(""); router.refresh(); });
  }
  function doClose() {
    if (counted === "") { alert("Contá la plata y poné el monto"); return; }
    const fd = new FormData(); fd.set("countedAmount", counted);
    start(async () => { const res = await closeCash(fd); if (res?.ok === false) { alert(res.error); return; } setCounted(""); router.refresh(); });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Gestión</span><h1 className="serif">Caja</h1>
          <p className="pos-muted">Abrí la caja al empezar el día y cerrala al final para arquear el efectivo.</p>
        </div>
      </header>

      {!current ? (
        <div className="admin-card cash-open cash-open-empty">
          <div className="cash-ico">💵</div>
          <h2 className="serif">Abrir caja</h2>
          <p className="pos-muted">¿Con cuánto efectivo arrancás? Es el fondo para dar cambio.</p>
          <div className="cash-money">
            <span className="cash-cur">$</span>
            <input type="number" min="0" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="0" autoFocus />
          </div>
          <button className="btn btn-primary cash-btn" type="button" onClick={doOpen} disabled={pending}>{pending ? "Abriendo…" : "Abrir caja"}</button>
        </div>
      ) : (
        <div className="admin-card cash-open">
          <div className="cash-head">
            <h2 className="serif">Caja abierta</h2>
            <span className="pos-muted">desde {fmtDate(current.openedAt)} · {current.count} ventas</span>
          </div>
          <div className="cash-grid">
            <div className="cash-cell"><span>Fondo inicial</span><b>{money(current.openingAmount)}</b></div>
            <div className="cash-cell"><span>Efectivo (ventas)</span><b>{money(current.cash)}</b></div>
            <div className="cash-cell"><span>Tarjeta</span><b>{money(current.card)}</b></div>
            <div className="cash-cell"><span>Transferencia</span><b>{money(current.transfer)}</b></div>
            <div className="cash-cell"><span>Cuenta corriente</span><b>{money(current.account)}</b></div>
            <div className="cash-cell cash-strong"><span>Efectivo esperado en caja</span><b>{money(current.expectedCash)}</b></div>
          </div>

          <div className="cash-close">
            <h3 className="serif" style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Cerrar caja</h3>
            <p className="pos-muted" style={{ marginTop: 0 }}>Contá la plata que hay en la caja y ponela acá:</p>
            <div className="cash-close-row">
              <div className="cash-money">
                <span className="cash-cur">$</span>
                <input type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0" />
              </div>
              <button className="btn btn-primary cash-btn-inline" type="button" onClick={doClose} disabled={pending}>{pending ? "Cerrando…" : "Cerrar caja"}</button>
            </div>
            {diff !== null && (
              <p className={`cash-diff ${diff === 0 ? "stk-ok" : "stk-low"}`}>
                {diff === 0 ? "✓ Cuadra exacto" : diff > 0 ? `Sobran ${money(diff)} en caja` : `Faltan ${money(-diff)} en caja`}
              </p>
            )}
          </div>
        </div>
      )}

      <h2 className="serif" style={{ marginTop: 28, fontSize: "1.1rem" }}>Cierres anteriores</h2>
      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1fr 1fr .9fr .9fr .9fr" }}>
          <span>Abierta</span><span>Cerrada</span><span>Esperado</span><span>Contado</span><span>Diferencia</span>
        </div>
        {history.length === 0 && <div className="admin-empty">Sin cierres todavía.</div>}
        {history.map((h) => (
          <div className="admin-tr" key={h.id} style={{ gridTemplateColumns: "1fr 1fr .9fr .9fr .9fr" }}>
            <span style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(h.openedAt)}</span>
            <span style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(h.closedAt)}</span>
            <span>{money(h.expected)}</span>
            <span>{money(h.counted)}</span>
            <span><b className={h.difference === 0 ? "stk-ok" : "stk-low"}>{h.difference > 0 ? "+" : ""}{money(h.difference)}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}
