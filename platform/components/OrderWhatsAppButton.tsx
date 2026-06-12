"use client";

type Item = { qty: number; name: string };

const money = (n: number) => "$ " + Math.round(n).toLocaleString("es-AR");

export default function OrderWhatsAppButton({
  phone, storeName, code, items, total, pending,
}: {
  phone: string | null;
  storeName: string;
  code: string;
  items: Item[];
  total: number;
  pending: boolean;
}) {
  function send() {
    const digits = (phone || "").replace(/\D/g, "");
    const lines = [
      `¡Hola ${storeName}! Quiero coordinar mi pedido *#${code}*:`,
      "",
      ...items.map((i) => `• ${i.qty}× ${i.name}`),
      "",
      `Total: ${money(total)}`,
      pending ? "Quedó pendiente de pago — ¿cómo coordinamos el pago y la entrega?" : "¿Cómo coordinamos la entrega?",
    ];
    const text = encodeURIComponent(lines.join("\n"));
    const url = digits ? `https://wa.me/${digits}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, "_blank", "noopener");
  }

  return (
    <button className="order-wpp" type="button" onClick={send} title="Coordinar por WhatsApp">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.41a8.2 8.2 0 0 1 2.42 5.83c0 4.54-3.7 8.24-8.25 8.24-1.52 0-3-.41-4.3-1.18l-.31-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.35c0-4.54 3.7-8.24 8.25-8.24Zm-4.5 4.43c-.21 0-.55.08-.84.39-.29.31-1.1 1.08-1.1 2.62 0 1.55 1.13 3.04 1.28 3.25.16.21 2.18 3.49 5.4 4.76 2.67 1.05 3.21.84 3.79.79.58-.05 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.6-.37-.31-.16-1.87-.92-2.16-1.03-.29-.1-.5-.16-.71.16-.21.31-.81 1.02-1 1.23-.18.21-.37.24-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.86-1.74-2.17-.18-.31-.02-.48.14-.63.14-.14.31-.37.47-.55.16-.18.21-.31.31-.52.1-.21.05-.39-.03-.55-.08-.16-.7-1.72-.96-2.35-.25-.61-.51-.53-.71-.54-.18-.01-.39-.01-.6-.01Z"/>
      </svg>
      WhatsApp
    </button>
  );
}
