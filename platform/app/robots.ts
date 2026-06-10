import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
  ? process.env.NEXT_PUBLIC_SITE_URL
  : "https://tienda.wecavagourmet.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/cuenta", "/api/", "/checkout/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
