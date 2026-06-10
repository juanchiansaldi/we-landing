# platform/ — app Next.js (tienda + admin + POS)

Ver el `CLAUDE.md` de la raíz para el contexto completo del proyecto.

App Next.js 14 (App Router, TS) en Vercel. Prisma + Supabase Postgres. Tienda online en `/`, centro de administración + POS en `/admin`, login de clientes en `/cuenta`.

## Comandos
- `npm run build` — build (corre `prisma generate && next build`).
- `npm run dev` — dev local (localhost:3000).
- `npx prisma db push` — aplica cambios de schema a Supabase (no usar migrate por el pooler).
- Deploy: `vercel deploy --prod --yes --token "$VERCEL_TOKEN"` (token en `.env`).

## Reglas
- Plata en **pesos enteros**. Stock en **botellas** (caja = `unitsPerCase`).
- Toda mutación de stock → `StockMovement` + `Product.stock` en la misma transacción.
- `/admin` y POS gateados con `isAuthed()` (cookie firmada). Clientes = Supabase Auth.
- `.env` NO se commitea. Secretos solo ahí.
- Enums Prisma: un valor por línea.
