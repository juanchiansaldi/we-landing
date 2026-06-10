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
    price: n(data, "price") ?? 0, // precio botella
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
