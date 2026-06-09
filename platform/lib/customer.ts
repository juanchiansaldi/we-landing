import { supabaseServer } from "./supabase/server";
import { prisma } from "./prisma";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

/** Usuario logueado en Supabase (o null). */
export async function currentUser() {
  const supabase = supabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

/**
 * Devuelve (creando si hace falta) el Customer de la tienda ligado al usuario
 * logueado. Null si no hay sesión.
 */
export async function currentCustomer() {
  const user = await currentUser();
  if (!user?.email) return null;

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return null;

  let customer = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email: user.email } },
  });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        storeId: store.id,
        email: user.email,
        name: (user.user_metadata?.name as string) || null,
        phone: (user.user_metadata?.phone as string) || null,
        authId: user.id,
      },
    });
  } else if (!customer.authId) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { authId: user.id },
    });
  }

  return customer;
}
