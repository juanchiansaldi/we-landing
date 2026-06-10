"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { fmt } from "../lib/format";
import type { StoreProduct } from "../lib/store";

type StoreInfo = {
  name: string;
  whatsapp: string | null;
  alias: string | null;
  titular: string | null;
  shipNote: string | null;
};

type Props = {
  store: StoreInfo;
  products: StoreProduct[];
  cats: string[];
};

type Quick = "" | "ofertas" | "combos" | "novedades";
type SortKey = "rel" | "price-asc" | "price-desc" | "name";

const CART_KEY = "we-cart";

const ICONS = {
  cart: "M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2m6 18a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm11 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  search: "M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
  check: "M20 6 9 17l-5-5",
  truck: "M3 6h13v9H3V6Zm13 3h4l2 3v3h-6V9ZM7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  x: "M18 6 6 18M6 6l12 12",
  wa: "M20 12a8 8 0 0 1-11.9 7L4 20l1.1-4A8 8 0 1 1 20 12Z",
};

function Icon({ d, ...rest }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d={d} />
    </svg>
  );
}

function isCombo(p: StoreProduct) {
  return /combo|caja|box/i.test(p.cat) || /combo|caja/i.test(p.name);
}

const priceOf = (p: StoreProduct) => p.promo ?? p.price;

