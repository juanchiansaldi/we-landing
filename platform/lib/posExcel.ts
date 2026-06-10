// Columnas del Excel de productos (mismas para plantilla, exportar e importar).
export const COLS = [
  "SKU",
  "Codigo_Barras",
  "Nombre",
  "Bodega",
  "Categoria",
  "Varietal",
  "Anada",
  "Alcohol",
  "Volumen_ml",
  "Precio_Botella",
  "Precio_Caja",
  "Costo",
  "Unidades_x_Caja",
  "Stock",
  "Stock_Minimo",
  "Alto_Valor",
  "Activo",
] as const;

export const EXAMPLE_ROW: Record<string, string | number> = {
  SKU: "",
  Codigo_Barras: "7791234567890",
  Nombre: "Malbec Reserva 2022",
  Bodega: "Finca Ejemplo",
  Categoria: "Tintos",
  Varietal: "Malbec",
  Anada: 2022,
  Alcohol: 14,
  Volumen_ml: 750,
  Precio_Botella: 12500,
  Precio_Caja: 67000,
  Costo: 7800,
  Unidades_x_Caja: 6,
  Stock: 24,
  Stock_Minimo: 6,
  Alto_Valor: "No",
  Activo: "Si",
};

export function productToRow(p: any): Record<string, any> {
  return {
    SKU: p.sku || "",
    Codigo_Barras: p.barcode || "",
    Nombre: p.name,
    Bodega: p.brand || "",
    Categoria: p.category?.name || "",
    Varietal: p.varietal || "",
    Anada: p.vintage ?? "",
    Alcohol: p.abv ?? "",
    Volumen_ml: p.volumeMl ?? "",
    Precio_Botella: p.price ?? 0,
    Precio_Caja: p.priceCase ?? "",
    Costo: p.cost ?? "",
    Unidades_x_Caja: p.unitsPerCase ?? 6,
    Stock: p.stock ?? 0,
    Stock_Minimo: p.stockMin ?? 0,
    Alto_Valor: p.highValue ? "Si" : "No",
    Activo: p.active ? "Si" : "No",
  };
}

const yes = (v: any) => /^(si|sí|s|yes|y|true|1)$/i.test(String(v ?? "").trim());
const int = (v: any) => {
  const n = Math.round(Number(String(v ?? "").replace(/[^\d.-]/g, "")));
  return Number.isFinite(n) ? n : null;
};
const flt = (v: any) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n : null;
};

/** Convierte una fila del Excel a los campos del producto (sin categoría resuelta aún). */
export function rowToFields(r: Record<string, any>) {
  return {
    sku: String(r.SKU ?? "").trim() || null,
    barcode: String(r.Codigo_Barras ?? "").trim() || null,
    name: String(r.Nombre ?? "").trim(),
    brand: String(r.Bodega ?? "").trim() || null,
    categoria: String(r.Categoria ?? "").trim(),
    varietal: String(r.Varietal ?? "").trim() || null,
    vintage: int(r.Anada),
    abv: flt(r.Alcohol),
    volumeMl: int(r.Volumen_ml) ?? 750,
    price: int(r.Precio_Botella) ?? 0,
    priceCase: int(r.Precio_Caja),
    cost: int(r.Costo),
    unitsPerCase: int(r.Unidades_x_Caja) ?? 6,
    stock: int(r.Stock) ?? 0,
    stockMin: int(r.Stock_Minimo) ?? 0,
    highValue: yes(r.Alto_Valor),
    active: r.Activo == null || String(r.Activo).trim() === "" ? true : yes(r.Activo),
  };
}
