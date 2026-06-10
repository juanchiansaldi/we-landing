"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "../lib/format";
import { updateOrderStatus, setOrderPaid, setOrderReceipt } from "../app/admin/actions";

type Ship = {
  recipient?: string; phone?: string; street?: string; number?: string;
  city?: string; province?: string; zip?: string; notes?: string;
} | null;

type Order = {
  id: string;
  code: string;
  date: string;
  customer: { name: string | null; email: string } | null;
  items: { name: string; qty: number; price: number }[];
  total: number;
  paymentStatus: string;
  paymentMethod: string | null;
  status: string;
  ship: Ship;
  giftNote: string | null;
  notes: string | null;
  receiptUrl: string | null;
};

const STATUSES = [
  ["PENDING", "Pendiente"],
  ["CONFIRMED", "Confirmado"],
  ["PREPARING", "Preparando"],
  ["SHIPPED", "Enviado"],
  ["DELIVERED", "Entregado"],
  ["CANCELLED", "Cancelado"],
] as const;

const PAY_LABEL: Record<string, string> = {
  PAID: "Pagado", PENDING: "Pendiente", FAILED: "Rechazado", REFUNDED: "Reintegrado",
};

export default function AdminOrders({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [filter, setFilter] = useState<"todos" | "pendiente" | "pagado">("todos");
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function changeStatus(id: string, status: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    start(async () => { await updateOrderStatus(fd); router.refresh(); });
  }

  function togglePaid(id: string, paid: boolean) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("paid", String(paid));
    start(async () => { await setOrderPaid(fd); router.refresh(); });
  }

  async function uploadReceipt(id: string, file: File) {
    setUploadingId(id);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/receipt", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) {
        const f2 = new FormData();
        f2.set("id", id);
        f2.set("url", j.url);
        await setOrderReceipt(f2);
        router.refresh();
      } else {
        alert(j.error || "No se pudo subir el comprobante");
      }
    } catch {
      alert("No se pudo subir el comprobante");
    } finally {
      setUploadingId(null);
    }
  }

  const shown = orders.filter((o) =>
    filter === "todos" ? true : filter === "pendiente" ? o.paymentStatus !== "PAID" : o.paymentStatus === "PAID"
  );
  const pendientesPago = orders.filter((o) => o.paymentStatus !== "PAID").length;

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">Administración</span>
          <h1 className="serif">Pedidos</h1>
        </div>
      </header>

      <div className="admin-stats">
        <span><b>{orders.length}</b> pedidos</span>
        <span><b>{orders.filter((o) => o.paymentStatus === "PAID").length}</b> pagados</span>
        <span><b>{pendientesPago}</b> esperando pago</span>
      </div>

      <div className="ord-filter">
        {(["todos", "pendiente", "pagado"] as const).map((f) => (
          <button key={f} type="button" className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>
            {f === "todos" ? "Todos" : f === "pendiente" ? "Esperando pago" : "Pagados"}
          </button>
        ))}
      </div>

      {shown.length === 0 && <div className="admin-empty">No hay pedidos en esta vista.</div>}

      <div className="orders-list">
        {shown.map((o) => (
          <div className="order-card" key={o.id}>
            <button className="order-head" type="button" onClick={() => setOpen(open === o.id ? null : o.id)}>
              <div className="order-meta">
                <b>#{o.code}</b>
                <span className="admin-muted">{o.date}</span>
              </div>
              <div className="order-cust">
                {o.customer ? (o.customer.name || o.customer.email) : "Sin cuenta"}
              </div>
              <span className={`pay-badge pay-${o.paymentStatus.toLowerCase()}`}>
                {PAY_LABEL[o.paymentStatus] || o.paymentStatus}
              </span>
              <b className="order-total">{fmt(o.total)}</b>
            </button>

            {open === o.id && (
              <div className="order-detail">
                <div className="order-cols">
                  <div>
                    <h4>Productos</h4>
                    <ul className="order-items-full">
                      {o.items.map((i, idx) => (
                        <li key={idx}>
                          <span>{i.qty}× {i.name}</span>
                          <span>{fmt(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Envío</h4>
                    {o.ship ? (
                      <address className="order-ship">
                        {o.ship.recipient && <span>{o.ship.recipient}</span>}
                        <span>{o.ship.street} {o.ship.number}</span>
                        <span>{o.ship.city}, {o.ship.province}{o.ship.zip ? ` (${o.ship.zip})` : ""}</span>
                        {o.ship.phone && <span>Tel: {o.ship.phone}</span>}
                        {o.ship.notes && <span className="admin-muted">{o.ship.notes}</span>}
                      </address>
                    ) : (
                      <p className="admin-muted">Sin dirección.</p>
                    )}
                    {o.customer && <p className="admin-muted" style={{ marginTop: 8 }}>{o.customer.email}</p>}
                    {o.giftNote && <p style={{ marginTop: 8, color: "var(--red)" }}>🎁 {o.giftNote}</p>}
                    {o.notes && <p className="admin-muted" style={{ marginTop: 6 }}>{o.notes}</p>}
                  </div>
                </div>

                <div className="order-pay-row">
                  <div>
                    <span className="admin-muted">Pago{o.paymentMethod ? ` · ${o.paymentMethod}` : ""}</span>
                    <div className="order-pay-controls">
                      {o.paymentStatus === "PAID" ? (
                        <button type="button" className="op-undo" onClick={() => togglePaid(o.id, false)} disabled={pending}>
                          ✓ Pagado · marcar pendiente
                        </button>
                      ) : (
                        <button type="button" className="op-paid" onClick={() => togglePaid(o.id, true)} disabled={pending}>
                          Marcar como pagado
                        </button>
                      )}
                      <label className="op-receipt">
                        {uploadingId === o.id ? "Subiendo…" : o.receiptUrl ? "Cambiar comprobante" : "Subir comprobante"}
                        <input type="file" accept="image/*,application/pdf" hidden
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReceipt(o.id, f); e.target.value = ""; }} />
                      </label>
                      {o.receiptUrl && <a className="op-view" href={o.receiptUrl} target="_blank" rel="noopener">Ver comprobante ↗</a>}
                    </div>
                  </div>
                </div>

                <div className="order-status-row">
                  <span className="admin-muted">Estado del pedido</span>
                  <select value={o.status} onChange={(e) => changeStatus(o.id, e.target.value)} disabled={pending}>
                    {STATUSES.map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
