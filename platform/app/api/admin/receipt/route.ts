import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthed } from "../../../../lib/auth";

// Comprobantes = datos sensibles (banco, montos, nombres). Bucket PRIVADO,
// key con randomBytes, y se sirven con URL firmada de corta duración (ver route view).
const BUCKET = "comprobantes";
const ALLOWED: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf",
};

function sniff(buf: Buffer): string | null {
  if (buf.length < 5) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50) return "image/png";
  if (buf.toString("ascii", 0, 4) === "%PDF") return "application/pdf";
  if (buf.toString("ascii", 0, 4) === "RIFF") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  if (!isAuthed()) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Sin archivo" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Máximo 8 MB" }, { status: 400 });

  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!ALLOWED[ext]) return NextResponse.json({ error: "Formato no permitido (JPG, PNG, WEBP o PDF)" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const real = sniff(buffer);
  if (!real) return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  // bucket privado (idempotente: si existe público, lo bajamos a privado)
  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  await admin.storage.updateBucket(BUCKET, { public: false }).catch(() => {});

  const key = `${Date.now()}-${randomBytes(16).toString("hex")}.${ext}`;
  const { error } = await admin.storage.from(BUCKET).upload(key, buffer, { contentType: real, upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // guardamos solo el path (no una URL pública); se firma al verlo
  return NextResponse.json({ key });
}
