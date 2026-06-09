"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "../../../lib/supabase/client";

type Mode = "magic" | "password";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/cuenta";
  const supabase = supabaseBrowser();

  const [mode, setMode] = useState<Mode>("magic");
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function magicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(false);
    if (error) setMsg({ kind: "err", text: error.message });
    else setMsg({ kind: "ok", text: "Te mandamos un link a tu email. Abrilo para entrar." });
  }

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    if (register) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      setLoading(false);
      if (error) return setMsg({ kind: "err", text: error.message });
      setMsg({ kind: "ok", text: "Cuenta creada. Revisá tu email para confirmarla y ya entrás." });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) return setMsg({ kind: "err", text: "Email o contraseña incorrectos." });
      router.push(next);
      router.refresh();
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-card admin-login-card">
        <span className="eyebrow">We · Cava</span>
        <h1 className="serif">{register ? "Crear cuenta" : "Entrar a tu cuenta"}</h1>
        <p className="admin-muted">Para comprar, ver tus pedidos y tu Club We.</p>

        <div className="auth-tabs">
          <button className={mode === "magic" ? "on" : ""} onClick={() => { setMode("magic"); setMsg(null); }} type="button">
            Link por email
          </button>
          <button className={mode === "password" ? "on" : ""} onClick={() => { setMode("password"); setMsg(null); }} type="button">
            Email y contraseña
          </button>
        </div>

        {mode === "magic" ? (
          <form onSubmit={magicLink}>
            <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn btn-primary" type="submit" disabled={loading || !email}>
              {loading ? "Enviando…" : "Enviarme el link"}
            </button>
          </form>
        ) : (
          <form onSubmit={withPassword}>
            {register && (
              <input type="text" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            <button className="btn btn-primary" type="submit" disabled={loading || !email || !password}>
              {loading ? "…" : register ? "Crear cuenta" : "Entrar"}
            </button>
            <button type="button" className="auth-switch" onClick={() => { setRegister(!register); setMsg(null); }}>
              {register ? "Ya tengo cuenta · Entrar" : "No tengo cuenta · Crear una"}
            </button>
          </form>
        )}

        {msg && <p className={msg.kind === "ok" ? "auth-ok" : "admin-err"}>{msg.text}</p>}

        <a className="auth-back" href="/">← Volver a la tienda</a>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
