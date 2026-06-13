"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { voidSale } from "../app/pos/actions";

type Item = { name: string; qty: number; unit: string; subtotal: number };
type Sale = {
  id: string; code: string; at: string; subtotal: number; discount: number; total: number;
  payMethod: string; voided: boolean; seller: string; customer: string; items: Item[];
};

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const fmtDate = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const PAY: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CUENTA_CORRIENTE: "Cuenta corriente", MIXTO: "Mixto" };
type Range = "hoy" | "7" | "30";

export default function PosVentas({ sales }: { sales: Sale[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [range, setRange] = useState<Range>("hoy");
  const [open, setOpen] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = new Date();
    if (range === "hoy") from.setHours(0, 0, 0, 0);
    else from.setDate(now.getDate() - (range === "7" ? 7 : 30));
    return sales.filter((s) => new Date(s.at) >= from);
  }, [sales, range]);

  const vivas = filtered.filter((s) => !s.voided);
  const totalVendido = vivas.reduce((a, s) => a + s.total, 0);
  const anuladas = filtered.length - vivas.length;

  function anular(s: Sale) {
    if (!confirm(`¿Anular la venta #${s.code} por ${money(s.total)}?\nSe repone el stock y se revierte la cuenta corriente si corresponde.`)) return;
    const fd = new FormData(); fd.set("saleId", s.id);
    start(async () => {
      const res = await voidSale(fd);
      if (res?.ok === false) { alert(res.error); return; }
      setOpen(null); router.refresh();
    });
  }

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div><span className="eyebrow">Local</span><h1 className="serif">Ventas del local</h1>
          <p className="pos-muted">Historial del mostrador (POS). Tocá una venta para ver el detalle o anularla.</p>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="vt-range">
          {(["hoy", "7", "30"] as const).map((r) => (
            <button key={r} type="button" className={range === r ? "on" : ""} onClick={() => setRange(r)}>
              {r === "hoy" ? "Hoy" : r === "7" ? "7 días" : "30 días"}
            </button>
          ))}
        </div>
      </div>

      <div className="dash-grid" style={{ marginBottom: 18 }}>
        <div className="dash-kpi"><span>Vendido (neto)</span><b>{money(totalVendido)}</b></div>
        <div className="dash-kpi"><span>Ventas</span><b>{vivas.length}</b></div>
        <div className="dash-kpi"><span>Anuladas</span><b style={{ color: anuladas ? "#ff6b73" : "inherit" }}>{anuladas}</b></div>
      </div>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1fr 1.1fr 1fr 1fr .9fr .8fr" }}>
          <span>Venta</span><span>Fecha</span><span>Vendedor</span><span>Pago</span><span>Total</span><span></span>
        </div>
        {filtered.length === 0 && <div className="admin-empty">Sin ventas en este período.</div>}
        {filtered.map((s) => (
          <div className="admin-tr" key={s.id} style={{ gridTemplateColumns: "1fr 1.1fr 1fr 1fr .9fr .8fr", opacity: s.voided ? 0.5 : 1 }}>
            <span className="admin-name"><b>#{s.code}{s.voided && <span className="vt-anulada">anulada</span>}</b>{s.customer && <em>{s.customer}</em>}</span>
            <span style={{ color: "var(--gray)", fontSize: ".82rem" }}>{fmtDate(s.at)}</span>
            <span style={{ color: "var(--gray)" }}>{s.seller || "—"}</span>
            <span style={{ color: "var(--gray)" }}>{PAY[s.payMethod] || s.payMethod}</span>
            <span><b style={{ fontFamily: "var(--font-spectral)", textDecoration: s.voided ? "line-through" : "none" }}>{money(s.total)}</b></span>
            <span className="admin-row-actions"><button type="button" onClick={() => setOpen(s)}>Ver</button></span>
          </div>
        ))}
      </div>

      {open && (
        <div className="admin-modal" onClick={() => !pending && setOpen(null)}>
          <div className="admin-card admin-editor" style={{ width: "min(440px,100%)" }} onClick={(e) => e.stopPropagation()}>
            <div className="vt-head">
              <h2 className="serif">Venta #{open.code}</h2>
              {open.voided && <span className="vt-anulada">anulada</span>}
            </div>
            <p className="pos-muted" style={{ marginTop: -6 }}>{fmtDate(open.at)} · {PAY[open.payMethod] || open.payMethod}{open.seller && ` · ${open.seller}`}{open.customer && ` · ${open.customer}`}</p>

            <div className="vt-items">
              {open.items.map((i, k) => (
                <div className="vt-item" key={k}>
                  <span>{i.qty}× {i.name}{i.unit === "CAJA" ? " (caja)" : ""}</span>
                  <span>{money(i.subtotal)}</span>
                </div>
              ))}
            </div>
            <div className="vt-totals">
              {open.discount > 0 && <div className="vt-trow"><span>Descuento</span><span>− {money(open.discount)}</span></div>}
              <div className="vt-trow vt-grand"><span>Total</span><span>{money(open.total)}</span></div>
            </div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(null)} disabled={pending}>Cerrar</button>
              {!open.voided && (
                <button type="button" className="btn vt-void" onClick={() => anular(open)} disabled={pending}>{pending ? "Anulando…" : "Anular venta"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
