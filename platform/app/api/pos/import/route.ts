import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { isAuthed } from "../../../../lib/auth";
import { rowToFields } from "../../../../lib/posExcel";
import { nextSku, slugify } from "../../../../lib/pos";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });

  const storeRow = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!storeRow) return NextResponse.json({ error: "Tienda no encontrada" }, { status: 500 });
  const store = storeRow;

  let rows: any[] = [];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
  } catch {
    return NextResponse.json({ error: "No se pudo leer el Excel" }, { status: 400 });
  }

  // mapa de categorías por nombre (creamos las que falten)
  const cats = await prisma.category.findMany({ where: { storeId: store.id } });
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
  async function resolveCat(name: string): Promise<string | null> {
    const n = name.trim();
    if (!n) return null;
    const hit = catByName.get(n.toLowerCase());
    if (hit) return hit;
    const created = await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: slugify(n) } },
      update: {},
      create: { storeId: store.id, name: n, slug: slugify(n), order: cats.length },
    });
    catByName.set(n.toLowerCase(), created.id);
    return created.id;
  }

  let created = 0, updated = 0, errors = 0;

  for (const r of rows) {
    try {
      const f = rowToFields(r);
      if (!f.name) { errors++; continue; }
      const categoryId = await resolveCat(f.categoria);
      const { categoria, ...fields } = f;

      // buscar existente: por sku, luego barcode, luego nombre exacto
      let existing =
        (f.sku && (await prisma.product.findFirst({ where: { storeId: store.id, sku: f.sku } }))) ||
        (f.barcode && (await prisma.product.findFirst({ where: { storeId: store.id, barcode: f.barcode } }))) ||
        (await prisma.product.findFirst({ where: { storeId: store.id, name: f.name } }));

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: { ...fields, categoryId, sku: fields.sku || existing.sku },
        });
        updated++;
      } else {
        const sku = fields.sku || (await nextSku(store.id));
        // slug único
        let slug = slugify(f.name) || "producto";
        let i = 2;
        while (await prisma.product.findFirst({ where: { storeId: store.id, slug } })) slug = `${slugify(f.name)}-${i++}`;
        await prisma.product.create({
          data: { ...fields, sku, slug, categoryId, storeId: store.id },
        });
        created++;
      }
    } catch {
      errors++;
    }
  }

  return NextResponse.json({ ok: true, created, updated, errors, total: rows.length });
}
