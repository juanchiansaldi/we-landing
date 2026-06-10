import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthed } from "../../../../lib/auth";

const BUCKET = "productos";

// solo imágenes reales (nada de svg/html/js que se sirva del bucket público)
const ALLOWED: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

// magic bytes: confirmamos que el contenido sea de verdad una imagen
function sniff(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP")
    return "image/webp";
  return null;
}

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

  // 1) extensión en whitelist
  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const declaredType = ALLOWED[ext];
  if (!declaredType) {
    return NextResponse.json({ error: "Formato no permitido. Usá JPG, PNG, WEBP o GIF." }, { status: 400 });
  }

  // 2) contenido real = imagen (magic bytes), no confiamos en el MIME del cliente
  const buffer = Buffer.from(await file.arrayBuffer());
  const realType = sniff(buffer);
  if (!realType) {
    return NextResponse.json({ error: "El archivo no es una imagen válida." }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // crear el bucket si no existe (idempotente)
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, {
    contentType: realType, // tipo verificado, no el del cliente
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(key);
  return NextResponse.json({ url: data.publicUrl });
}
