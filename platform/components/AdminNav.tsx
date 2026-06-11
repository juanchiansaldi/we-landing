"use client";

import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Inicio" },
  { href: "/admin/vender", label: "Vender" },
  { href: "/admin/caja", label: "Caja" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/stock", label: "Stock" },
  { href: "/admin/compras", label: "Compras" },
  { href: "/admin/categorias", label: "Categorías" },
  { href: "/admin/proveedores", label: "Proveedores" },
  { href: "/admin/combos", label: "Combos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/reportes", label: "Reportes" },
];

const SOON: string[] = [];

export default function AdminNav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className="pos-nav">
      <span className="pos-logo">We · Administración</span>
      <div className="pos-links">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <a key={l.href} href={l.href} className={active ? "active" : ""}>{l.label}</a>
          );
        })}
        {SOON.map((s) => <span key={s} className="pos-soon">{s}</span>)}
      </div>
      <a className="pos-exit" href="/" target="_blank">Ver tienda ↗</a>
      <button className="pos-exit" type="button" onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
    </nav>
  );
}
