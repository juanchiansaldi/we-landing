import { prisma } from "../../lib/prisma";
import { fmt } from "../../lib/format";
import { currentCustomer } from "../../lib/customer";
import SubscribeButton from "../../components/SubscribeButton";

export const dynamic = "force-dynamic";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export default async function ClubPage() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  const plans = store
    ? await prisma.plan.findMany({ where: { storeId: store.id, active: true }, orderBy: { price: "asc" } })
    : [];

  const customer = await currentCustomer();
  const activeSub = customer
    ? await prisma.subscription.findFirst({ where: { customerId: customer.id, status: "ACTIVE" } })
    : null;

  return (
    <>
      <nav>
        <a className="nav-logo" href="https://wecavagourmet.com">{store?.name || "We · Cava"}</a>
        <div className="nav-right">
          <div className="nav-links">
            <a href="/">Tienda</a>
            <a href="#" className="active">Club We</a>
            <a href="/cuenta">Mi cuenta</a>
          </div>
        </div>
      </nav>

      <header className="shop">
        <div className="wrap" style={{ textAlign: "center", maxWidth: 760, marginInline: "auto" }}>
          <span className="eyebrow">Club We</span>
          <h1 style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 300, marginTop: 6 }}>
            Recibí lo bueno <b style={{ fontWeight: 600 }}>todos los meses</b>
          </h1>
          <p style={{ color: "var(--gray)", marginTop: 10 }}>
            Una suscripción para descubrir sin pensarlo. Se cobra solo todos los meses por Mercado Pago.
            Cancelás cuando quieras, sin permanencia.
          </p>
        </div>
      </header>

      <div className="wrap" style={{ paddingBottom: 90 }}>
        {activeSub && (
          <p className="club-active-note">
            Ya tenés una suscripción activa. La gestionás desde <a href="/cuenta">Mi cuenta</a>.
          </p>
        )}
        <div className="plans">
          {plans.map((p) => {
            const rec = p.slug === "sibarita";
            const feats: string[] = Array.isArray(p.features) ? (p.features as string[]) : [];
            return (
              <div className={`plan${rec ? " rec" : ""}`} key={p.id}>
                {rec && <span className="plan-tag">Recomendado</span>}
                <div className="plan-name">{p.name}</div>
                <div className="plan-price">{fmt(p.price)}<small>/mes</small></div>
                <ul className="plan-feats">
                  {feats.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <SubscribeButton plan={p.slug} recommended={rec} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
