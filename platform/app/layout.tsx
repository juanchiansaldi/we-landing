import type { Metadata } from "next";
import "./globals.css";
import LogoDefs from "../components/LogoDefs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://tienda.wecavagourmet.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Cava · Tienda — We · Cava & Gourmet",
  description:
    "Tienda online de We · Cava & Gourmet. Vinos, espumantes, quesos, chocolates y más, con envío en Crespo. +18 · Consumo responsable.",
  themeColor: "#0d0a0a",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE,
    siteName: "We · Cava & Gourmet",
    title: "Cava · Tienda — We · Cava & Gourmet",
    description: "Vinos, espumantes, quesos y gourmet. Comprá online con envío en Crespo.",
    images: [{ url: "/assets/og.jpg", width: 1200, height: 630, alt: "We · Cava & Gourmet" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cava · Tienda — We · Cava & Gourmet",
    description: "Vinos, espumantes, quesos y gourmet. Comprá online con envío en Crespo.",
    images: ["/assets/og.jpg"],
  },
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
