import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { currentCustomer } from "../../lib/customer";
import { fmt } from "../../lib/format";
import AddressManager, { type Addr } from "../../components/AddressManager";
import LogoutButton from "../../components/LogoutButton";
import RepeatOrderButton from "../../components/RepeatOrderButton";
import OrderWhatsAppButton from "../../components/OrderWhatsAppButton";
import CancelSubButton from "../../components/CancelSubButton";
import ProfileEditor from "../../components/ProfileEditor";
import { getStore } from "../../lib/pos";
import { syncPendingForCustomer } from "../../lib/subscriptions";

export const dynamic = "force-dynamic";

const PAY_LABEL: Record<string, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Rechazado",
  REFUNDED: "Reintegrado",
};

const SUB_LABEL: Record<string, string> = {
  ACTIVE: "Activa",
  PENDING: "Pendiente de pago",
  PAUSED: "Pausada",
  CANCELLED: "Cancelada",
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: { add?: string; sub?: string };
}) {
  const customer = await currentCustomer();
  if (!customer) redirect("/cuenta/login?next=/cuenta");

  // si vuelve del checkout de suscripción, sincronizamos el estado con MP
  if (searchParams.sub === "ok") {
    await syncPendingForCustomer(customer.id);
  }

  const store = await getStore();

  const [addresses, orders, subs] = await Promise.all([
    prisma.address.findMany({
      where: { customerId: customer.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
    prisma.order.findMany({
      where: { customerId: customer.id },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.subscription.findMany({
      where: { customerId: customer.id, status: { in: ["ACTIVE", "PENDING", "PAUSED"] } },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const addr: Addr[] = addresses.map((a) => ({
    id: a.id, label: a.label, recipient: a.recipient, phone: a.phone,
    street: a.street, number: a.number, city: a.city, province: a.province,
    zip: a.zip, notes: a.notes, isDefault: a.isDefault,
  }));

  return (
    <div className="admin-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">Mi cuenta</span>
          <h1 className="serif">Hola, {customer.name || customer.email.split("@")[0]}</h1>
          <p className="admin-muted">{customer.email}</p>
        </div>
        <div className="admin-top-actions">
          <a className="btn btn-ghost" href="/">Seguir comprando</a>
          <a className="btn btn-ghost" href="/club">Club We</a>
          <ProfileEditor name={customer.name || ""} phone={customer.phone || ""} />
          <LogoutButton />
        </div>
      </header>

      <section className="acc-section">
        <div className="acc-section-head">
          <h2 className="serif">Mi Club We</h2>
          <a className="btn btn-ghost" href="/club">Ver planes</a>
        </div>
        {subs.length === 0 ? (
          <p className="admin-muted">
            No tenés una suscripción activa. <a href="/club" style={{ color: "var(--red)" }}>Sumate al Club We</a> y recibí vino todos los meses.
          </p>
        ) : (
          <div className="orders-list">
            {subs.map((s) => (
              <div className="order-row" key={s.id}>
                <div className="order-meta">
                  <b>{s.plan.name}</b>
                  <span className="admin-muted">Débito automático mensual</span>
                </div>
                <div className="order-items-mini">{fmt(s.plan.price)} / mes</div>
                <div className="order-right">
                  <span className={`pay-badge pay-${s.status === "ACTIVE" ? "paid" : s.status === "PENDING" ? "pending" : "refunded"}`}>
                    {SUB_LABEL[s.status] || s.status}
                  </span>
                  <CancelSubButton subId={s.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AddressManager addresses={addr} openNew={searchParams.add === "1"} />

      <section className="acc-section">
        <div className="acc-section-head">
          <h2 className="serif">Mis pedidos</h2>
        </div>
        {orders.length === 0 ? (
          <p className="admin-muted">Todavía no hiciste ningún pedido.</p>
        ) : (
          <div className="orders-list">
            {orders.map((o) => (
              <div className="order-row" key={o.id}>
                <div className="order-meta">
                  <b>#{o.id.slice(-6).toUpperCase()}</b>
                  <span className="admin-muted">
                    {new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(o.createdAt)}
                  </span>
                </div>
                <div className="order-items-mini">
                  {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                </div>
                <div className="order-right">
                  <span className={`pay-badge pay-${o.paymentStatus.toLowerCase()}`}>
                    {PAY_LABEL[o.paymentStatus] || o.paymentStatus}
                  </span>
                  <b>{fmt(o.total)}</b>
                  <OrderWhatsAppButton
                    phone={store.whatsapp}
                    storeName={store.name}
                    code={o.id.slice(-6).toUpperCase()}
                    items={o.items.map((i) => ({ qty: i.qty, name: i.name }))}
                    total={o.total}
                    pending={o.paymentStatus !== "PAID"}
                  />
                  <RepeatOrderButton
                    cart={Object.fromEntries(
                      o.items.filter((i) => i.productId).map((i) => [i.productId as string, i.qty])
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
