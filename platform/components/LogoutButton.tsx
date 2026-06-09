"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await supabaseBrowser().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button className="btn btn-ghost" type="button" onClick={logout}>
      Salir
    </button>
  );
}
