import { getStorefront } from "../lib/store";
import { currentCustomer } from "../lib/customer";
import Storefront from "../components/Storefront";

// Siempre leer datos frescos de la base (no cachear el catálogo en build)
export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, customer] = await Promise.all([getStorefront(), currentCustomer()]);

  if (!data) {
    return (
      <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 40, textAlign: "center" }}>
        <div>
          <h1 style={{ fontWeight: 300 }}>Tienda no encontrada</h1>
          <p style={{ color: "var(--gray)", marginTop: 8 }}>
            No hay una tienda con ese slug en la base. Corré el seed de Prisma.
          </p>
        </div>
      </main>
    );
  }

  return (
    <Storefront
      store={data.store}
      products={data.products}
      cats={data.cats}
      loggedIn={!!customer}
      me={customer ? { name: customer.name || "", email: customer.email, phone: customer.phone || "" } : null}
    />
  );
}
