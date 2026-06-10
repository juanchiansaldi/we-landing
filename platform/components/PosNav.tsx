"use client";

import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/pos", label: "Inicio" },
  { href: "/pos/productos", label: "Productos" },
  { href: "/pos/categorias", label: "Categorías" },
  { href: "/pos/proveedores", label: "Proveedores" },
];

const SOON = ["Vender", "Stock", "Reportes", "Caja"];

export default function PosNav() {
  const path = usePathname();
  return (
    <nav className="pos-nav">
      <span className="pos-logo">We · Gestión</span>
      <div className="pos-links">
        {LINKS.map((l) => {
          const active = l.href === "/pos" ? path === "/pos" : path.startsWith(l.href);
          return (
            <a key={l.href} href={l.href} className={active ? "active" : ""}>
              {l.label}
            </a>
          );
        })}
        {SOON.map((s) => (
          <span key={s} className="pos-soon">{s}</span>
        ))}
      </div>
      <a className="pos-exit" href="/admin">← Panel web</a>
    </nav>
  );
}
