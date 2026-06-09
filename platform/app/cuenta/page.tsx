import { redirect } from "next/navigation";
import { prisma } from "../../lib/prisma";
import { currentCustomer } from "../../lib/customer";
import { fmt } from "../../lib/format";
import AddressManager, { type Addr } from "../../components/AddressManager";
import LogoutButton from "../../components/LogoutButton";

export const dynamic = "force-dynamic";

const PAY_LABEL: Record<string, string> = {
  PAID: "Pagado",
  PENDING: "Pendiente",
  FAILED: "Rechazado",
  REFUNDED: "Reintegrado",
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: { add?: string };
}) {
  const customer = await currentCustomer();
  if (!customer) redirect("/cuenta/login?next=/cuenta");

  const [addresses, orders] = await Promise.all([
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
          <a className="btn btn-ghost" href="https://wecavagourmet.com/#club" target="_blank">Club We</a>
          <LogoutButton />
        </div>
      </header>

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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
