"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSale } from "../app/pos/actions";

type P = {
  id: string; name: string; sku: string; quickCode: string; barcode: string; brand: string;
  price: number; promo: number | null; priceCase: number | null; unitsPerCase: number; stock: number;
};
type Unit = "BOTELLA" | "CAJA";
type Line = { p: P; unit: Unit; qty: number };
type Ticket = {
  code: string;
  items: { name: string; unit: string; qty: number; unitPrice: number; subtotal: number }[];
  subtotal: number; discount: number; total: number; payMethod: string;
};

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const unitPrice = (p: P, unit: Unit) =>
  unit === "CAJA" ? (p.priceCase ?? p.price * p.unitsPerCase) : (p.promo ?? p.price);

export default function Vender({ catalog, store }: { catalog: P[]; store: { name: string } }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [pay, setPay] = useState<"EFECTIVO" | "TARJETA" | "TRANSFERENCIA">("EFECTIVO");
  const [cashGiven, setCashGiven] = useState("");
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [printTicket, setPrintTicket] = useState(false); // apagado por default: no se factura todo
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => inputRef.current?.focus();
  useEffect(() => { focusInput(); }, []);

  const byCode = useMemo(() => {
    const m = new Map<string, P>();
    for (const p of catalog) {
      if (p.barcode) m.set(p.barcode.toLowerCase(), p);
      if (p.quickCode) m.set(p.quickCode.toLowerCase(), p);
      if (p.sku) m.set(p.sku.toLowerCase(), p);
    }
    return m;
  }, [catalog]);

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return catalog
      .filter((p) => `${p.name} ${p.brand} ${p.sku} ${p.quickCode} ${p.barcode}`.toLowerCase().includes(t))
      .slice(0, 8);
  }, [q, catalog]);

  function addToCart(p: P, unit: Unit = "BOTELLA") {
    setCart((c) => {
      const i = c.findIndex((l) => l.p.id === p.id && l.unit === unit);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { p, unit, qty: 1 }];
    });
    setMsg(`✓ ${p.name}`);
    setTimeout(() => setMsg((m) => (m === `✓ ${p.name}` ? null : m)), 1200);
  }

  function onScan(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    const hit = byCode.get(v.toLowerCase());
    if (hit) { addToCart(hit); setQ(""); return; }
    if (results.length === 1) { addToCart(results[0]); setQ(""); return; }
    // si no hay match exacto, queda la búsqueda mostrada
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

  function cobrar() {
    if (!cart.length || pending) return;
    start(async () => {
      const res = await createSale({
        items: cart.map((l) => ({ productId: l.p.id, unit: l.unit, qty: l.qty })),
        discount,
        payMethod: pay,
      });
      if (res.ok && res.ticket) {
        const t = res.ticket as Ticket;
        setCart([]); setDiscount(0); setCashGiven(""); setQ("");
        router.refresh();
        if (printTicket) {
          // solo cuando el vendedor lo pidió: mostramos el ticket y abrimos impresión
          setTicket(t);
          setTimeout(() => window.print(), 350);
        } else {
          setMsg(`✓ Venta #${t.code} registrada`);
          setTimeout(() => setMsg((m) => (m === `✓ Venta #${t.code} registrada` ? null : m)), 2500);
          focusInput();
        }
      } else {
        alert(res.error || "No se pudo registrar la venta");
      }
    });
  }

  return (
    <div className="vender">
      <div className="vender-grid">
        {/* IZQUIERDA: escáner + búsqueda */}
        <div className="vd-left">
          <h1 className="serif" style={{ fontSize: "1.5rem", marginBottom: 12 }}>Vender</h1>
          <div className="vd-scan">
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onScan}
              placeholder="Escaneá el código o buscá por nombre…"
              autoComplete="off"
            />
          </div>
          {msg && <div className="vd-msg">{msg}</div>}

          {results.length > 0 && (
            <div className="vd-results">
              {results.map((p) => (
                <button key={p.id} type="button" className="vd-res" onClick={() => { addToCart(p); setQ(""); focusInput(); }}>
                  <div className="vd-res-name">
                    <b>{p.quickCode && <span className="vd-code">{p.quickCode}</span>}{p.name}</b>
                    {p.brand && <em>{p.brand}</em>}
                  </div>
                  <div className="vd-res-meta">
                    <span>{money(p.promo ?? p.price)}</span>
                    <span className={p.stock <= 0 ? "vd-nost" : "vd-st"}>stock {p.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
          {!q && (
            <p className="pos-muted" style={{ marginTop: 14 }}>
              Apuntá el lector al código de barras y se agrega solo. Para los que no tienen código, buscalos por nombre.
            </p>
          )}
        </div>

        {/* DERECHA: carrito + cobro */}
        <div className="vd-right">
          <div className="vd-cart">
            {cart.length === 0 ? (
              <div className="vd-empty">Carrito vacío. Escaneá un producto.</div>
            ) : (
              cart.map((l, idx) => (
                <div className="vd-item" key={`${l.p.id}-${l.unit}`}>
                  <div className="vd-item-main">
                    <b>{l.p.name}</b>
                    <button type="button" className={`vd-unit ${l.unit === "CAJA" ? "caja" : ""}`} onClick={() => toggleUnit(idx)}>
                      {l.unit === "CAJA" ? `Caja x${l.p.unitsPerCase}` : "Botella"}
                    </button>
                    <span className="vd-item-price">{money(unitPrice(l.p, l.unit))} c/u</span>
                  </div>
                  <div className="vd-item-r">
                    <div className="qty">
                      <button type="button" onClick={() => setQty(idx, l.qty - 1)}>−</button>
                      <span>{l.qty}</span>
                      <button type="button" onClick={() => setQty(idx, l.qty + 1)}>+</button>
                    </div>
                    <b className="vd-item-sub">{money(unitPrice(l.p, l.unit) * l.qty)}</b>
                    <button type="button" className="vd-rm" onClick={() => setQty(idx, 0)}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="vd-foot">
            <div className="vd-row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
            <div className="vd-row">
              <span>Descuento</span>
              <input className="vd-disc" type="number" min="0" value={discount || ""} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} placeholder="0" />
            </div>
            <div className="vd-row vd-total"><span>Total</span><b>{money(total)}</b></div>

            <div className="vd-pays">
              {(["EFECTIVO", "TARJETA", "TRANSFERENCIA"] as const).map((m) => (
                <button key={m} type="button" className={pay === m ? "on" : ""} onClick={() => setPay(m)}>
                  {m === "EFECTIVO" ? "Efectivo" : m === "TARJETA" ? "Tarjeta" : "Transfer."}
                </button>
              ))}
            </div>
            {pay === "EFECTIVO" && cart.length > 0 && (
              <div className="vd-row">
                <span>Paga con</span>
                <input className="vd-disc" type="number" min="0" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)} placeholder={String(total)} />
                {change > 0 && <b style={{ color: "#3fb950" }}>Vuelto {money(change)}</b>}
              </div>
            )}

            <label className="vd-print">
              <input type="checkbox" checked={printTicket} onChange={(e) => setPrintTicket(e.target.checked)} />
              <span>Imprimir comprobante</span>
              <em>{printTicket ? "se imprime al cobrar" : "no se imprime"}</em>
            </label>

            <button className="btn btn-primary vd-cobrar" type="button" onClick={cobrar} disabled={!cart.length || pending}>
              {pending ? "Registrando…" : `Cobrar ${money(total)}`}
            </button>
          </div>
        </div>
      </div>

      {/* TICKET */}
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
