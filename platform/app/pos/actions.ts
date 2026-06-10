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

  revalidatePath("/admin/productos");
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
  const prods = await prisma.product.findMany({ where: { storeId: store.id, id: { in: ids } } });
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
    // descontar stock (en botellas) + ledger
    for (const l of lines) {
      const updated = await tx.product.update({
        where: { id: l.p.id },
        data: { stock: { decrement: l.bottles } },
      });
      await tx.stockMovement.create({
        data: {
          storeId: store.id,
          productId: l.p.id,
          type: "EGRESO",
          qty: -l.bottles,
          reason: "venta",
          refType: "sale",
          refId: created.id,
          resultingStock: updated.stock,
        },
      });
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
