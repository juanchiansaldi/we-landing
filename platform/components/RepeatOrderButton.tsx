"use client";

export default function RepeatOrderButton({ cart }: { cart: Record<string, number> }) {
  const items = Object.keys(cart).length;
  if (!items) return null;

  function repeat() {
    try {
      localStorage.setItem("we-cart", JSON.stringify(cart));
    } catch {}
    window.location.href = "/?cart=1";
  }

  return (
    <button className="order-repeat" type="button" onClick={repeat}>
      Repetir pedido
    </button>
  );
}
