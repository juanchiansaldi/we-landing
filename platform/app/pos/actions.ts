"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { posGuard, getStore, nextSku, slugify } from "../../lib/pos";

function s(d: FormData, k: string): string {
  return String(d.get(k) || "").trim();
}
function n(d: FormData, k: string): number | null {
  const v = s(d, k);
  if (!v) return null;
  const x = Math.round(Number(v.replace(/[^\d.-]/g, "")));
  return Number.isFinite(x) ? x : null;
}
function f(d: FormData, k: string): number | null {
  const v = s(d, k);
  if (!v) return null;
  const x = Number(v.replace(",", "."));
  return Number.isFinite(x) ? x : null;
}

async function uniqueSlug(storeId: string, base: string, excludeId?: string) {
  let slug = base || "producto";
  let i = 2;
  while (true) {
    const hit = await prisma.product.findFirst({
      where: { storeId, slug, NOT: excludeId ? { id: excludeId } : undefined },
      select: { id: true },
    });
    if (!hit) return slug;
    slug = `${base}-${i++}`;
  }
}

// ───────── Productos ─────────
export async function posSaveProduct(data: FormData) {
  posGuard();
  const store = await getStore();
  const id = s(data, "id");
  const name = s(data, "name");
  if (!name) return;

  let sku = s(data, "sku");
  if (!sku && !id) sku = await nextSku(store.id);

  const fields = {
    name,
    brand: s(data, "brand") || null,
    categoryId: s(data, "categoryId") || null,
    supplierId: s(data, "supplierId") || null,
    barcode: s(data, "barcode") || null,
    quickCode: s(data, "quickCode") || null,
    sku: sku || null,
    price: n(data, "price") ?? 0, // precio botella (normal)
    promoPrice: n(data, "promoPrice"), // precio con descuento (si hay promo)
    priceCase: n(data, "priceCase"),
    cost: n(data, "cost"),
    unitsPerCase: n(data, "unitsPerCase") ?? 6,
    stock: n(data, "stock") ?? 0,
    stockMin: n(data, "stockMin") ?? 0,
    varietal: s(data, "varietal") || null,
    vintage: n(data, "vintage"),
    abv: f(data, "abv"),
    volumeMl: n(data, "volumeMl") ?? 750,
    highValue: data.get("highValue") === "on",
    active: data.get("active") === "on",
    shortDesc: s(data, "shortDesc") || null,
  };

  let productId = id;
  if (id) {
    await prisma.product.update({ where: { id }, data: fields });
  } else {
    const slug = await uniqueSlug(store.id, slugify(name));
    const created = await prisma.product.create({ data: { ...fields, slug, storeId: store.id } });
    productId = created.id;
  }

  // foto principal (order 0)
  const img = s(data, "img");
  await prisma.productImage.deleteMany({ where: { productId } });
  if (img) await prisma.productImage.create({ data: { productId, url: img, order: 0 } });

  // si cambió el costo, recalculo los combos que usan este producto
  await recomputeCombosForProduct(store.id, productId);

  revalidatePath("/admin/productos");
  revalidatePath("/admin/combos");
  revalidatePath("/");
}

export async function posDeleteProduct(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/productos");
}

// ───────── Venta (POS) ─────────
type SaleInput = {
  items: { productId: string; unit: "BOTELLA" | "CAJA"; qty: number }[];
  discount: number;
  payMethod: "EFECTIVO" | "TARJETA" | "TRANSFERENCIA";
};

