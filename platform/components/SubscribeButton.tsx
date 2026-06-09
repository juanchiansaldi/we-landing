"use client";

import { useState } from "react";

export default function SubscribeButton({
  plan,
  recommended,
}: {
  plan: string;
  recommended?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.init_point) {
        window.location.href = j.init_point;
        return;
      }
      if (res.status === 401 || j.error === "auth") {
        window.location.href = "/cuenta/login?next=" + encodeURIComponent("/club");
        return;
      }
      if (j.error === "already") {
        alert("Ya tenés una suscripción activa. La gestionás desde Mi cuenta.");
        window.location.href = "/cuenta";
        return;
      }
      alert(j.message || j.error || "No se pudo iniciar la suscripción.");
      setLoading(false);
    } catch {
      alert("No se pudo conectar. Probá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <button className={`btn ${recommended ? "btn-primary" : "btn-ghost"}`} type="button" onClick={go} disabled={loading}>
      {loading ? "Abriendo…" : "Suscribirme"}
    </button>
  );
}