export default function Storefront({ store, products, cats }: Props) {
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [quick, setQuick] = useState<Quick>("");
  const [sort, setSort] = useState<SortKey>("rel");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number; label: string } | null>(null);
  const [couponErr, setCouponErr] = useState<string | null>(null);
  const [transferDone, setTransferDone] = useState<{ code: string; alias: string } | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [onlyFav, setOnlyFav] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const [giftMsg, setGiftMsg] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [news, setNews] = useState("");
  const [newsOk, setNewsOk] = useState(false);

  const FREE_SHIP = 25000;

  const byId = useMemo(() => {
    const m: Record<string, StoreProduct> = {};
    for (const p of products) m[p.id] = p;
    return m;
  }, [products]);

  // cargar carrito de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    // abrir el carrito si vienen de "repetir pedido"
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("cart") === "1") {
      setCartOpen(true);
    }
    // tema (compartido con el landing vía localStorage)
    try {
      const t = localStorage.getItem("we-theme");
      if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    } catch {}
    // favoritos
    try {
      const f = localStorage.getItem("we-fav");
      if (f) setFavs(new Set(JSON.parse(f)));
    } catch {}
  }, []);

  function toggleFav(id: string) {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      try {
        localStorage.setItem("we-fav", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast((t) => (t === msg ? null : t)), 1800);
  }

  async function subscribeNews(e: React.FormEvent) {
    e.preventDefault();
    const email = news.trim();
    if (!email) return;
    await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setNewsOk(true);
    setNews("");
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("we-theme", next);
    } catch {}
  }

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  // bloquear scroll del body con drawer/modal abierto
  useEffect(() => {
    const open = cartOpen || detailId !== null;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen, detailId]);

  // cerrar con ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (detailId) setDetailId(null);
      else if (cartOpen) setCartOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cartOpen, detailId]);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ p: byId[id], qty }))
        .filter((l) => l.p),
    [cart, byId]
  );

  const subtotal = useMemo(
    () => cartLines.reduce((s, l) => s + priceOf(l.p) * l.qty, 0),
    [cartLines]
  );

  const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
  const total = subtotal - discount;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponErr(null);
    const res = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.valid) {
      setCoupon({ code: j.code, discount: j.discount, label: j.label });
      setCouponInput("");
    } else {
      setCoupon(null);
      setCouponErr(j.error || "Código inválido");
    }
  }

  // si cambia el subtotal con un cupón aplicado, recalculamos el descuento
  useEffect(() => {
    if (!coupon) return;
    if (subtotal <= 0) {
      setCoupon(null);
      return;
    }
    let cancel = false;
    fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: coupon.code, subtotal }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return;
        if (j.valid) setCoupon({ code: j.code, discount: j.discount, label: j.label });
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  const addToCart = useCallback((p: StoreProduct) => {
    if (!p.stock) return;
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
    setAdded(p.id);
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1100);
    setToast(`${p.name} agregado ✓`);
    setTimeout(() => setToast((t) => (t === `${p.name} agregado ✓` ? null : t)), 1800);
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }, []);

  function toggleCat(c: string) {
    setActiveCats((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function clearFilters() {
    setActiveCats([]);
    setOnlyOffer(false);
    setOnlyNew(false);
    setQuick("");
    setSearch("");
  }

  const catCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of products) m[p.cat] = (m[p.cat] || 0) + 1;
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.name} ${p.brand ?? ""} ${p.cat} ${p.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (activeCats.length && !activeCats.includes(p.cat)) return false;
      if (onlyOffer && p.promo == null) return false;
      if (onlyNew && !p.nuevo) return false;
      if (onlyFav && !favs.has(p.id)) return false;
      if (quick === "ofertas" && p.promo == null) return false;
      if (quick === "novedades" && !p.nuevo) return false;
      if (quick === "combos" && !isCombo(p)) return false;
      return true;
    });

    if (sort === "price-asc") list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "price-desc") list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return list;
  }, [products, search, activeCats, onlyOffer, onlyNew, onlyFav, favs, quick, sort]);

  function setQuickFilter(q: Quick) {
    setQuick((cur) => (cur === q ? "" : q));
  }

  const detail = detailId ? byId[detailId] : null;
  const suggestions = useMemo(() => {
    if (!detail) return [];
    return products
      .filter((p) => p.id !== detail.id && p.cat === detail.cat)
      .slice(0, 3);
  }, [detail, products]);

  function checkoutWhatsApp() {
    const phone = (store.whatsapp || "").replace(/\D/g, "");
    const lines = cartLines.map(
      (l) => `• ${l.qty}× ${l.p.name} — ${fmt(priceOf(l.p) * l.qty)}`
    );
    const msg = [
      `¡Hola ${store.name}! Quiero hacer este pedido:`,
      "",
      ...lines,
      "",
      `Total: ${fmt(subtotal)}`,
      "",
      "¿Cómo seguimos con el pago y el envío?",
    ].join("\n");
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  function transferWhatsApp(code?: string) {
    const phone = (store.whatsapp || "").replace(/\D/g, "");
    const lines = cartLines.map((l) => `• ${l.qty}× ${l.p.name} — ${fmt(priceOf(l.p) * l.qty)}`);
    const msg = [
      `¡Hola ${store.name}! Hice una transferencia por mi pedido${code ? ` #${code}` : ""}:`,
      "",
      ...lines,
      "",
      `Total: ${fmt(total)}`,
      `Alias: ${store.alias || ""}`,
      "",
      "Te adjunto el comprobante 📎",
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function checkoutTransfer() {
    if (!cartLines.length || paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartLines.map((l) => ({ id: l.p.id, qty: l.qty })),
          coupon: coupon?.code || undefined,
          giftNote: isGift ? giftMsg.trim() : undefined,
          method: "transferencia",
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401 || j.error === "auth") { window.location.href = "/cuenta/login?next=" + encodeURIComponent("/"); return; }
      if (j.error === "address") { window.location.href = "/cuenta?add=1"; return; }
      if (res.ok && j.transfer) {
        setTransferDone({ code: j.code, alias: j.alias || store.alias || "" });
        return;
      }
      alert(j.message || j.error || "No se pudo generar el pedido.");
    } catch {
      alert("No se pudo conectar. Probá de nuevo.");
    } finally {
      setPaying(false);
    }
  }

  async function checkoutMP() {
    if (!cartLines.length || paying) return;
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartLines.map((l) => ({ id: l.p.id, qty: l.qty })),
          coupon: coupon?.code || undefined,
          giftNote: isGift ? giftMsg.trim() : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.init_point) {
        window.location.href = j.init_point;
        return;
      }
      if (res.status === 401 || j.error === "auth") {
        window.location.href = "/cuenta/login?next=" + encodeURIComponent("/");
        return;
      }
      if (j.error === "address") {
        window.location.href = "/cuenta?add=1";
        return;
      }
      alert(j.message || j.error || "No se pudo iniciar el pago. Probá de nuevo o escribinos por WhatsApp.");
      setPaying(false);
    } catch {
      alert("No se pudo conectar con el pago. Probá de nuevo.");
      setPaying(false);
    }
  }

  return (
    <>
      <nav>
        <a href="https://wecavagourmet.com" className="nav-logo" aria-label="We · Cava & Gourmet">
          <span className="logo-word"><svg viewBox="0 0 520.10 261.99"><use href="#we-word" /></svg></span>
        </a>
        <div className="nav-right">
          <div className="nav-links">
            <a href="https://wecavagourmet.com">Inicio</a>
            <a href="https://wecavagourmet.com/#seleccion">Selección</a>
            <a href="/club">Club We</a>
            <a href="#" className="active">Cava · Tienda</a>
            <a href="/cuenta">Mi cuenta</a>
          </div>
          <button className="cart-btn" type="button" onClick={() => setCartOpen(true)}>
            <Icon d={ICONS.cart} />
            Carrito
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Cambiar tema">
            <svg className="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            <svg className="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          </button>
        </div>
      </nav>

      <header className="shop">
        <div className="wrap">
          <div className="shop-head shop-head-top">
            <div className="shop-head-text">
              <span className="eyebrow">La Cava · Tienda online</span>
              <h1>
                Llevate la cava <b className="red-text">a tu mesa.</b>
              </h1>
              <p>
                Hacé tu pedido y te lo llevamos. Vinos, espumantes, quesos, chocolates y todo lo de We.
              </p>
            </div>
            <div className="shop-ship">
              <span>
                <Icon d={ICONS.clock} /> Crespo: <b>24–48 hs hábiles</b>
              </span>
              <span>
                <Icon d={ICONS.truck} /> Todo el país: <b>2–4 días</b>
              </span>
            </div>
          </div>

          <div className="promo-mosaic">
            <button type="button" className={`pm-tile pm-ofertas${quick === "ofertas" ? " pm-active" : ""}`} onClick={() => setQuickFilter("ofertas")}>
              <span className="pm-k">Hasta 25% OFF</span>
              <h3>Ofertas</h3>
              <span className="pm-go">Ver lo que está en promo →</span>
            </button>
            <button type="button" className={`pm-tile pm-combos${quick === "combos" ? " pm-active" : ""}`} onClick={() => setQuickFilter("combos")}>
              <span className="pm-k">Armadas a mano</span>
              <h3>Combos &amp; Regalos</h3>
              <span className="pm-go">Ver cajas →</span>
            </button>
            <button type="button" className={`pm-tile pm-novedades${quick === "novedades" ? " pm-active" : ""}`} onClick={() => setQuickFilter("novedades")}>
              <span className="pm-k">Recién llegados</span>
              <h3>Novedades</h3>
              <span className="pm-go">Ver lo nuevo →</span>
            </button>
          </div>

          <div className="shop-layout">
            <aside className="filters">
              <div className="fgroup">
                <h4>Categorías</h4>
                {cats.map((c) => (
                  <label className="fopt" key={c}>
                    <input type="checkbox" checked={activeCats.includes(c)} onChange={() => toggleCat(c)} />
                    <span className="fbox"><Icon d={ICONS.check} /></span>
                    {c}
                    <span className="fcount">{catCounts[c] || 0}</span>
                  </label>
                ))}
              </div>
              <div className="fgroup">
                <h4>Filtros</h4>
                <label className="fopt">
                  <input type="checkbox" checked={onlyOffer} onChange={(e) => setOnlyOffer(e.target.checked)} />
                  <span className="fbox"><Icon d={ICONS.check} /></span>
                  En oferta
                </label>
                <label className="fopt">
                  <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
                  <span className="fbox"><Icon d={ICONS.check} /></span>
                  Novedades
                </label>
                <label className="fopt">
                  <input type="checkbox" checked={onlyFav} onChange={(e) => setOnlyFav(e.target.checked)} />
                  <span className="fbox"><Icon d={ICONS.check} /></span>
                  Favoritos
                  {favs.size > 0 && <span className="fcount">{favs.size}</span>}
                </label>
              </div>
              <button className="fclear" type="button" onClick={() => { clearFilters(); setOnlyFav(false); }}>Limpiar filtros</button>
            </aside>

            <div className="shop-main">
              <div className="toolbar">
                <span className="count">
                  <b>{filtered.length}</b> producto{filtered.length === 1 ? "" : "s"}
                </span>
                <div className="search-box">
                  <Icon d={ICONS.search} />
                  <input type="search" placeholder="Buscar vino, bodega, queso…" value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="sort">
                  Ordenar
                  <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                    <option value="rel">Relevancia</option>
                    <option value="price-asc">Menor precio</option>
                    <option value="price-desc">Mayor precio</option>
                    <option value="name">Nombre A–Z</option>
                  </select>
                </div>
              </div>

              <div className="shop-grid">
                {filtered.length === 0 && (
                  <div className="shop-empty">No encontramos productos con esos filtros.</div>
                )}
                {filtered.map((p) => {
                  const sale = p.promo != null;
                  return (
                    <article className="pcard" key={p.id} onClick={() => setDetailId(p.id)}>
                      <div className={`pcard-media${p.img ? "" : " ph"}`}>
                        {!p.stock && <span className="pbadge out">Sin stock</span>}
                        {p.stock && p.nuevo && <span className="pbadge">Nuevo</span>}
                        {p.stock && !p.nuevo && sale && <span className="pbadge">Oferta</span>}
                        {p.stock && !p.nuevo && !sale && p.stockQty > 0 && p.stockQty <= 5 && (
                          <span className="pbadge low">¡Últimas {p.stockQty}!</span>
                        )}
                        <button
                          className={`pfav${favs.has(p.id) ? " on" : ""}`}
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleFav(p.id); }}
                          aria-label="Favorito"
                        >
                          <svg viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
                        </button>
                        {p.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.img} alt={p.name} loading="lazy" />
                        ) : (
                          "We"
                        )}
                      </div>
                      <div className="pcard-body">
                        {p.brand && <span className="pcard-brand">{p.brand}</span>}
                        <h3>{p.name}</h3>
                        {p.notes && <p className="pcard-notes">{p.notes}</p>}
                        <div className="pcard-foot">
                          <div className="pcard-price">
                            {sale && <span className="was">{fmt(p.price)}</span>}
                            <span className={`now${sale ? " sale" : ""}`}>{fmt(priceOf(p))}</span>
                          </div>
                          <button
                            className="padd"
                            type="button"
                            disabled={!p.stock}
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(p);
                            }}
                            aria-label={`Agregar ${p.name}`}
                          >
                            <Icon d={added === p.id ? ICONS.check : ICONS.plus} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* OVERLAY compartido */}
      <div
        className={`overlay${cartOpen || detailId ? " open" : ""}`}
        onClick={() => {
          if (detailId) setDetailId(null);
          else setCartOpen(false);
        }}
      />

      {/* CART DRAWER */}
      <aside className={`cart${cartOpen ? " open" : ""}`} aria-hidden={!cartOpen}>
        <div className="cart-head">
          <h2 className="serif">Tu carrito</h2>
          <button className="cart-close" type="button" onClick={() => setCartOpen(false)} aria-label="Cerrar">
            <Icon d={ICONS.x} />
          </button>
        </div>

        {cartLines.length === 0 ? (
          <div className="cart-items">
            <div className="cart-empty">
              <Icon d={ICONS.cart} />
              <div>
                Tu carrito está vacío.
                <br />
                Sumá algo rico de la cava.
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartLines.map(({ p, qty }) => (
                <div className="citem" key={p.id}>
                  <div className="citem-img">
                    {p.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.img} alt={p.name} />
                    ) : null}
                  </div>
                  <div className="citem-info">
                    <h4>{p.name}</h4>
                    <div className="cprice">{fmt(priceOf(p))}</div>
                    <div className="qty">
                      <button type="button" onClick={() => setQty(p.id, qty - 1)} aria-label="Restar">
                        <Icon d={ICONS.minus} />
                      </button>
                      <span>{qty}</span>
                      <button type="button" onClick={() => setQty(p.id, qty + 1)} aria-label="Sumar">
                        <Icon d={ICONS.plus} />
                      </button>
                    </div>
                  </div>
                  <button className="citem-rm" type="button" onClick={() => setQty(p.id, 0)}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-foot">
              <div className="freeship">
                {total >= FREE_SHIP ? (
                  <span className="freeship-on">🎉 ¡Tenés envío sin cargo en Crespo!</span>
                ) : (
                  <span>Te faltan <b>{fmt(FREE_SHIP - total)}</b> para envío sin cargo en Crespo</span>
                )}
                <div className="freeship-bar">
                  <i style={{ width: `${Math.min(100, (total / FREE_SHIP) * 100)}%` }} />
                </div>
              </div>
              <div className="coupon">
                {coupon ? (
                  <div className="coupon-on">
                    <span>🎟 {coupon.label}</span>
                    <button type="button" onClick={() => { setCoupon(null); setCouponErr(null); }}>Quitar</button>
                  </div>
                ) : (
                  <div className="coupon-row">
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                    />
                    <button type="button" onClick={applyCoupon} disabled={!couponInput.trim()}>Aplicar</button>
                  </div>
                )}
                {couponErr && <span className="coupon-err">{couponErr}</span>}
              </div>
              {discount > 0 && (
                <div className="cart-sub cart-sub-disc">
                  <span>Descuento</span>
                  <b>− {fmt(discount)}</b>
                </div>
              )}
              <div className="cart-sub">
                <span>{discount > 0 ? "Total" : "Subtotal"}</span>
                <b>{fmt(total)}</b>
              </div>
              <label className="gift-check">
                <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} />
                <span className="fbox"><Icon d={ICONS.check} /></span>
                Es un regalo 🎁
              </label>
              {isGift && (
                <textarea
                  className="gift-msg"
                  placeholder="Mensaje para la tarjeta (opcional)"
                  rows={2}
                  maxLength={300}
                  value={giftMsg}
                  onChange={(e) => setGiftMsg(e.target.value)}
                />
              )}
              <div className="cart-pay">
                <button className="btn mp-btn" type="button" onClick={checkoutMP} disabled={paying}>
                  {paying ? "Abriendo Mercado Pago…" : "Pagar con tarjeta · Mercado Pago"}
                </button>
                <button className="btn btn-ghost" type="button" onClick={checkoutWhatsApp}>
                  <Icon d={ICONS.wa} /> Coordinar por WhatsApp
                </button>
                {store.alias && !transferDone && (
                  <button className="btn btn-ghost" type="button" onClick={checkoutTransfer} disabled={paying}>
                    {paying ? "Generando pedido…" : "Pagar por transferencia"}
                  </button>
                )}
                {transferDone && (
                  <div className="transfer-box">
                    ✓ Pedido <b>#{transferDone.code}</b> generado. Transferí <b>{fmt(total)}</b> a <b>{transferDone.alias}</b> y mandanos el comprobante:
                    <br />
                    <span className="tw" onClick={() => transferWhatsApp(transferDone.code)}>
                      <Icon d={ICONS.wa} /> Enviar comprobante por WhatsApp
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* PRODUCT DETAIL */}
      <div className={`pd${detail ? " open" : ""}`} onClick={() => setDetailId(null)}>
        {detail && (
          <div className="pd-card" onClick={(e) => e.stopPropagation()}>
            <button className="pd-close" type="button" onClick={() => setDetailId(null)} aria-label="Cerrar">
              <Icon d={ICONS.x} />
            </button>
            <div className={`pd-media${detail.img ? "" : " ph"}`}>
              {detail.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.img} alt={detail.name} />
              ) : (
                "We"
              )}
            </div>
            <div className="pd-body">
              {detail.brand && <span className="pd-brand">{detail.brand}</span>}
              <h2 className="serif">{detail.name}</h2>
              {(detail.desc || detail.notes) && (
                <p className="pd-desc">{detail.desc || detail.notes}</p>
              )}
              {detail.meta.length > 0 && (
                <div className="pd-meta">
                  {detail.meta.map((m, i) => (
                    <span key={i}>
                      <b>{m.v}</b> {m.k}
                    </span>
                  ))}
                </div>
              )}
              <div className="pd-secondary">
                <button className="pd-link" type="button" onClick={() => { toggleFav(detail.id); }}>
                  {favs.has(detail.id) ? "♥ En favoritos" : "♡ Guardar en favoritos"}
                </button>
                <button
                  className="pd-link"
                  type="button"
                  onClick={() => {
                    const txt = `Mirá este producto de We · Cava: ${detail.name} — ${fmt(priceOf(detail))}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(txt + " " + (typeof window !== "undefined" ? window.location.origin : ""))}`, "_blank");
                  }}
                >
                  <Icon d={ICONS.wa} /> Compartir
                </button>
              </div>
              <div className="pd-foot">
                <div className="pd-price">
                  {detail.promo != null && <span className="was">{fmt(detail.price)}</span>}
                  <span className={`now${detail.promo != null ? " sale" : ""}`}>{fmt(priceOf(detail))}</span>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={!detail.stock}
                  onClick={() => {
                    addToCart(detail);
                    setDetailId(null);
                    // no abrimos el carrito: que sigan comprando
                  }}
                >
                  {detail.stock ? "Agregar al carrito" : "Sin stock"}
                </button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="pd-sug">
                <h4>También te puede gustar</h4>
                <div className="pd-sug-grid">
                  {suggestions.map((s) => (
                    <button key={s.id} className="pd-sug-card" type="button" onClick={() => setDetailId(s.id)}>
                      <div className="sug-img">
                        {s.img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.img} alt={s.name} />
                        ) : null}
                      </div>
                      <h5>{s.name}</h5>
                      <span className="sug-price">{fmt(priceOf(s))}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="shop-foot">
        <div className="wrap">
          <div className="news">
            <div className="news-txt">
              <b>Sumate al newsletter</b>
              <span>Ofertas, novedades y catas. Sin spam.</span>
            </div>
            {newsOk ? (
              <span className="news-ok">¡Listo! Te vamos a escribir. 🍷</span>
            ) : (
              <form className="news-form" onSubmit={subscribeNews}>
                <input type="email" placeholder="tu@email.com" value={news} onChange={(e) => setNews(e.target.value)} required />
                <button className="btn btn-primary" type="submit">Suscribirme</button>
              </form>
            )}
          </div>
          <div className="age-strip">
            <span className="age-num">+18</span>
            <p>
              <b>Beber con moderación.</b> Prohibida la venta de bebidas alcohólicas a menores de 18 años
              (Ley Nacional 24.788). Si vas a manejar, no tomes.
            </p>
          </div>
          <div>
            © 2026 We · Cava &amp; Gourmet — Crespo, Entre Ríos ·{" "}
            <a href="https://wecavagourmet.com">Volver al inicio</a>
          </div>
        </div>
      </footer>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
