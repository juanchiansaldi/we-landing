"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "../app/pos/actions";

type P = {
  id: string; name: string; sku: string; quickCode: string; barcode: string; brand: string;
  cat: string; isKit: boolean;
  price: number; promo: number | null; priceCase: number | null; unitsPerCase: number; stock: number;
};
type Client = { id: string; name: string; ccBalance: number };
type Unit = "BOTELLA" | "CAJA";
type Pay = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CUENTA_CORRIENTE";
type Line = { p: P; unit: Unit; qty: number };
type Ticket = {
  code: string;
  items: { name: string; unit: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number; discount: number; total: number; payMethod: string;
};
type Done = { code: string; total: number; pay: Pay; change: number };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const unitPrice = (p: P, unit: Unit) =>
  unit === "CAJA" ? (p.priceCase ?? p.price * p.unitsPerCase) : (p.promo ?? p.price);
const PAY_LABEL: Record<Pay, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", CUENTA_CORRIENTE: "Cuenta corriente" };

export default function Vender({ catalog, clients, store, sellerName, cashOpen }: {
  catalog: P[]; clients: Client[]; store: { name: string }; sellerName: string | null; cashOpen: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [pay, setPay] = useState<Pay>("EFECTIVO");
  const [customerId, setCustomerId] = useState("");
  const [cashGiven, setCashGiven] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [printTicket, setPrintTicket] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => inputRef.current?.focus();
  useEffect(() => { focusInput(); }, []);

  const cats = useMemo(() => [...new Set(catalog.map((p) => p.cat).filter(Boolean))].sort(), [catalog]);

  const byCode = useMemo(() => {
    const m = new Map<string, P>();
    for (const p of catalog) {
      if (p.barcode) m.set(p.barcode.toLowerCase(), p);
      if (p.quickCode) m.set(p.quickCode.toLowerCase(), p);
      if (p.sku) m.set(p.sku.toLowerCase(), p);
    }
    return m;
  }, [catalog]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return catalog.filter((p) => {
      if (catFilter && p.cat !== catFilter) return false;
      if (!t) return true;
      return `${p.name} ${p.brand} ${p.sku} ${p.quickCode} ${p.barcode}`.toLowerCase().includes(t);
    });
  }, [q, catFilter, catalog]);

  function addToCart(p: P, unit: Unit = "BOTELLA") {
    setDone(null);
    setCart((c) => {
      const i = c.findIndex((l) => l.p.id === p.id && l.unit === unit);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { p, unit, qty: 1 }];
    });
    setMsg(`✓ ${p.name}`);
    setTimeout(() => setMsg((m) => (m === `✓ ${p.name}` ? null : m)), 1100);
  }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    const hit = byCode.get(v.toLowerCase());
    if (hit) { addToCart(hit); setQ(""); return; }
    if (filtered.length === 1) { addToCart(filtered[0]); setQ(""); return; }
  }

  function setQty(idx: number, qty: number) {
    setCart((c) => { const n = [...c]; if (qty <= 0) n.splice(idx, 1); else n[idx] = { ...n[idx], qty }; return n; });
  }
  function toggleUnit(idx: number) {
    setCart((c) => { const n = [...c]; n[idx] = { ...n[idx], unit: n[idx].unit === "BOTELLA" ? "CAJA" : "BOTELLA" }; return n; });
  }

  const subtotal = cart.reduce((s, l) => s + unitPrice(l.p, l.unit) * l.qty, 0);
  const total = Math.max(0, subtotal - discount);
  const change = pay === "EFECTIVO" && cashGiven ? Math.max(0, Number(cashGiven) - total) : 0;
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function cobrar() {
    if (!cart.length || pending) return;
    if (pay === "CUENTA_CORRIENTE" && !customerId) { alert("Elegí un cliente para la cuenta corriente"); return; }
    start(async () => {
      const res = await createSale({
        items: cart.map((l) => ({ productId: l.p.id, unit: l.unit, qty: l.qty })),
        discount,
        payMethod: pay,
        customerId: pay === "CUENTA_CORRIENTE" ? customerId : undefined,
      });
      if (res.ok && res.ticket) {
        const t = res.ticket as Ticket;
        const ch = pay === "EFECTIVO" && cashGiven ? Math.max(0, Number(cashGiven) - t.total) : 0;
        setDone({ code: t.code, total: t.total, pay, change: ch });
        setCart([]); setDiscount(0); setCashGiven(""); setQ(""); setCustomerId("");
        router.refresh();
        if (printTicket) { setTicket(t); setTimeout(() => window.print(), 350); }
      } else {
        alert(res.error || "No se pudo registrar la venta");
      }
    });
  }

  return (
    <div className="vender">
      <div className="vd-bar">
        <h1 className="serif">Vender</h1>
        <div className="vd-bar-tags">
          <span className={sellerName ? "vd-tag on" : "vd-tag"}>{sellerName ? `👤 ${sellerName}` : "Sin vendedor"}</span>
          <span className={cashOpen ? "vd-tag on" : "vd-tag warn"}>{cashOpen ? "● Caja abierta" : "○ Caja cerrada"}</span>
        </div>
      </div>

      <div className="vender-grid">
        {/* IZQUIERDA: catálogo tocable */}
        <div className="vd-left">
          <div className="vd-scan">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onScan} placeholder="Escaneá el código o buscá por nombre…" autoComplete="off" />
            {q && <button type="button" className="vd-scan-x" onClick={() => { setQ(""); focusInput(); }}>✕</button>}
          </div>

          {cats.length > 1 && (
            <div className="vd-cats">
              <button type="button" className={!catFilter ? "on" : ""} onClick={() => setCatFilter("")}>Todos</button>
              {cats.map((c) => <button key={c} type="button" className={catFilter === c ? "on" : ""} onClick={() => setCatFilter(c)}>{c}</button>)}
            </div>
          )}

          {msg && <div className="vd-msg">{msg}</div>}

          <div className="vd-grid">
            {filtered.length === 0 && <div className="vd-grid-empty">No hay productos con ese filtro.</div>}
            {filtered.map((p) => {
              const pr = p.promo ?? p.price;
              return (
                <button key={p.id} type="button" className="vd-prod" onClick={() => addToCart(p)}>
                  <div className="vd-prod-top">
                    {p.quickCode && <span className="vd-code">{p.quickCode}</span>}
                    {p.isKit && <span className="vd-prod-combo">combo</span>}
                    <span className={`vd-prod-stk ${p.stock <= 0 ? "out" : ""}`}>{p.stock <= 0 ? "sin stock" : `${p.stock} u`}</span>
                  </div>
                  <p className="vd-prod-name">{p.name}</p>
                  {p.brand && <p className="vd-prod-brand">{p.brand}</p>}
                  <p className="vd-prod-price">{money(pr)}{p.promo != null && <s>{money(p.price)}</s>}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* DERECHA: ticket + cobro */}
        <div className="vd-right">
          <div className="vd-ticketcard">
            <div className="vd-tk-head"><b>Ticket</b><span>{count} {count === 1 ? "ítem" : "ítems"}</span></div>

            {done ? (
              <div className="vd-done">
                <div className="vd-done-ico">✓</div>
                <p className="vd-done-t">Venta cobrada</p>
                <p className="vd-done-s">{money(done.total)} · {PAY_LABEL[done.pay]}</p>
                {done.change > 0 && <p className="vd-done-change">Vuelto {money(done.change)}</p>}
                <p className="vd-done-code">#{done.code}</p>
                <button type="button" className="btn btn-primary" onClick={() => { setDone(null); focusInput(); }}>Nueva venta</button>
              </div>
            ) : cart.length === 0 ? (
              <div className="vd-empty"><span>🧾</span>Carrito vacío<em>Tocá un producto o escaneá un código</em></div>
            ) : (
              <div className="vd-items">
                {cart.map((l, idx) => (
                  <div className="vd-item" key={`${l.p.id}-${l.unit}`}>
                    <div className="vd-item-info">
                      <b>{l.p.name}</b>
                      <div className="vd-item-sub2">
                        <button type="button" className={`vd-unit ${l.unit === "CAJA" ? "caja" : ""}`} onClick={() => toggleUnit(idx)}>
                          {l.unit === "CAJA" ? `Caja ×${l.p.unitsPerCase}` : "Botella"}
                        </button>
                        <span>{money(unitPrice(l.p, l.unit))} c/u</span>
                      </div>
                    </div>
                    <div className="qty">
                      <button type="button" onClick={() => setQty(idx, l.qty - 1)}>−</button>
                      <span>{l.qty}</span>
                      <button type="button" onClick={() => setQty(idx, l.qty + 1)}>+</button>
                    </div>
                    <b className="vd-item-sub">{money(unitPrice(l.p, l.unit) * l.qty)}</b>
                    <button type="button" className="vd-rm" onClick={() => setQty(idx, 0)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!done && cart.length > 0 && (
            <div className="vd-foot">
              <div className="vd-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
              <div className="vd-row">
                <span>Descuento</span>
                <input className="vd-disc" type="number" min="0" value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} placeholder="0" />
              </div>
              <div className="vd-row vd-total"><span>Total</span><b>{money(total)}</b></div>

              <p className="vd-pays-l">Método de pago</p>
              <div className="vd-pays">
                {(["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CUENTA_CORRIENTE"] as const).map((m) => (
                  <button key={m} type="button" className={pay === m ? "on" : ""} onClick={() => setPay(m)}>
                    {m === "EFECTIVO" ? "Efectivo" : m === "TARJETA" ? "Tarjeta" : m === "TRANSFERENCIA" ? "Transfer." : "Cta. corr."}
                  </button>
                ))}
              </div>

              {pay === "CUENTA_CORRIENTE" && (
                <select className="vd-client" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                  <option value="">— Elegí un cliente —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.ccBalance > 0 ? ` (debe ${money(c.ccBalance)})` : ""}</option>)}
                </select>
              )}
              {pay === "EFECTIVO" && (
                <div className="vd-row vd-cash">
                  <span>Paga con</span>
                  <input className="vd-disc" type="number" min="0" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder={String(total)} />
                  {change > 0 && <b className="vd-change">Vuelto {money(change)}</b>}
                </div>
              )}

              <label className="vd-print">
                <input type="checkbox" checked={printTicket} onChange={(e) => setPrintTicket(e.target.checked)} />
                <span>Imprimir comprobante</span>
                <em>{printTicket ? "se imprime" : "no se imprime"}</em>
              </label>

              <button className="btn btn-primary vd-cobrar" type="button" onClick={cobrar} disabled={!cart.length || pending}>
                {pending ? "Registrando…" : `Cobrar ${money(total)}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* TICKET imprimible */}
      {ticket && (
        <div className="vd-ticket-overlay" onClick={() => { setTicket(null); focusInput(); }}>
          <div className="vd-ticket" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-print">
              <div className="tk-head">{store.name}</div>
              <div className="tk-sub">Crespo, Entre Ríos · Comprobante NO fiscal</div>
              <div className="tk-line">Venta #{ticket.code}</div>
              <div className="tk-hr" />
              {ticket.items.map((i, k) => (
                <div className="tk-item" key={k}>
                  <span>{i.qty}× {i.name}{i.unit === "CAJA" ? " (caja)" : ""}</span>
                  <span>{money(i.subtotal)}</span>
                </div>
              ))}
              <div className="tk-hr" />
              {ticket.discount > 0 && <div className="tk-item"><span>Descuento</span><span>− {money(ticket.discount)}</span></div>}
              <div className="tk-item tk-total"><span>TOTAL</span><span>{money(ticket.total)}</span></div>
              <div className="tk-line">Pago: {ticket.payMethod}</div>
              <div className="tk-foot">¡Gracias por tu compra! 🍷</div>
            </div>
            <div className="vd-ticket-actions">
              <button className="btn btn-ghost" type="button" onClick={() => { setTicket(null); focusInput(); }}>Cerrar</button>
              <button className="btn btn-primary" type="button" onClick={() => window.print()}>Imprimir ticket</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
