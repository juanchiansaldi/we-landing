"use client";

import { usePathname, useRouter } from "next/navigation";

// v: true → visible también para el rol VENDEDOR. El resto es solo dueño/admin.
const NAV: { group: string; items: { href: string; label: string; icon: string; v?: boolean }[] }[] = [
  { group: "Tienda", items: [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/pedidos", label: "Pedidos", icon: "orders" },
    { href: "/admin/cupones", label: "Cupones", icon: "ticket" },
  ] },
  { group: "Local", items: [
    { href: "/admin/vender", label: "Vender", icon: "cart", v: true },
    { href: "/admin/ventas", label: "Ventas", icon: "receipt", v: true },
    { href: "/admin/caja", label: "Caja", icon: "wallet", v: true },
  ] },
  { group: "Inventario", items: [
    { href: "/admin/productos", label: "Productos", icon: "tag", v: true },
    { href: "/admin/stock", label: "Stock", icon: "layers", v: true },
    { href: "/admin/compras", label: "Compras", icon: "truck" },
    { href: "/admin/combos", label: "Combos", icon: "gift" },
    { href: "/admin/categorias", label: "Categorías", icon: "folder" },
    { href: "/admin/proveedores", label: "Proveedores", icon: "store" },
  ] },
  { group: "Datos", items: [
    { href: "/admin/clientes", label: "Clientes", icon: "users", v: true },
    { href: "/admin/usuarios", label: "Usuarios", icon: "badge" },
    { href: "/admin/reportes", label: "Reportes", icon: "chart" },
  ] },
  { group: "Ayuda", items: [
    { href: "/admin/manual", label: "Manual", icon: "book", v: true },
  ] },
];

function Icon({ n }: { n: string }) {
  const paths: Record<string, React.ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>,
    orders: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18M16 10a4 4 0 0 1-8 0" /></>,
    cart: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" /></>,
    receipt: <><path d="M5 2v20l2-1.2 2 1.2 2-1.2 2 1.2 2-1.2 2 1.2 2-1.2V2l-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2z" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
    wallet: <><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4z" /></>,
    tag: <><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1.2" /></>,
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></>,
    truck: <><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7" /><circle cx="5.5" cy="18.5" r="1.5" /><circle cx="18.5" cy="18.5" r="1.5" /></>,
    gift: <><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></>,
    folder: <><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></>,
    store: <><path d="M3 9 4 4h16l1 5M4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M3 9h18" /><path d="M9 21v-6h6v6" /></>,
    ticket: <><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z" /><path d="M14 5v14" strokeDasharray="2 3" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></>,
    badge: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M15 8h3M15 12h3M7 16h10" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
    power: <><path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[n]}
    </svg>
  );
}

const ROLE_LABEL: Record<string, string> = { OWNER: "Dueño", ADMIN: "Admin", VENDEDOR: "Vendedor" };

export default function AdminNav({ role = "OWNER", name = "Dueño" }: { role?: string; name?: string }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const isVendedor = role === "VENDEDOR";
  const groups = NAV
    .map((g) => ({ ...g, items: g.items.filter((it) => (isVendedor ? it.v : true)) }))
    .filter((g) => g.items.length);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="side">
      <a href={isVendedor ? "/admin/vender" : "/admin"} className="side-brand">
        <span className="side-logo"><svg viewBox="0 0 183.92 299"><use href="#we-iso" /></svg></span>
        <span className="side-brand-txt">
          <span className="side-word"><svg viewBox="0 0 520.10 261.99"><use href="#we-word" /></svg></span>
          <em>Gestión</em>
        </span>
      </a>

      <nav className="side-nav">
        {groups.map((g) => (
          <div className="side-group" key={g.group}>
            <p className="side-group-label">{g.group}</p>
            {g.items.map((it) => {
              const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
              return (
                <a key={it.href} href={it.href} className={`side-link${active ? " active" : ""}`}>
                  <Icon n={it.icon} />
                  <span>{it.label}</span>
                  {active && <span className="side-dot" />}
                </a>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <a href="/" target="_blank" className="side-store-link">Ver tienda ↗</a>
        <button className="side-user" type="button" onClick={logout} title="Cerrar sesión">
          <span className="side-avatar">{initial}</span>
          <span className="side-user-info"><b>{name}</b><em>{ROLE_LABEL[role] || role} · cerrar sesión</em></span>
          <Icon n="power" />
        </button>
      </div>
    </aside>
  );
}
