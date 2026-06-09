import type { Metadata } from "next";
import { Spectral, DM_Sans } from "next/font/google";
import "./globals.css";

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-spectral",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dmsans",
  display: "swap",
});

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
    <html lang="es" className={`${spectral.variable} ${dmSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
