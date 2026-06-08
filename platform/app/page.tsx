export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px",
        gap: "14px",
      }}
    >
      <span
        style={{
          fontSize: ".72rem",
          letterSpacing: ".24em",
          textTransform: "uppercase",
          color: "var(--red)",
          fontWeight: 600,
        }}
      >
        We · Cava — Plataforma
      </span>
      <h1 style={{ fontSize: "clamp(2rem,5vw,3.4rem)", fontWeight: 300, maxWidth: 720 }}>
        Fundación lista. La tienda real arranca acá.
      </h1>
      <p style={{ color: "var(--gray)", maxWidth: 520 }}>
        Next.js + Prisma + Supabase + Mercado Pago. Esta página es un placeholder:
        el storefront, el checkout y el panel se construyen sobre esta base.
      </p>
    </main>
  );
}
