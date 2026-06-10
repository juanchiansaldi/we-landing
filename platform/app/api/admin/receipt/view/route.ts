import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAuthed } from "../../../../../lib/auth";

const BUCKET = "comprobantes";

// Devuelve el comprobante con una URL firmada de 5 min. Solo admin logueado.
export async function GET(req: Request) {
  if (!isAuthed()) return new Response("No autorizado", { status: 401 });

  const key = new URL(req.url).searchParams.get("key") || "";
  // solo aceptamos un nombre de archivo simple (evita path traversal)
  if (!key || !/^[\w.\-]+$/.test(key)) return new Response("Comprobante inválido", { status: 400 });

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(key, 300);
  if (error || !data?.signedUrl) return new Response("No se encontró el comprobante", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
