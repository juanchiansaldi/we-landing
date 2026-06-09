import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthed } from "../../../../lib/auth";

const BUCKET = "productos";

export async function POST(req: Request) {
  if (!isAuthed()) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "La imagen supera los 5 MB" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // crear el bucket si no existe (idempotente)
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = (file.name.split(".").pop() || "webp").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "webp"}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, {
    contentType: file.type || "image/webp",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl });
}
