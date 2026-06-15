"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { openCash, closeCash, addCashMovement } from "../app/pos/actions";

type Mov = { id: string; type: string; amount: number; reason: string; at: string };
type Current = {
  id: string; openingAmount: number; openedAt: string;
  count: number; cash: number; card: number; transfer: number; account: number; total: number;
  movIn: number; movOut: number; expectedCash: number; movements: Mov[];
};
type Hist = { id: string; openedAt: string; closedAt: string; openingAmount: number; expected: number; counted: number; difference: number };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => iso ? new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function PosCaja({ current, history }: { current: Current | null; history: Hist[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [opening, setOpening] = useState("");
  const [counted, setCounted] = useState("");
  const [movType, setMovType] = useState<"EGRESO" | "INGRESO">("EGRESO");
  const [movAmount, setMovAmount] = useState("");
  const [movReason, setMovReason] = useState("");

  const diff = current && counted !== "" ? (Number(counted) || 0) - current.expectedCash : null;

  function doMovement() {
    if (!movAmount || Number(movAmount) <= 0) { alert("Poné un monto"); return; }
    if (!movReason.trim()) { alert("Poné un motivo (ej. pago proveedor, cambio)"); return; }
    const fd = new FormData(); fd.set("type", movType); fd.set("amount", movAmount); fd.set("reason", movReason.trim());
    start(async () => { const res = await addCashMovement(fd); if (res?.ok === false) { alert(res.error); return; } setMovAmount(""); setMovReason(""); router.refresh(); });
  }

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
            {current.movIn > 0 && <div className="cash-cell"><span>Ingresos de caja</span><b className="stk-ok">+{money(current.movIn)}</b></div>}
            {current.movOut > 0 && <div className="cash-cell"><span>Retiros de caja</span><b className="stk-low">−{money(current.movOut)}</b></div>}
            <div className="cash-cell cash-strong"><span>Efectivo esperado en caja</span><b>{money(current.expectedCash)}</b></div>
          </div>

          {/* Movimientos de efectivo (no ventas) */}
          <div className="cash-movs">
            <h3 className="serif" style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Movimientos de efectivo</h3>
            <p className="pos-muted" style={{ marginTop: 0 }}>Plata que entra o sale de la caja sin ser una venta (ej. pagar un proveedor, agregar cambio).</p>
            <div className="cash-mov-form">
              <div className="seg cash-mov-seg">
                <button type="button" className={movType === "EGRESO" ? "on" : ""} onClick={() => setMovType("EGRESO")}>Retiro (sale)</button>
                <button type="button" className={movType === "INGRESO" ? "on" : ""} onClick={() => setMovType("INGRESO")}>Ingreso (entra)</button>
              </div>
              <div className="cash-mov-row">
                <div className="cash-money" style={{ flex: "0 0 150px" }}><span className="cash-cur">$</span><input type="number" min="0" value={movAmount} onChange={(e) => setMovAmount(e.target.value)} placeholder="0" /></div>
                <input className="cash-mov-reason" value={movReason} onChange={(e) => setMovReason(e.target.value)} placeholder="Motivo (ej. pago proveedor, cambio)" />
                <button className="btn btn-ghost" type="button" onClick={doMovement} disabled={pending}>Registrar</button>
              </div>
            </div>
            {current.movements.length > 0 && (
              <div className="cash-mov-list">
                {current.movements.map((m) => (
                  <div className="cash-mov-item" key={m.id}>
                    <span className={m.type === "INGRESO" ? "stk-ok" : "stk-low"}>{m.type === "INGRESO" ? "+" : "−"}{money(m.amount)}</span>
                    <span className="cash-mov-reason-t">{m.reason}</span>
                    <span style={{ color: "var(--gray)", fontSize: ".76rem" }}>{fmtDate(m.at)}</span>
                  </div>
                ))}
              </div>
            )}
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
            <span data-label="Abierta" style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(h.openedAt)}</span>
            <span data-label="Cerrada" style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(h.closedAt)}</span>
            <span data-label="Esperado">{money(h.expected)}</span>
            <span data-label="Contado">{money(h.counted)}</span>
            <span data-label="Diferencia"><b className={h.difference === 0 ? "stk-ok" : "stk-low"}>{h.difference > 0 ? "+" : ""}{money(h.difference)}</b></span>
          </div>
        ))}
      </div>
    </div>
  );
}
