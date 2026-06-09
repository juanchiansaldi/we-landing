import type { Metadata } from "next";
import "./globals.css";
import LogoDefs from "../components/LogoDefs";

export const metadata: Metadata = {
  title: "Cava · Tienda — We · Cava & Gourmet",
  description:
    "Tienda online de We · Cava & Gourmet. Vinos, espumantes, quesos, chocolates y más, con envío en Crespo. +18 · Consumo responsable.",
  themeColor: "#0d0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Spectral:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300..600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LogoDefs />
        {children}
      </body>
    </html>
  );
}
