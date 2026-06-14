import { Resend } from "resend";

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "We Cava <onboarding@resend.dev>";
const ADMIN = process.env.ADMIN_EMAIL || "";
const resend = KEY ? new Resend(KEY) : null;

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");
const realEmail = (e: string) => /^\S+@\S+\.\S+$/.test(e) && !e.includes("@local.we");

type Item = { name: string; qty: number; subtotal: number };

function rows(items: Item[]) {
  return items
    .map((i) => `<tr><td style="padding:6px 0;color:#333;font-size:14px">${i.qty}× ${i.name}</td><td style="padding:6px 0;text-align:right;color:#333;font-size:14px">${money(i.subtotal)}</td></tr>`)
    .join("");
}

function shell(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#f4f1ec;padding:24px 12px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ececec">
    <div style="background:#0d0a0a;padding:20px 26px"><span style="color:#F12C36;font-size:21px;font-weight:bold;font-family:Georgia,serif">We · Cava &amp; Gourmet</span></div>
    <div style="padding:26px">${body}</div>
    <div style="padding:14px 26px;background:#faf7f2;color:#9a8d83;font-size:12px;text-align:center">Crespo, Entre Ríos · Comprobante no fiscal</div>
  </div></div>`;
}

type OrderEmail = {
  to: string; name?: string | null; code: string; items: Item[];
  total: number; method: string; alias?: string | null;
};

/** "Recibimos tu pedido" al cliente + aviso al admin. No hace nada si no hay RESEND_API_KEY. */
export async function sendOrderReceived(o: OrderEmail) {
  if (!resend) return;
  const next =
    o.method === "transferencia"
      ? `<p style="color:#333;font-size:14px;line-height:1.6">Para confirmar tu pedido, transferí <b>${money(o.total)}</b>${o.alias ? ` al alias <b>${o.alias}</b>` : ""} y mandanos el comprobante por WhatsApp. Apenas lo verifiquemos, lo preparamos. 🙌</p>`
      : `<p style="color:#333;font-size:14px;line-height:1.6">Te avisamos por mail apenas se confirme el pago. ¡Gracias por tu compra! 🍷</p>`;
  const body = `<h2 style="margin:0 0 4px;color:#0d0a0a;font-family:Georgia,serif">¡Recibimos tu pedido! 🍷</h2>
    <p style="color:#777;margin:0 0 18px;font-size:13px">Pedido <b>#${o.code}</b>${o.name ? ` · ${o.name}` : ""}</p>
    <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #eee;margin-bottom:10px">${rows(o.items)}</table>
    <table style="width:100%"><tr><td style="color:#0d0a0a;font-weight:bold;font-size:17px">Total</td><td style="text-align:right;color:#F12C36;font-weight:bold;font-size:17px">${money(o.total)}</td></tr></table>
    ${next}`;
  try {
    if (realEmail(o.to)) await resend.emails.send({ from: FROM, to: o.to, subject: `Recibimos tu pedido #${o.code} 🍷`, html: shell(body) });
    if (ADMIN) {
      const adminBody = `<h2 style="margin:0 0 4px;color:#0d0a0a;font-family:Georgia,serif">Nuevo pedido #${o.code}</h2>
        <p style="color:#777;margin:0 0 14px;font-size:13px">${o.name || "Cliente"} · ${o.method}</p>
        <table style="width:100%;border-collapse:collapse;border-bottom:1px solid #eee;margin-bottom:8px">${rows(o.items)}</table>
        <p style="text-align:right;font-weight:bold;color:#F12C36;font-size:16px">Total ${money(o.total)}</p>`;
      await resend.emails.send({ from: FROM, to: ADMIN, subject: `🛒 Nuevo pedido #${o.code}${o.name ? ` · ${o.name}` : ""}`, html: shell(adminBody) });
    }
  } catch (e) { console.error("email sendOrderReceived:", e); }
}

/** "Pago confirmado" al cliente (desde el webhook de Mercado Pago). */
export async function sendPaymentConfirmed(o: { to: string; code: string; total: number }) {
  if (!resend || !realEmail(o.to)) return;
  const body = `<h2 style="margin:0 0 8px;color:#0d0a0a;font-family:Georgia,serif">¡Pago confirmado! ✅</h2>
    <p style="color:#333;font-size:14px;line-height:1.6">Tu pedido <b>#${o.code}</b> por <b>${money(o.total)}</b> ya está pago. Lo estamos preparando. ¡Gracias por elegirnos! 🍷</p>`;
  try { await resend.emails.send({ from: FROM, to: o.to, subject: `Pago confirmado · pedido #${o.code} ✅`, html: shell(body) }); }
  catch (e) { console.error("email sendPaymentConfirmed:", e); }
}