export async function createSale(input: SaleInput) {
  posGuard();
  const store = await getStore();
  const items = (input.items || []).filter((i) => i.productId && i.qty > 0);
  if (!items.length) return { ok: false, error: "Carrito vacío" };

  const ids = items.map((i) => i.productId);
  const prods = await prisma.product.findMany({
    where: { storeId: store.id, id: { in: ids } },
    include: { kitOf: { include: { component: true } } },
  });
  const byId = new Map(prods.map((p) => [p.id, p]));

  const lines = items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      const qty = Math.max(1, Math.floor(i.qty));
      const unit = i.unit === "CAJA" ? "CAJA" : "BOTELLA";
      const unitPrice =
        unit === "CAJA" ? (p.priceCase ?? p.price * p.unitsPerCase) : (p.promoPrice ?? p.price);
      const bottles = unit === "CAJA" ? qty * p.unitsPerCase : qty;
      return { p, unit, qty, unitPrice, unitCost: p.cost ?? 0, subtotal: unitPrice * qty, bottles };
    })
    .filter(Boolean) as any[];

  if (!lines.length) return { ok: false, error: "Sin items válidos" };

  const subtotal = lines.reduce((s, l) => s + l.subtotal, 0);
  const discount = Math.max(0, Math.min(Math.floor(input.discount || 0), subtotal));
  const total = subtotal - discount;
  const pm = ["EFECTIVO", "TARJETA", "TRANSFERENCIA"].includes(input.payMethod) ? input.payMethod : "EFECTIVO";

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        storeId: store.id,
        subtotal,
        discount,
        total,
        payMethod: pm as any,
        payCash: pm === "EFECTIVO" ? total : 0,
        payCard: pm === "TARJETA" ? total : 0,
        payTransfer: pm === "TRANSFERENCIA" ? total : 0,
        items: {
          create: lines.map((l) => ({
            productId: l.p.id,
            name: l.p.name,
            unit: l.unit as any,
            qty: l.qty,
            unitPrice: l.unitPrice,
            unitCost: l.unitCost,
            subtotal: l.subtotal,
          })),
        },
      },
    });
    // descontar stock + ledger. Si es combo, descuenta cada componente.
    for (const l of lines) {
      if (l.p.isKit && l.p.kitOf?.length) {
        for (const ki of l.p.kitOf) {
          const dec = l.qty * ki.qty;
          const updated = await tx.product.update({ where: { id: ki.componentId }, data: { stock: { decrement: dec } } });
          await tx.stockMovement.create({
            data: { storeId: store.id, productId: ki.componentId, type: "EGRESO", qty: -dec, reason: "venta combo", refType: "sale", refId: created.id, resultingStock: updated.stock },
          });
        }
      } else {
        const updated = await tx.product.update({ where: { id: l.p.id }, data: { stock: { decrement: l.bottles } } });
        await tx.stockMovement.create({
          data: { storeId: store.id, productId: l.p.id, type: "EGRESO", qty: -l.bottles, reason: "venta", refType: "sale", refId: created.id, resultingStock: updated.stock },
        });
      }
    }
    return created;
  });

  revalidatePath("/admin");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/reportes");
  revalidatePath("/");

  return {
    ok: true,
    ticket: {
      code: sale.id.slice(-6).toUpperCase(),
      items: lines.map((l) => ({ name: l.p.name, unit: l.unit, qty: l.qty, unitPrice: l.unitPrice, subtotal: l.subtotal })),
      subtotal,
      discount,
      total,
      payMethod: pm,
    },
  };
}

// ───────── Combos / Kits ─────────
type ComboInput = {
  id?: string;
  name: string;
  quickCode?: string;
  barcode?: string;
  components: { productId: string; qty: number }[];
  margin: number | null; // %
  manualPrice: number | null;
  active: boolean;
};

async function comboCategoryId(storeId: string): Promise<string | null> {
  const c = await prisma.category.findFirst({ where: { storeId, name: { contains: "Combo", mode: "insensitive" } } });
  if (c) return c.id;
  const created = await prisma.category.upsert({
    where: { storeId_slug: { storeId, slug: "combos" } },
    update: {},
    create: { storeId, name: "Combos", slug: "combos", order: 99 },
  });
  return created.id;
}

