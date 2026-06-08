import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "We · Cava & Gourmet",
  description:
    "Vinería y tienda gourmet en Crespo. Tienda online: vinos, espumantes, quesos y gourmet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
