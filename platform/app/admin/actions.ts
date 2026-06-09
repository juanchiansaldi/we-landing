"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { isAuthed } from "../../lib/auth";
import { slugify } from "../../lib/slug";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

function guard() {
  if (!isAuthed()) redirect("/admin/login");
}

async function getStore() {
  const s = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!s) throw new Error("Tienda no encontrada");
  return s;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Math.round(Number(String(v).replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : null;
}

async function uniqueSlug(storeId: string, base: string, excludeId?: string) {
  let slug = base || "producto";
  let i = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const hit = await prisma.product.findFirst({
      where: { storeId, slug, NOT: excludeId ? { id: excludeId } : undefined },
      select: { id: true },
    });
    if (!hit) return slug;
    slug = `${base}-${i++}`;
  }
}

export async function saveProduct(data: FormData) {
  guard();
  const store = await getStore();

  const id = String(data.get("id") || "");
  const name = String(data.get("name") || "").trim();
  if (!name) return;

  const categoryId = String(data.get("categoryId") || "") || null;
  const fields = {
    name,
    brand: String(data.get("brand") || "").trim() || null,
    price: num(data.get("price")) ?? 0,
    promoPrice: num(data.get("promoPrice")),
    shortDesc: String(data.get("shortDesc") || "").trim() || null,
    description: String(data.get("description") || "").trim() || null,
    stock: num(data.get("stock")) ?? 0,
    isNew: data.get("isNew") === "on",
    active: data.get("active") === "on",
    categoryId,
  };

  let productId = id;
  if (id) {
    await prisma.product.update({ where: { id }, data: fields });
  } else {
    const slug = await uniqueSlug(store.id, slugify(name));
    const created = await prisma.product.create({
      data: { ...fields, slug, storeId: store.id },
    });
    productId = created.id;
  }

  // imagen única (v1): se guarda como ProductImage order 0
  const img = String(data.get("img") || "").trim();
  await prisma.productImage.deleteMany({ where: { productId } });
  if (img) {
    await prisma.productImage.create({ data: { productId, url: img, order: 0 } });
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteProduct(data: FormData) {
  guard();
  const id = String(data.get("id") || "");
  if (!id) return;
  await prisma.productImage.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function toggleActive(data: FormData) {
  guard();
  const id = String(data.get("id") || "");
  const active = data.get("active") === "true";
  if (!id) return;
  await prisma.product.update({ where: { id }, data: { active } });
  revalidatePath("/admin");
  revalidatePath("/");
}

const ORDER_STATUSES = ["PENDING", "CONFIRMED", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"];

export async function updateOrderStatus(data: FormData) {
  guard();
  const id = String(data.get("id") || "");
  const status = String(data.get("status") || "");
  if (!id || !ORDER_STATUSES.includes(status)) return;
  await prisma.order.update({ where: { id }, data: { status: status as any } });
  revalidatePath("/admin/orders");
}