export async function saveCombo(input: ComboInput) {
  posGuard();
  const store = await getStore();
  const name = (input.name || "").trim();
  const comps = (input.components || []).filter((c) => c.productId && c.qty > 0);
  if (!name || !comps.length) return { ok: false, error: "Poné nombre y al menos un producto" };

  // costo combinado a partir del costo actual de cada componente
  const prods = await prisma.product.findMany({ where: { storeId: store.id, id: { in: comps.map((c) => c.productId) } } });
  const byId = new Map(prods.map((p) => [p.id, p]));
  let cost = 0;
  for (const c of comps) { const p = byId.get(c.productId); if (p) cost += (p.cost ?? 0) * Math.max(1, Math.floor(c.qty)); }

  const margin = input.margin != null && input.margin >= 0 ? Math.floor(input.margin) : null;
  const price = margin != null ? Math.round(cost * (1 + margin / 100)) : (input.manualPrice ?? 0);

  const fields = {
    name,
    isKit: true,
    cost,
    price,
    margin,
    quickCode: (input.quickCode || "").trim() || null,
    barcode: (input.barcode || "").trim() || null,
    active: input.active,
    categoryId: await comboCategoryId(store.id),
  };

  let comboId = input.id;
  if (input.id) {
    await prisma.product.update({ where: { id: input.id }, data: fields });
  } else {
    let sku = await nextSku(store.id);
    const slug = await uniqueSlug(store.id, slugify(name));
    const created = await prisma.product.create({ data: { ...fields, sku, slug, storeId: store.id } });
    comboId = created.id;
  }

  // reemplazar componentes
  await prisma.kitItem.deleteMany({ where: { kitId: comboId! } });
  for (const c of comps) {
    await prisma.kitItem.create({ data: { kitId: comboId!, componentId: c.productId, qty: Math.max(1, Math.floor(c.qty)) } });
  }

  revalidatePath("/admin/combos");
  revalidatePath("/admin/productos");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCombo(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  await prisma.kitItem.deleteMany({ where: { kitId: id } });
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/combos");
}

/** Si cambia el costo de un producto, recalculamos los combos que lo usan (los que tienen margen). */
async function recomputeCombosForProduct(storeId: string, productId: string) {
  const kitItems = await prisma.kitItem.findMany({ where: { componentId: productId }, select: { kitId: true } });
  const comboIds = [...new Set(kitItems.map((k) => k.kitId))];
  for (const cid of comboIds) {
    const combo = await prisma.product.findUnique({ where: { id: cid } });
    if (!combo || combo.margin == null) continue;
    const items = await prisma.kitItem.findMany({ where: { kitId: cid }, include: { component: true } });
    const cost = items.reduce((sum, it) => sum + (it.component.cost ?? 0) * it.qty, 0);
    await prisma.product.update({ where: { id: cid }, data: { cost, price: Math.round(cost * (1 + combo.margin / 100)) } });
  }
}

// ───────── Categorías ─────────
export async function posSaveCategory(data: FormData) {
  posGuard();
  const store = await getStore();
  const id = s(data, "id");
  const name = s(data, "name");
  if (!name) return;
  const order = n(data, "order") ?? 0;
  if (id) {
    await prisma.category.update({ where: { id }, data: { name, order } });
  } else {
    await prisma.category.upsert({
      where: { storeId_slug: { storeId: store.id, slug: slugify(name) } },
      update: { name, order },
      create: { storeId: store.id, name, slug: slugify(name), order },
    });
  }
  revalidatePath("/admin/categorias");
}

export async function posDeleteCategory(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  // no borramos si tiene productos
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return;
  await prisma.category.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/categorias");
}

// ───────── Proveedores ─────────
export async function posSaveSupplier(data: FormData) {
  posGuard();
  const store = await getStore();
  const id = s(data, "id");
  const nombre = s(data, "nombre");
  if (!nombre) return;
  const fields = {
    nombre,
    cuit: s(data, "cuit") || null,
    contacto: s(data, "contacto") || null,
    telefono: s(data, "telefono") || null,
    email: s(data, "email") || null,
    notas: s(data, "notas") || null,
    activo: data.get("activo") === "on",
  };
  if (id) {
    await prisma.supplier.update({ where: { id }, data: fields });
  } else {
    await prisma.supplier.create({ data: { ...fields, storeId: store.id } });
  }
  revalidatePath("/admin/proveedores");
}

export async function posDeleteSupplier(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  const count = await prisma.product.count({ where: { supplierId: id } });
  if (count > 0) {
    // si tiene productos, lo desactivamos en vez de borrar
    await prisma.supplier.update({ where: { id }, data: { activo: false } }).catch(() => {});
  } else {
    await prisma.supplier.delete({ where: { id } }).catch(() => {});
  }
  revalidatePath("/admin/proveedores");
}
