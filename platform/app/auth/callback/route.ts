import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabase/server";

// Intercambia el código del magic link / confirmación por una sesión.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/cuenta";

  if (code) {
    const supabase = supabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
