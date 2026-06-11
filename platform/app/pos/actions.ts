"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { posGuard, getStore, nextSku, slugify, POS_USER_COOKIE } from "../../lib/pos";

function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

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
type PayMethodIn = "EFECTIVO" | "TARJETA" | "TRANSFERENCIA" | "CUENTA_CORRIENTE";
type SaleInput = {
  items: { productId: string; unit: "BOTELLA" | "CAJA"; qty: number }[];
  discount: number;
  payMethod: PayMethodIn;
  customerId?: string; // requerido si payMethod = CUENTA_CORRIENTE
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
  const pm = (["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CUENTA_CORRIENTE"].includes(input.payMethod) ? input.payMethod : "EFECTIVO") as PayMethodIn;

  // cuenta corriente: necesita cliente
  let customer = null as null | { id: string; name: string | null; ccBalance: number };
  if (pm === "CUENTA_CORRIENTE") {
    if (!input.customerId) return { ok: false, error: "Elegí un cliente para la cuenta corriente" };
    customer = await prisma.customer.findFirst({ where: { id: input.customerId, storeId: store.id }, select: { id: true, name: true, ccBalance: true } });
    if (!customer) return { ok: false, error: "Cliente no encontrado" };
  }

  // caja abierta (si hay) + vendedor activo (cookie)
  const openCashSession = await prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, orderBy: { openedAt: "desc" }, select: { id: true } });
  const posUserId = cookies().get(POS_USER_COOKIE)?.value || null;

  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        storeId: store.id,
        posUserId,
        customerId: customer?.id ?? null,
        cashSessionId: openCashSession?.id ?? null,
        subtotal,
        discount,
        total,
        payMethod: pm as any,
        payCash: pm === "EFECTIVO" ? total : 0,
        payCard: pm === "TARJETA" ? total : 0,
        payTransfer: pm === "TRANSFERENCIA" ? total : 0,
        payAccount: pm === "CUENTA_CORRIENTE" ? total : 0,
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

    // cuenta corriente: cargo al saldo del cliente + asiento en el ledger
    if (customer && pm === "CUENTA_CORRIENTE") {
      const resulting = customer.ccBalance + total;
      await tx.customer.update({ where: { id: customer.id }, data: { ccBalance: resulting } });
      await tx.customerLedger.create({
        data: { customerId: customer.id, type: "CARGO", amount: total, refSaleId: created.id, resultingBalance: resulting, note: `Venta #${created.id.slice(-6).toUpperCase()}` },
      });
    }
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
  revalidatePath("/admin/stock");
  revalidatePath("/admin/caja");
  revalidatePath("/admin/clientes");
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

// ═══════════════ Fase 3 · Stock ═══════════════
/** Ajuste manual de stock: conteo físico, merma, rotura, etc. Escribe ledger + Product.stock. */
export async function posAdjustStock(data: FormData) {
  posGuard();
  const store = await getStore();
  const productId = s(data, "productId");
  const mode = s(data, "mode"); // "set" (contar) | "delta" (sumar/restar)
  const reason = s(data, "reason") || "ajuste";
  const value = n(data, "value") ?? 0;
  if (!productId) return { ok: false, error: "Falta el producto" };

  const prod = await prisma.product.findFirst({ where: { id: productId, storeId: store.id }, select: { id: true, stock: true } });
  if (!prod) return { ok: false, error: "Producto no encontrado" };

  let delta = mode === "set" ? value - prod.stock : value;
  if (delta === 0) return { ok: true };

  const posUserId = cookies().get(POS_USER_COOKIE)?.value || null;
  await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({ where: { id: productId }, data: { stock: { increment: delta } } });
    await tx.stockMovement.create({
      data: {
        storeId: store.id, productId, type: delta > 0 ? "INGRESO" : "EGRESO",
        qty: delta, reason: reason || "ajuste", refType: "ajuste", posUserId, resultingStock: updated.stock,
      },
    });
  });
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  return { ok: true };
}

// ═══════════════ Fase 5 · Compras ═══════════════
type PurchaseInput = {
  supplierId?: string;
  invoiceNumber?: string;
  note?: string;
  updateCost: boolean; // si true, actualiza el costo del producto al costo de esta compra
  items: { productId: string; qty: number; unitCost: number }[];
};

