# We · Cava — Plataforma e-commerce

Tienda online + panel de administración + API, construida desde cero.
**Single-store** (la tienda de We) con arquitectura **extensible a multi-tenant** (revendible).

## Stack
- **Next.js 14** (App Router, TypeScript) — storefront + admin + API en una sola app
- **PostgreSQL** (Supabase) + **Prisma** (ORM/migraciones)
- **Supabase** Auth (panel) + Storage (fotos de productos)
- **Mercado Pago** — Checkout Pro (compras) + Suscripciones/preapproval (débito automático del Club)
- Deploy en **Netlify** (con `@netlify/plugin-nextjs`)

## Estructura
```
platform/
├── app/            # rutas: storefront (/), /tienda, /admin, /api/*
├── lib/            # prisma client, supabase, mercadopago, helpers
├── prisma/
│   ├── schema.prisma   # modelo de datos (Store, Product, Order, Subscription, ...)
│   └── seed.ts         # carga inicial desde los datos del sitio estático
└── netlify.toml
```

## Puesta en marcha (local)
1. **Crear el proyecto en Supabase** (gratis) → copiá las connection strings y las keys.
2. **Credenciales de Mercado Pago** → developers.mercadopago.com.
3. Copiá `.env.example` a `.env` y completá los valores.
4. Instalar y preparar la base:
   ```bash
   cd platform
   npm install
   npm run prisma:migrate      # crea las tablas
   npm run db:seed             # carga la tienda We + productos
   npm run dev                 # http://localhost:3000
   ```

## Deploy (Netlify)
- New site → del repo `we-landing`, **Base directory = `platform`**.
- Cargá las variables de entorno (las del `.env`) en Netlify.
- El `netlify.toml` ya tiene el build de Next.js.

## Roadmap
- [x] Fundación: esquema de datos, proyecto Next.js, seed
- [ ] Storefront (catálogo, filtros, carrito, ficha) leyendo de la DB
- [ ] Checkout Mercado Pago (tarjeta) + pedidos + webhooks
- [ ] Suscripciones (débito automático con tarjeta)
- [ ] Panel/admin (productos, pedidos, clientes, suscripciones, métricas)
- [ ] Multi-tenant + empaquetado para revender
