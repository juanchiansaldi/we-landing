"use client";

import { useEffect, useMemo, useState } from "react";
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
  search: "M21 21l-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z",
  check: "M20 6 9 17l-5-5",
  truck: "M3 6h13v9H3V6Zm13 3h4l2 3v3h-6V9ZM7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
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

export default function Storefront({ store, products, cats }: Props) {
  const [search, setSearch] = useState("");
  const [activeCats, setActiveCats] = useState<string[]>([]);
  const [onlyOffer, setOnlyOffer] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [quick, setQuick] = useState<Quick>("");
  const [sort, setSort] = useState<SortKey>("rel");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [added, setAdded] = useState<string | null>(null);

  // cargar carrito de localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart]
  );

  function addToCart(p: StoreProduct) {
    if (!p.stock) return;
    setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }));
    setAdded(p.id);
    setTimeout(() => setAdded((cur) => (cur === p.id ? null : cur)), 1100);
  }

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
      if (quick === "ofertas" && p.promo == null) return false;
      if (quick === "novedades" && !p.nuevo) return false;
      if (quick === "combos" && !isCombo(p)) return false;
      return true;
    });

    const priceOf = (p: StoreProduct) => p.promo ?? p.price;
    if (sort === "price-asc") list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
    else if (sort === "price-desc") list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    return list;
  }, [products, search, activeCats, onlyOffer, onlyNew, quick, sort]);

  function setQuickFilter(q: Quick) {
    setQuick((cur) => (cur === q ? "" : q));
  }

  return (
    <>
      <nav>
        <span className="nav-logo">{store.name}</span>
        <div className="nav-right">
          <div className="nav-links">
            <a href="#" className="active">Tienda</a>
            <a href="/#club">Club We</a>
          </div>
          <button className="cart-btn" type="button">
            <Icon d={ICONS.cart} />
            Carrito
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </nav>

      <header className="shop">
        <div className="wrap">
          <div className="shop-head shop-head-top">
            <div className="shop-head-text">
              <span className="eyebrow">Cava · Tienda online</span>
              <h1>
                Llevá la góndola <b>a casa</b>.
              </h1>
              <p>
                Vinos, espumantes, quesos y gourmet seleccionados. Comprá online y lo
                coordinamos por WhatsApp.
              </p>
            </div>
            <div className="shop-ship">
              <span>
                <Icon d={ICONS.truck} /> <b>24–48 hs</b>&nbsp;en Crespo
              </span>
              <span>
                <Icon d={ICONS.truck} /> <b>2–4 días</b>&nbsp;resto del país
              </span>
            </div>
          </div>

          <div className="promo-mosaic">
            <button
              type="button"
              className={`pm-tile${quick === "ofertas" ? " pm-active" : ""}`}
              onClick={() => setQuickFilter("ofertas")}
            >
              <span className="pm-k">Precio especial</span>
              <h3>Ofertas</h3>
              <span className="pm-go">Ver lo rebajado →</span>
            </button>
            <button
              type="button"
              className={`pm-tile${quick === "combos" ? " pm-active" : ""}`}
              onClick={() => setQuickFilter("combos")}
            >
              <span className="pm-k">Armados</span>
              <h3>Combos</h3>
              <span className="pm-go">Cajas y maridajes →</span>
            </button>
            <button
              type="button"
              className={`pm-tile${quick === "novedades" ? " pm-active" : ""}`}
              onClick={() => setQuickFilter("novedades")}
            >
              <span className="pm-k">Recién llegados</span>
              <h3>Novedades</h3>
              <span className="pm-go">Lo último que entró →</span>
            </button>
          </div>

          <div className="shop-layout">
            <aside className="filters">
              <div className="fgroup">
                <h4>Categorías</h4>
                {cats.map((c) => (
                  <label className="fopt" key={c}>
                    <input
                      type="checkbox"
                      checked={activeCats.includes(c)}
                      onChange={() => toggleCat(c)}
                    />
                    <span className="fbox">
                      <Icon d={ICONS.check} />
                    </span>
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
              </div>
              <button className="fclear" type="button" onClick={clearFilters}>
                Limpiar filtros
              </button>
            </aside>

            <div className="shop-main">
              <div className="toolbar">
                <span className="count">
                  <b>{filtered.length}</b> producto{filtered.length === 1 ? "" : "s"}
                </span>
                <div className="search-box">
                  <Icon d={ICONS.search} />
                  <input
                    type="search"
                    placeholder="Buscar vino, bodega, queso…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
                    <article className="pcard" key={p.id}>
                      <div className={`pcard-media${p.img ? "" : " ph"}`}>
                        {!p.stock && <span className="pbadge out">Sin stock</span>}
                        {p.stock && p.nuevo && <span className="pbadge">Nuevo</span>}
                        {p.stock && !p.nuevo && sale && <span className="pbadge">Oferta</span>}
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
                            <span className={`now${sale ? " sale" : ""}`}>
                              {fmt(p.promo ?? p.price)}
                            </span>
                          </div>
                          <button
                            className="padd"
                            type="button"
                            disabled={!p.stock}
                            onClick={() => addToCart(p)}
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
    </>
  );
}
