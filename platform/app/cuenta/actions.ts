"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../lib/prisma";
import { currentCustomer } from "../../lib/customer";

function str(d: FormData, k: string): string {
  return String(d.get(k) || "").trim();
}

export async function saveAddress(data: FormData) {
  const customer = await currentCustomer();
  if (!customer) return;

  const id = String(data.get("id") || "");
  const count = await prisma.address.count({ where: { customerId: customer.id } });

  const fields = {
    label: str(data, "label") || null,
    recipient: str(data, "recipient") || customer.name || customer.email,
    phone: str(data, "phone") || null,
    street: str(data, "street"),
    number: str(data, "number") || null,
    city: str(data, "city"),
    province: str(data, "province"),
    zip: str(data, "zip") || null,
    notes: str(data, "notes") || null,
    isDefault: data.get("isDefault") === "on" || count === 0,
  };
  if (!fields.street || !fields.city) return;

  let addrId = id;
  if (id) {
    // solo si la dirección es del cliente
    const owned = await prisma.address.findFirst({ where: { id, customerId: customer.id }, select: { id: true } });
    if (!owned) return;
    await prisma.address.update({ where: { id }, data: fields });
  } else {
    const created = await prisma.address.create({
      data: { ...fields, storeId: customer.storeId, customerId: customer.id },
    });
    addrId = created.id;
  }

  if (fields.isDefault) {
    await prisma.address.updateMany({
      where: { customerId: customer.id, NOT: { id: addrId } },
      data: { isDefault: false },
    });
  }

  revalidatePath("/cuenta");
}

export async function deleteAddress(data: FormData) {
  const customer = await currentCustomer();
  if (!customer) return;
  const id = String(data.get("id") || "");
  const owned = await prisma.address.findFirst({ where: { id, customerId: customer.id } });
  if (!owned) return;
  await prisma.address.delete({ where: { id } });
  // si borramos la default, ascender otra
  if (owned.isDefault) {
    const next = await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  revalidatePath("/cuenta");
}

export async function setDefaultAddress(data: FormData) {
  const customer = await currentCustomer();
  if (!customer) return;
  const id = String(data.get("id") || "");
  const owned = await prisma.address.findFirst({ where: { id, customerId: customer.id }, select: { id: true } });
  if (!owned) return;
  await prisma.address.updateMany({ where: { customerId: customer.id }, data: { isDefault: false } });
  await prisma.address.update({ where: { id }, data: { isDefault: true } });
  revalidatePath("/cuenta");
}
