/** @type {import('next').NextConfig} */

const csp = [
  "default-src 'self'",
  "img-src 'self' https://*.supabase.co data: blob:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co https://api.mercadopago.com",
  "frame-src https://*.mercadopago.com https://*.mercadolibre.com",
  "form-action 'self' https://*.mercadopago.com",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // dominios desde donde se sirven imágenes de producto (Supabase Storage, etc.)
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async redirects() {
    // el POS se unificó dentro de /admin
    return [
      { source: "/pos", destination: "/admin", permanent: false },
      { source: "/pos/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
