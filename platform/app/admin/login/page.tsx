"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() || undefined, password: pw }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "No se pudo entrar");
      setLoading(false);
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-card admin-login-card" onSubmit={submit}>
        <span className="eyebrow">We · Cava — Panel</span>
        <h1 className="serif">Entrar al panel</h1>
        <p className="admin-muted">Vendedores: usá tu usuario y contraseña. Dueño: dejá el usuario vacío y poné la contraseña de admin.</p>
        <input
          type="text"
          placeholder="Usuario (vendedores)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoComplete="current-password"
        />
        {err && <p className="admin-err">{err}</p>}
        <button className="btn btn-primary" type="submit" disabled={loading || !pw}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
