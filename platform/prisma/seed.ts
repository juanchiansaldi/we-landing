/**
 * Seed: carga la tienda "We" en la base usando los datos que ya teníamos
 * en el sitio estático (../assets/data/products.json y settings.json).
 *
 *   npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

function readJson(rel: string) {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), "utf8"));
}

const PLANS = [
  { slug: "iniciado", name: "Iniciado", price: 14900, features: ["2 botellas curadas por mes", "Ficha de cata de cada vino", "10% off en toda la tienda"] },
  { slug: "sibarita", name: "Sibarita", price: 24900, features: ["3 botellas + 1 producto gourmet", "15% off en toda la tienda", "Acceso a catas presenciales", "Envío sin cargo en Crespo"] },
  { slug: "coleccionista", name: "Coleccionista", price: 44900, features: ["4 botellas premium & ediciones limitadas", "20% off + acceso anticipado", "Cata privada trimestral", "Asesoría personal por WhatsApp"] },
];

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function main() {
  const settings = readJson("../assets/data/settings.json");
  const productsFile = readJson("../assets/data/products.json");
  const products = productsFile.products ?? productsFile;

  // 1) Tienda
  const store = await prisma.store.upsert({
    where: { slug: "we" },
    update: {},
    create: {
      slug: "we",
      name: settings.titular ?? "We · Cava & Gourmet",
      domain: "wecavagourmet.com",
      whatsapp: settings.whatsapp,
      alias: settings.alias,
      titular: settings.titular,
      shipNote: settings.envioNota,
    },
  });

  // 2) Categorías
  const cats: string[] = settings.cats ?? [];
  const catMap: Record<string, string> = {};
  for (let i = 0; i < cats.length; i++) {
    const c = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: slugify(cats[i]) } },
      update: { name: cats[i], order: i },
      create: { storeId: store.id, name: cats[i], slug: slugify(cats[i]), order: i },
    });
    catMap[cats[i]] = c.id;
  }

  // 3) Planes del Club
  for (const p of PLANS) {
    await prisma.plan.upsert({
      where: { storeId_slug: { storeId: store.id, slug: p.slug } },
      update: { name: p.name, price: p.price, features: p.features },
      create: { storeId: store.id, slug: p.slug, name: p.name, price: p.price, features: p.features },
    });
  }

  // 4) Productos
  for (const p of products) {
    const slug = p.id || slugify(p.name);
    const product = await prisma.product.upsert({
      where: { storeId_slug: { storeId: store.id, slug } },
      update: {
        name: p.name, brand: p.brand, price: p.price, promoPrice: p.promo ?? null,
        shortDesc: p.notes ?? null, description: p.desc ?? null, stock: p.stock ? 50 : 0,
        isNew: !!p.nuevo, active: true, meta: p.meta ?? null,
        categoryId: catMap[p.cat] ?? null,
      },
      create: {
        storeId: store.id, slug, name: p.name, brand: p.brand, price: p.price,
        promoPrice: p.promo ?? null, shortDesc: p.notes ?? null, description: p.desc ?? null,
        stock: p.stock ? 50 : 0, isNew: !!p.nuevo, meta: p.meta ?? null,
        categoryId: catMap[p.cat] ?? null,
      },
    });
    if (p.img) {
      const exists = await prisma.productImage.findFirst({ where: { productId: product.id } });
      if (!exists) await prisma.productImage.create({ data: { productId: product.id, url: p.img, order: 0 } });
    }
  }

  console.log(`Seed OK → tienda "${store.name}", ${cats.length} categorías, ${PLANS.length} planes, ${products.length} productos.`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
