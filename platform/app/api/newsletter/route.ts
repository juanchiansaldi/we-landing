import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return NextResponse.json({ error: "store" }, { status: 500 });

  await prisma.newsletter
    .upsert({
      where: { storeId_email: { storeId: store.id, email } },
      update: {},
      create: { storeId: store.id, email },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
