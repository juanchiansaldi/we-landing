# We · Cava & Gourmet — contexto del proyecto

Vinería + tienda gourmet en **Crespo, Entre Ríos, Argentina**. Todo en **español rioplatense**.
Tres piezas, un mismo dueño:

1. **Landing** (`index.html`, `cava.html`) → estático, **GitHub Pages** en **wecavagourmet.com**. Animación de scroll con GSAP/ScrollTrigger/Lenis + canvas de 193 frames WebP. Rama **`main`**.
2. **Tienda online + Admin + POS** → app **Next.js 14 (App Router)** en `platform/`, deploy en **Vercel** (`tienda.wecavagourmet.com`). Rama **`platform`**.
3. **POS / gestión del local** → vive DENTRO de la app Next, en `/admin` (no es Python ni local). **Comparte productos y stock con la tienda online** (un solo inventario).

## Stack (platform/)
- Next.js 14 App Router (TS) · **Prisma** + **Supabase Postgres** (proyecto `dxldkijtpcnrpkpyxuxt`) · Supabase Auth (clientes) · Supabase Storage (fotos/comprobantes) · **Mercado Pago** (Checkout Pro + suscripciones) · SheetJS (`xlsx`) para Excel.
- Fuentes Spectral + DM Sans por `<link>` (no next/font). Rojo de marca `#F12C36`, fondo oscuro `#0d0a0a`.

## Reglas / convenciones
- **Plata = pesos enteros** (NO centavos). `price` en Product = precio botella.
- **Stock en botellas**; una caja descuenta `unitsPerCase` botellas.
- **SKU interno**: `WE-000123` (se autogenera). Código de barras de fábrica = `barcode` (EAN).
- Todo scopeado por `storeId` (preparado para multi-tenant).
- Toda mutación de stock escribe en `StockMovement` (ledger auditable) + actualiza `Product.stock` en la misma transacción.
- **Auth**: el panel `/admin` y el POS se protegen con `isAuthed()` (cookie firmada, password en `ADMIN_PASSWORD`). Login de clientes de la tienda = Supabase Auth. Los vendedores POS (`PosUser`, password scrypt) hoy NO tienen login propio: se elige un "vendedor activo" (cookie `we_pos_user`) que estampa `posUserId` en cada venta; el gate sigue siendo el password de admin.
- Componentes cliente escapan con React (sin `dangerouslySetInnerHTML` salvo `LogoDefs`, que es estático).

## Cómo se deploya (importante)
- **Plataforma**: por CLI, desde `platform/`: `vercel deploy --prod --yes --token "$VERCEL_TOKEN"` (token en `platform/.env`). Las env vars de producción ya están cargadas en Vercel.
- **Landing**: commit + push a `main` → GitHub Pages.
- **Cambios de schema**: `npx prisma db push` (NO migrate, por el pooler de Supabase). Host del pooler: `aws-1-us-east-1.pooler.supabase.com`.
- **`.env` y `platform/.env` NUNCA se commitean** (gitignoreados). No pegar secretos en commits.

## Estructura de /admin (centro unificado)
`/admin` (inicio + gráfico) · `/admin/vender` · `/admin/caja` · `/admin/productos` · `/admin/stock` · `/admin/compras` · `/admin/categorias` · `/admin/proveedores` · `/admin/combos` · `/admin/clientes` · `/admin/pedidos` (con marcar pagado + comprobantes) · `/admin/cupones` · `/admin/usuarios` · `/admin/reportes`.

## Fases del POS
1 Catálogo+Import ✅ · 2 Vender (POS) ✅ · 3 Stock ✅ (ajustes + ledger de movimientos) · 4 Reportes ✅ · 5 Compras ✅ (ingreso de mercadería, suma stock y actualiza costo) · 6 Clientes/CC ✅ (cuenta corriente: fiar/pagar + ledger; venta con pago `CUENTA_CORRIENTE`) · 7 Usuarios/roles ✅ (PosUser con password scrypt; vendedor activo por cookie `we_pos_user` estampa las ventas) · 8 Caja ✅ (apertura/cierre + arqueo; las ventas se estampan con la caja abierta) · 9 Combos/kits ✅ (costo combinado + margen %) · 10 Facturación ARCA (futuro, NO construir hasta avisar; hoy tickets internos no fiscales).

## Gotchas
- Enums de Prisma: cada valor en su línea (no `{ A B }`).
- `next/font` se sacó a propósito (rompía la paridad con cava.html); usar `<link>` + `'Spectral'`/`'DM Sans'`.
- Comprobantes de pago → bucket **privado** + URL firmada (no público como las fotos de producto).
- MP está en **sandbox** (usuario de prueba `APP_USR-…` con tag test_user). Tarjetas de prueba: nombre `APRO` = aprobado.
