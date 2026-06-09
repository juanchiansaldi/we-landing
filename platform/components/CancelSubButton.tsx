"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubButton({ subId }: { subId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function cancel() {
    if (!confirm("¿Cancelar tu suscripción? Se corta el débito automático.")) return;
    setLoading(true);
    await fetch("/api/subscribe/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subId }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button className="order-repeat" type="button" onClick={cancel} disabled={loading}>
      {loading ? "Cancelando…" : "Cancelar suscripción"}
    </button>
  );
}
