import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://tienda.wecavagourmet.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/club`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE}/cuenta/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
