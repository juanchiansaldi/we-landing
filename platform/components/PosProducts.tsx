"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { posSaveProduct, posDeleteProduct } from "../app/pos/actions";

type Cat = { id: string; name: string };
type Sup = { id: string; name: string };
type Row = {
  id: string; sku: string; barcode: string; name: string; brand: string;
  categoryId: string; categoryName: string; supplierId: string; supplierName: string;
  price: number; promo: number | null; priceCase: number | null; cost: number | null; unitsPerCase: number;
  stock: number; stockMin: number; varietal: string; vintage: number | null;
  abv: number | null; volumeMl: number; highValue: boolean; active: boolean; shortDesc: string; img: string;
};

const EMPTY: Row = {
  id: "", sku: "", barcode: "", name: "", brand: "", categoryId: "", categoryName: "",
  supplierId: "", supplierName: "", price: 0, promo: null, priceCase: null, cost: null, unitsPerCase: 6,
  stock: 0, stockMin: 0, varietal: "", vintage: null, abv: null, volumeMl: 750,
  highValue: false, active: true, shortDesc: "", img: "",
};

const money = (n: number | null) => (n == null ? "—" : "$ " + n.toLocaleString("es-AR"));

export default function PosProducts({
  products, categories, suppliers,
}: { products: Row[]; categories: Cat[]; suppliers: Sup[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Row | null>(null);
  const [q, setQ] = useState("");
  const [pending, start] = useTransition();
  const [importing, setImporting] = useState(false);
  const [imgVal, setImgVal] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openEditor(row: Row) {
    setImgVal(row.img || "");
    setEditing(row);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) setImgVal(j.url);
      else alert(j.error || "No se pudo subir la imagen");
    } catch {
      alert("No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return products;
    const t = q.toLowerCase();
    return products.filter((p) =>
      `${p.name} ${p.brand} ${p.sku} ${p.barcode} ${p.categoryName} ${p.varietal}`.toLowerCase().includes(t)
    );
  }, [products, q]);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      await posSaveProduct(fd);
      setEditing(null);
      router.refresh();
    });
  }
  function onDelete(row: Row) {
    if (!confirm(`¿Borrar "${row.name}"?`)) return;
    const fd = new FormData();
    fd.set("id", row.id);
    start(async () => {
      await posDeleteProduct(fd);
      router.refresh();
    });
  }

  async function onImport(file: File) {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/pos/import", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        alert(`Importación lista: ${j.created || 0} creados, ${j.updated || 0} actualizados.${j.errors ? ` ${j.errors} con error.` : ""}`);
        router.refresh();
      } else {
        alert(j.error || "No se pudo importar.");
      }
    } catch {
      alert("No se pudo importar el archivo.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const lowStock = (r: Row) => r.active && r.stock <= r.stockMin;

  return (
    <div className="pos-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">Gestión</span>
          <h1 className="serif">Productos</h1>
        </div>
        <div className="admin-top-actions">
          <a className="btn btn-ghost" href="/api/pos/plantilla">Plantilla Excel</a>
          <a className="btn btn-ghost" href="/api/pos/export">Exportar</a>
          <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
            {importing ? "Importando…" : "Importar Excel"}
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden disabled={importing}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); }} />
          </label>
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ ...EMPTY })}>+ Nuevo</button>
        </div>
      </header>

      <div className="toolbar" style={{ marginBottom: 14 }}>
        <span className="count"><b>{filtered.length}</b> de {products.length}</span>
        <div className="search-box" style={{ maxWidth: 360 }}>
          <input type="search" placeholder="Buscar por nombre, SKU, código, bodega…" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: "1.1rem" }} />
        </div>
      </div>

      <div className="admin-table">
        <div className="admin-tr admin-th" style={{ gridTemplateColumns: "1fr 1.6fr 1fr .7fr .7fr .6fr 1fr" }}>
          <span>SKU / Código</span><span>Producto</span><span>Categoría</span>
          <span>Precio</span><span>Costo</span><span>Stock</span><span></span>
        </div>
        {filtered.length === 0 && <div className="admin-empty">Sin productos. Creá el primero o importá un Excel.</div>}
        {filtered.map((p) => (
          <div className="admin-tr" key={p.id} style={{ gridTemplateColumns: "1fr 1.6fr 1fr .7fr .7fr .6fr 1fr" }}>
            <span style={{ fontSize: ".78rem" }}>
              <b>{p.sku || "—"}</b>{p.barcode ? <em style={{ display: "block", color: "var(--gray)", fontStyle: "normal" }}>{p.barcode}</em> : null}
            </span>
            <span className="admin-name">
              <b>{p.name}</b>
              {(p.brand || p.varietal || p.vintage) && <em>{[p.brand, p.varietal, p.vintage].filter(Boolean).join(" · ")}</em>}
              {p.highValue && <em style={{ color: "var(--red)" }}>★ Alto valor</em>}
            </span>
            <span>{p.categoryName || "—"}</span>
            <span>
              {p.promo != null ? (<><s style={{ color: "var(--gray)", fontSize: ".78rem" }}>{money(p.price)}</s> <b style={{ color: "var(--red)" }}>{money(p.promo)}</b></>) : money(p.price)}
            </span>
            <span style={{ color: "var(--gray)" }}>{money(p.cost)}</span>
            <span className={lowStock(p) ? "admin-nostock" : ""}>{p.stock}{lowStock(p) ? " ⚠" : ""}</span>
            <span className="admin-row-actions">
              <button type="button" onClick={() => openEditor(p)}>Editar</button>
              <button type="button" className="admin-del" onClick={() => onDelete(p)}>Borrar</button>
            </span>
          </div>
        ))}
      </div>

      {editing && (
        <div className="admin-modal" onClick={() => !pending && setEditing(null)}>
          <form className="admin-card admin-editor" style={{ width: "min(720px,100%)" }} onClick={(e) => e.stopPropagation()} onSubmit={onSave}>
            <h2 className="serif">{editing.id ? "Editar producto" : "Nuevo producto"}</h2>
            <input type="hidden" name="id" defaultValue={editing.id} />

            <label>Nombre *<input name="name" defaultValue={editing.name} required autoFocus /></label>

            <div className="admin-grid2">
              <label>SKU interno {editing.id ? "" : <span className="admin-opt">se genera solo si lo dejás vacío</span>}
                <input name="sku" defaultValue={editing.sku} placeholder="WE-000123" /></label>
              <label>Código de barras (EAN)<input name="barcode" defaultValue={editing.barcode} placeholder="7790000000000" /></label>
            </div>

            <div className="admin-grid2">
              <label>Bodega / marca<input name="brand" defaultValue={editing.brand} /></label>
              <label>Categoría
                <select name="categoryId" defaultValue={editing.categoryId}>
                  <option value="">— Sin categoría —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <div className="admin-grid2">
              <label>Varietal<input name="varietal" defaultValue={editing.varietal} placeholder="Malbec, Cabernet…" /></label>
              <label>Proveedor
                <select name="supplierId" defaultValue={editing.supplierId}>
                  <option value="">— Sin proveedor —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>

            <div className="admin-grid3">
              <label>Añada<input name="vintage" type="number" defaultValue={editing.vintage ?? ""} placeholder="2022" /></label>
              <label>Alcohol %<input name="abv" defaultValue={editing.abv ?? ""} placeholder="13.5" /></label>
              <label>Volumen ml<input name="volumeMl" type="number" defaultValue={editing.volumeMl} /></label>
            </div>

            <div className="admin-grid2">
              <label>Precio botella ($)<input name="price" type="number" min="0" defaultValue={editing.price} /></label>
              <label>Precio con descuento ($) <span className="admin-opt">promo, opcional</span>
                <input name="promo" type="number" min="0" defaultValue={editing.promo ?? ""} placeholder="vacío = sin promo" /></label>
            </div>
            <div className="admin-grid2">
              <label>Precio caja ($)<input name="priceCase" type="number" min="0" defaultValue={editing.priceCase ?? ""} /></label>
              <label>Costo ($)<input name="cost" type="number" min="0" defaultValue={editing.cost ?? ""} /></label>
            </div>

            <div className="admin-grid3">
              <label>Unid. por caja<input name="unitsPerCase" type="number" min="1" defaultValue={editing.unitsPerCase} /></label>
              <label>Stock (botellas)<input name="stock" type="number" defaultValue={editing.stock} /></label>
              <label>Stock mínimo<input name="stockMin" type="number" min="0" defaultValue={editing.stockMin} /></label>
            </div>

            <label>Descripción corta<input name="shortDesc" defaultValue={editing.shortDesc} /></label>

            <label>Foto del producto
              <div className="img-upload">
                <div className="img-prev">
                  {imgVal ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imgVal} alt="" />
                  ) : (<i>We</i>)}
                </div>
                <div className="img-upload-ctrl">
                  <label className="img-file-btn">
                    {uploading ? "Subiendo…" : "Subir foto"}
                    <input type="file" accept="image/*" disabled={uploading}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
                  </label>
                  <input name="img" value={imgVal} onChange={(e) => setImgVal(e.target.value)} placeholder="o pegá una URL" />
                </div>
              </div>
            </label>

            <div className="admin-checks">
              <label className="admin-check"><input type="checkbox" name="highValue" defaultChecked={editing.highValue} /> Alto valor ★</label>
              <label className="admin-check"><input type="checkbox" name="active" defaultChecked={editing.active} /> Activo</label>
            </div>

            <div className="admin-editor-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)} disabled={pending}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