export async function posSavePurchase(input: PurchaseInput) {
  posGuard();
  const store = await getStore();
  const items = (input.items || []).filter((i) => i.productId && i.qty > 0);
  if (!items.length) return { ok: false, error: "Agregá al menos un producto" };

  const prods = await prisma.product.findMany({ where: { storeId: store.id, id: { in: items.map((i) => i.productId) } }, select: { id: true } });
  const valid = new Set(prods.map((p) => p.id));
  const lines = items.filter((i) => valid.has(i.productId)).map((i) => ({
    productId: i.productId, qty: Math.max(1, Math.floor(i.qty)), unitCost: Math.max(0, Math.floor(i.unitCost || 0)),
  }));
  if (!lines.length) return { ok: false, error: "Sin productos válidos" };

  const total = lines.reduce((sm, l) => sm + l.unitCost * l.qty, 0);
  const posUserId = cookies().get(POS_USER_COOKIE)?.value || null;

  await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        storeId: store.id,
        supplierId: input.supplierId || null,
        invoiceNumber: (input.invoiceNumber || "").trim() || null,
        note: (input.note || "").trim() || null,
        total,
        items: { create: lines.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost, subtotal: l.unitCost * l.qty })) },
      },
    });
    for (const l of lines) {
      const updated = await tx.product.update({
        where: { id: l.productId },
        data: { stock: { increment: l.qty }, ...(input.updateCost && l.unitCost > 0 ? { cost: l.unitCost } : {}) },
      });
      await tx.stockMovement.create({
        data: { storeId: store.id, productId: l.productId, type: "INGRESO", qty: l.qty, reason: "compra", refType: "purchase", refId: purchase.id, posUserId, resultingStock: updated.stock },
      });
    }
  });

  // si se actualizaron costos, recalcular combos afectados
  if (input.updateCost) {
    for (const l of lines) await recomputeCombosForProduct(store.id, l.productId);
  }

  revalidatePath("/admin/compras");
  revalidatePath("/admin/stock");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
  return { ok: true, total };
}

// ═══════════════ Fase 6 · Clientes / Cuenta corriente ═══════════════
export async function posSaveCustomer(data: FormData) {
  posGuard();
  const store = await getStore();
  const id = s(data, "id");
  const name = s(data, "name");
  const email = s(data, "email");
  if (!name && !email) return;
  const fields = {
    name: name || null,
    phone: s(data, "phone") || null,
    cuit: s(data, "cuit") || null,
    vip: data.get("vip") === "on",
  };
  if (id) {
    await prisma.customer.update({ where: { id }, data: fields });
  } else {
    // email es @unique por tienda; si no ponen, generamos uno interno
    const mail = email || `cliente-${Date.now()}@local.we`;
    await prisma.customer.create({ data: { ...fields, email: mail, storeId: store.id } });
  }
  revalidatePath("/admin/clientes");
}

export async function posDeleteCustomer(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  const orders = await prisma.order.count({ where: { customerId: id } });
  const sales = await prisma.sale.count({ where: { customerId: id } });
  if (orders > 0 || sales > 0) return { ok: false, error: "El cliente tiene movimientos; no se puede borrar" };
  await prisma.customerLedger.deleteMany({ where: { customerId: id } });
  await prisma.customer.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/clientes");
  return { ok: true };
}

/** Asiento manual en la cuenta corriente: CARGO (le fío) o PAGO (me pagó). */
export async function posLedgerEntry(data: FormData) {
  posGuard();
  const store = await getStore();
  const customerId = s(data, "customerId");
  const type = s(data, "type") === "PAGO" ? "PAGO" : "CARGO";
  const amount = Math.abs(n(data, "amount") ?? 0);
  const note = s(data, "note") || null;
  if (!customerId || amount <= 0) return { ok: false, error: "Falta cliente o monto" };

  const customer = await prisma.customer.findFirst({ where: { id: customerId, storeId: store.id }, select: { id: true, ccBalance: true } });
  if (!customer) return { ok: false, error: "Cliente no encontrado" };

  const resulting = type === "CARGO" ? customer.ccBalance + amount : customer.ccBalance - amount;
  await prisma.$transaction(async (tx) => {
    await tx.customer.update({ where: { id: customerId }, data: { ccBalance: resulting } });
    await tx.customerLedger.create({ data: { customerId, type: type as any, amount, resultingBalance: resulting, note } });
  });
  revalidatePath("/admin/clientes");
  return { ok: true };
}

