"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmt } from "../lib/format";
import { updateOrderStatus } from "../app/admin/actions";

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

  function changeStatus(id: string, status: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", status);
    start(async () => {
      await updateOrderStatus(fd);
      router.refresh();
    });
  }

  const pendientes = orders.filter((o) => o.paymentStatus === "PAID" && o.status === "PENDING").length;

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
        <span><b>{pendientes}</b> pagados a preparar</span>
      </div>

      {orders.length === 0 && <div className="admin-empty">Todavía no entraron pedidos.</div>}

      <div className="orders-list">
        {orders.map((o) => (
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
                <div className="order-status-row">
                  <span className="admin-muted">Estado del pedido</span>
                  <select
                    value={o.status}
                    onChange={(e) => changeStatus(o.id, e.target.value)}
                    disabled={pending}
                  >
                    {STATUSES.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
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
