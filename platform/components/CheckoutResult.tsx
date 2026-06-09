"use client";

import { useEffect } from "react";

type Kind = "success" | "failure" | "pending";

const COPY: Record<Kind, { title: string; text: string; emoji: string }> = {
  success: {
    emoji: "✓",
    title: "¡Gracias por tu compra!",
    text: "Tu pago fue aprobado. Te vamos a contactar por WhatsApp para coordinar el envío. Ya podés ir descorchando.",
  },
  pending: {
    emoji: "…",
    title: "Tu pago está en proceso",
    text: "Mercado Pago todavía está confirmando el pago. Apenas se acredite te avisamos por WhatsApp. No hace falta que pagues de nuevo.",
  },
  failure: {
    emoji: "×",
    title: "No pudimos cobrar el pago",
    text: "El pago no se completó. Podés volver a intentar o, si preferís, coordinamos por WhatsApp o transferencia.",
  },
};

export default function CheckoutResult({ kind }: { kind: Kind }) {
  useEffect(() => {
    if (kind === "success") {
      try {
        localStorage.removeItem("we-cart");
      } catch {}
    }
  }, [kind]);

  const c = COPY[kind];
  return (
    <div className="checkout-result">
      <div className={`cr-card cr-${kind}`}>
        <span className="cr-emoji">{c.emoji}</span>
        <h1 className="serif">{c.title}</h1>
        <p>{c.text}</p>
        <a className="btn btn-primary" href="/">
          Volver a la tienda
        </a>
      </div>
    </div>
  );
}