// ═══════════════ Fase 7 · Usuarios / roles (POS) ═══════════════
export async function posSaveUser(data: FormData) {
  posGuard();
  const store = await getStore();
  const id = s(data, "id");
  const username = s(data, "username").toLowerCase().replace(/\s+/g, "");
  const nombre = s(data, "nombre");
  const role = s(data, "role") === "ADMIN" ? "ADMIN" : "VENDEDOR";
  const activo = data.get("activo") === "on";
  const password = s(data, "password");
  if (!username || !nombre) return { ok: false, error: "Falta usuario o nombre" };

  if (id) {
    const fields: any = { nombre, role, activo };
    if (password) fields.passwordHash = hashPassword(password);
    await prisma.posUser.update({ where: { id }, data: fields });
  } else {
    if (!password) return { ok: false, error: "Poné una contraseña" };
    const exists = await prisma.posUser.findFirst({ where: { storeId: store.id, username } });
    if (exists) return { ok: false, error: "Ese usuario ya existe" };
    await prisma.posUser.create({ data: { storeId: store.id, username, nombre, role: role as any, activo, passwordHash: hashPassword(password) } });
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

export async function posDeleteUser(data: FormData) {
  posGuard();
  const id = s(data, "id");
  if (!id) return;
  const sales = await prisma.sale.count({ where: { posUserId: id } });
  if (sales > 0) {
    await prisma.posUser.update({ where: { id }, data: { activo: false } }).catch(() => {});
  } else {
    await prisma.posUser.delete({ where: { id } }).catch(() => {});
  }
  revalidatePath("/admin/usuarios");
  return { ok: true };
}

/** Elegir el vendedor activo (se guarda en cookie, estampa las ventas). */
export async function setActiveSeller(data: FormData) {
  posGuard();
  const id = s(data, "id");
  const c = cookies();
  if (id) c.set(POS_USER_COOKIE, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86400 * 30 });
  else c.delete(POS_USER_COOKIE);
  revalidatePath("/admin/vender");
  revalidatePath("/admin/usuarios");
}

// ═══════════════ Fase 8 · Caja ═══════════════
export async function openCash(data: FormData) {
  posGuard();
  const store = await getStore();
  const already = await prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" } });
  if (already) return { ok: false, error: "Ya hay una caja abierta" };
  const openingAmount = n(data, "openingAmount") ?? 0;
  const posUserId = cookies().get(POS_USER_COOKIE)?.value || null;
  await prisma.cashSession.create({ data: { storeId: store.id, openingAmount, openedById: posUserId, note: s(data, "note") || null } });
  revalidatePath("/admin/caja");
  revalidatePath("/admin/vender");
  return { ok: true };
}

export async function closeCash(data: FormData) {
  posGuard();
  const store = await getStore();
  const session = await prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, orderBy: { openedAt: "desc" } });
  if (!session) return { ok: false, error: "No hay caja abierta" };

  const counted = n(data, "countedAmount") ?? 0;
  // efectivo esperado = apertura + ventas en efectivo de esta sesión
  const sales = await prisma.sale.findMany({ where: { cashSessionId: session.id, voided: false }, select: { payCash: true } });
  const cashSales = sales.reduce((sm, s2) => sm + s2.payCash, 0);
  const expected = session.openingAmount + cashSales;
  const difference = counted - expected;

  await prisma.cashSession.update({
    where: { id: session.id },
    data: { status: "CERRADA", closedAt: new Date(), declaredAmount: expected, countedAmount: counted, difference, note: s(data, "note") || session.note },
  });
  revalidatePath("/admin/caja");
  revalidatePath("/admin/vender");
  return { ok: true, expected, difference };
}
