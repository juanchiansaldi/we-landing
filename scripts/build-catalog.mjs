// Genera assets/data/products.json con 30 productos reales (sin frames).
// Cada img apunta a ./assets/img/productos/<id>.webp (las genera Higgsfield).
import { writeFileSync } from "node:fs";

const IMG = (id) => `./assets/img/productos/${id}.webp`;
const m = (...pairs) => pairs.map(([k, v]) => ({ k, v }));

// id, name, brand, cat, price, promo, img, nuevo, notes, desc, meta
const P = [
  // ───────── TINTOS (8) ─────────
  ["malbec-gr", "Malbec Gran Reserva", "Finca We", "Tintos", 15900, null, "malbec", false,
    "Valle de Uco, 12 meses de roble. Ciruela, vainilla y final largo.",
    "Nuestro Malbec insignia: uvas del Valle de Uco y 12 meses de crianza en roble francés. Ciruela madura, vainilla y chocolate, con taninos pulidos y un final largo y goloso. El que nunca falla en la mesa.",
    m(["Región", "Valle de Uco, Mendoza"], ["Cosecha", "2021"], ["Crianza", "12 meses en roble"], ["Graduación", "14,5%"])],
  ["cabfranc", "Cabernet Franc", "Casa del Valle", "Tintos", 14800, null, "vino-tinto", true,
    "Pimienta negra y frutos rojos. Elegante y especiado.",
    "El Cabernet Franc que enamora a los curiosos: pimienta negra, frutos rojos y un toque herbal muy elegante. Fresco, vertical y con personalidad. Va con cordero, hongos y platos especiados.",
    m(["Región", "Valle de Uco, Mendoza"], ["Cosecha", "2022"], ["Crianza", "10 meses en roble"], ["Graduación", "13,5%"])],
  ["bonarda", "Bonarda de Autor", "Viñas del Este", "Tintos", 11500, 9900, "bonarda", false,
    "Jugosa y frutal. La sorpresa simpática de la cava.",
    "Bonarda de productor chico: violetas, cereza y mora, con una boca jugosa y amable. Poca madera, mucha fruta. Ideal para todos los días, pizzas y picadas.",
    m(["Región", "San Rafael, Mendoza"], ["Cosecha", "2022"], ["Crianza", "Sin roble"], ["Graduación", "13%"])],
  ["blend-roble", "Blend de Roble", "Finca We", "Tintos", 17200, null, "blend-tinto", false,
    "Corte Malbec–Cabernet. Estructura y elegancia.",
    "Un corte clásico Malbec y Cabernet Sauvignon criado en roble. Estructura, frutos negros y especias dulces. Redondo y con cuerpo, para una buena carne.",
    m(["Región", "Luján de Cuyo, Mendoza"], ["Cosecha", "2021"], ["Crianza", "14 meses en roble"], ["Graduación", "14%"])],
  ["malbec-joven", "Malbec Joven", "Casa del Valle", "Tintos", 9200, null, "vino-tinto", false,
    "Fruta pura, sin madera. Fácil y rico.",
    "Malbec de entrada de gama hecho con cariño: pura fruta roja, fresco y sin madera. El tinto de descorche fácil para cualquier momento.",
    m(["Región", "Mendoza"], ["Cosecha", "2023"], ["Crianza", "Sin roble"], ["Graduación", "13%"])],
  ["syrah", "Syrah", "Bodega del Sol", "Tintos", 13200, null, "syrah", true,
    "Pimienta, ciruela y un fondo ahumado.",
    "Syrah de zona cálida: ciruela, pimienta negra y un fondo ahumado muy seductor. Carnoso y especiado, pide asados y quesos estacionados.",
    m(["Región", "San Juan"], ["Cosecha", "2022"], ["Crianza", "8 meses en roble"], ["Graduación", "14%"])],
  ["pinot-noir", "Pinot Noir", "Patagonia Wines", "Tintos", 18900, null, "pinot-noir", true,
    "Delicado y sedoso. Frutos rojos frescos.",
    "Pinot Noir patagónico: frutilla, cereza y un perfil floral muy fino. Cuerpo liviano, sedoso y elegante. Brilla con salmón, pastas y picadas suaves.",
    m(["Región", "Río Negro, Patagonia"], ["Cosecha", "2022"], ["Crianza", "10 meses en roble"], ["Graduación", "13%"])],
  ["cabernet", "Cabernet Sauvignon", "Finca We", "Tintos", 14200, null, "cabernet", false,
    "Frutos negros y mentol. Clásico y firme.",
    "Cabernet Sauvignon de manual: cassis, pimiento y mentol, con taninos firmes y final persistente. Un tinto serio para carnes rojas y guisos.",
    m(["Región", "Valle de Uco, Mendoza"], ["Cosecha", "2021"], ["Crianza", "12 meses en roble"], ["Graduación", "14%"])],

  // ───────── BLANCOS & ROSADOS (5) ─────────
  ["torrontes", "Torrontés Salteño", "Altura Norte", "Blancos & Rosados", 9800, null, "torrontes", true,
    "Aromático y floral. Fresco como pocos.",
    "Torrontés de altura: jazmín, durazno y cáscara de naranja. Aromático en nariz y seco y fresco en boca. Perfecto como aperitivo o con comida tailandesa y picante.",
    m(["Región", "Cafayate, Salta"], ["Cosecha", "2023"], ["Crianza", "Sin roble"], ["Graduación", "12,5%"])],
  ["chardonnay", "Chardonnay", "Finca We", "Blancos & Rosados", 12600, null, "chardonnay", false,
    "Cremoso, con notas de manteca y fruta blanca.",
    "Chardonnay con paso por roble: manzana, durazno y un fondo cremoso de manteca y vainilla. Untuoso y equilibrado. Va con pollo, pastas con crema y quesos suaves.",
    m(["Región", "Valle de Uco, Mendoza"], ["Cosecha", "2022"], ["Crianza", "6 meses en roble"], ["Graduación", "13,5%"])],
  ["sauvignon", "Sauvignon Blanc", "Bodega del Sol", "Blancos & Rosados", 11200, 9500, "sauvignon", false,
    "Cítrico y herbal. Súper refrescante.",
    "Sauvignon Blanc bien tenso: pomelo, lima y notas herbales. Acidez vibrante y final limpio. El blanco ideal para mariscos, ensaladas y días de calor.",
    m(["Región", "Mendoza"], ["Cosecha", "2023"], ["Crianza", "Sin roble"], ["Graduación", "12,5%"])],
  ["rosado", "Rosado de Malbec", "Casa del Valle", "Blancos & Rosados", 9600, null, "rosado", false,
    "Frutillas y flores. Seco y muy fácil.",
    "Rosado de Malbec con color piel de cebolla: frutilla, sandía y un toque floral. Seco, fresco y liviano. El comodín para picar, brindar o acompañar sushi.",
    m(["Región", "Mendoza"], ["Cosecha", "2023"], ["Crianza", "Sin roble"], ["Graduación", "12,5%"])],
  ["vino-natural", "Vino Naranjo Natural", "Terruño Vivo", "Blancos & Rosados", 16800, null, "vino-natural", true,
    "Baja intervención. Distinto y vivo.",
    "Vino naranjo de elaboración natural, con maceración con hollejos: notas de té, orejones y hierbas. Sin filtrar, baja intervención, biodinámico. Para los que buscan algo diferente.",
    m(["Región", "Mendoza"], ["Cosecha", "2023"], ["Crianza", "Ánfora"], ["Graduación", "12%"])],

  // ───────── ESPUMANTES (4) ─────────
  ["brut-nature", "Brut Nature", "Finca We", "Espumantes", 13900, null, "brut", false,
    "Método tradicional, burbuja fina y bien seco.",
    "Espumante método tradicional, sin azúcar agregado: burbuja fina, cítricos y panificados. Seco, elegante y filoso. El que nunca falla para brindar.",
    m(["Región", "Mendoza"], ["Método", "Tradicional"], ["Dosaje", "Nature"], ["Graduación", "12%"])],
  ["extra-brut", "Extra Brut", "Casa del Valle", "Espumantes", 11500, null, "espumante", false,
    "Equilibrado y frutal. Para cualquier brindis.",
    "Extra Brut fresco y frutal: manzana verde, pera y un dulzor justo. Versátil y simpático, va con todo: desde un brindis hasta una picada.",
    m(["Región", "Mendoza"], ["Método", "Charmat"], ["Dosaje", "Extra Brut"], ["Graduación", "12,5%"])],
  ["espumante-rose", "Espumante Rosé", "Bodega del Sol", "Espumantes", 12900, null, "espumante-rosado", true,
    "Rosado y festivo. Frutillas y burbuja.",
    "Espumante rosado de Pinot Noir: frutilla, cereza y una burbuja delicada. Festivo y coqueto, perfecto para celebraciones y postres frutales.",
    m(["Región", "Mendoza"], ["Método", "Charmat"], ["Dosaje", "Brut"], ["Graduación", "12,5%"])],
  ["dulce-natural", "Espumante Dulce", "Casa del Valle", "Espumantes", 10200, 8900, "espumante", false,
    "Dulce y aromático. Ideal para el postre.",
    "Espumante dulce natural: durazno, miel y flores. Bien aromático y goloso. El compañero perfecto de la mesa dulce y los panes navideños.",
    m(["Región", "Mendoza"], ["Método", "Charmat"], ["Dosaje", "Dulce"], ["Graduación", "11,5%"])],

  // ───────── QUESOS & FIAMBRES (4) ─────────
  ["queso-estac", "Tabla de Quesos Estacionados", "La Estancia", "Quesos & Fiambres", 13500, null, "queso-estac", false,
    "Selección de estacionados y semiduros.",
    "Selección de quesos estacionados de campo: un sardo, un gruyere criollo y un azul suave. Cortados y listos para la tabla. Maridan con tintos con cuerpo y dulces.",
    m(["Contenido", "3 quesos · 400 g"], ["Origen", "Entre Ríos"], ["Conservar", "Frío, 0–5 °C"])],
  ["salame", "Salame Colonia", "Don Aldo", "Quesos & Fiambres", 7800, null, "salame", false,
    "Estacionado, especiado y artesanal.",
    "Salame colonia artesanal, estacionado en bodega: grano fino, justo de sal y bien especiado. De productor de la zona. Imprescindible en cualquier picada.",
    m(["Peso", "± 300 g"], ["Origen", "Colonia Crespo"], ["Estacionamiento", "60 días"])],
  ["jamon-crudo", "Jamón Crudo", "Don Aldo", "Quesos & Fiambres", 11900, null, "jamon", true,
    "Curado lento, fetas finas. Puro sabor.",
    "Jamón crudo curado lento y cortado en fetas finas: dulce, salado y profundo. El lujo accesible de la picada. Brilla con un espumante o un tinto frutal.",
    m(["Peso", "150 g fileteado"], ["Origen", "Argentina"], ["Curado", "12 meses"])],
  ["antipasto-fiambre", "Bondiola Ahumada", "Don Aldo", "Quesos & Fiambres", 9400, null, "antipasto", false,
    "Ahumada y tierna. Para tablas y sándwiches.",
    "Bondiola ahumada a leña, tierna y sabrosa. Cortada fina para la tabla o gruesa para un buen sándwich. Ahumado natural, sin apuro.",
    m(["Peso", "± 250 g"], ["Origen", "Entre Ríos"], ["Ahumado", "A leña"])],

  // ───────── DULCES & CHOCOLATES (4) ─────────
  ["choco70", "Chocolate 70% Cacao", "Cacao Sur", "Dulces & Chocolates", 6800, null, "choco70", false,
    "Intenso y amargo. Tableta artesanal.",
    "Tableta de chocolate 70% cacao, artesanal y de origen: intenso, apenas amargo y muy aromático. El final dulce que pide un tinto de guarda o un espumante dulce.",
    m(["Peso", "100 g"], ["Cacao", "70%"], ["Origen", "Sudamérica"])],
  ["dulce-membr", "Dulce de Membrillo", "La Estancia", "Dulces & Chocolates", 4900, null, "dulce-membr", false,
    "Casero, firme y bien frutado.",
    "Dulce de membrillo casero, firme y de color rubí: el clásico del postre criollo. Cortalo con un queso estacionado y listo: vigilante perfecto.",
    m(["Peso", "500 g"], ["Origen", "Entre Ríos"], ["Sin", "Conservantes"])],
  ["alfajores", "Alfajores de Maicena", "Doña Marta", "Dulces & Chocolates", 5600, 4800, "alfajores", true,
    "Rellenos de dulce de leche y coco.",
    "Caja de alfajores de maicena artesanales: tapa que se deshace, dulce de leche repostero y coco en el borde. Hechos a mano, como los de la abuela.",
    m(["Contenido", "6 unidades"], ["Origen", "Crespo"], ["Sin", "Conservantes"])],
  ["mermelada", "Mermelada Artesanal", "La Estancia", "Dulces & Chocolates", 4200, null, "mermelada", false,
    "Frutos rojos. Sin conservantes.",
    "Mermelada artesanal de frutos rojos, con fruta de verdad y poca azúcar. Pedacitos enteros y mucho sabor. Para el desayuno o para acompañar quesos.",
    m(["Peso", "350 g"], ["Sabor", "Frutos rojos"], ["Sin", "Conservantes"])],

  // ───────── CONSERVAS (3) ─────────
  ["aceite-oliva", "Aceite de Oliva Extra Virgen", "Olivares del Sur", "Conservas", 12500, null, "aceite-oliva", false,
    "Primera prensada en frío. Frutado intenso.",
    "Aceite de oliva extra virgen, primera prensada en frío: frutado, con un picor noble y un amargor justo. Botella oscura para cuidarlo. Para terminar platos y ensaladas.",
    m(["Volumen", "500 ml"], ["Variedad", "Arbequina"], ["Acidez", "0,3%"])],
  ["aceitunas", "Aceitunas & Picada", "Olivares del Sur", "Conservas", 5200, null, "aceitunas", false,
    "Verdes y negras en conserva, listas.",
    "Aceitunas verdes y negras en salmuera de hierbas, listas para la picada. Carnosas y bien condimentadas. Abrís el frasco y ya tenés mesa.",
    m(["Peso", "330 g escurrido"], ["Origen", "Mendoza"], ["Tipo", "Verdes y negras"])],
  ["antipasto", "Antipasto de la Casa", "Olivares del Sur", "Conservas", 6900, 5900, "antipasto", true,
    "Vegetales en aceite, agridulce.",
    "Antipasto casero de vegetales en aceite de oliva: berenjenas, morrón, zanahoria y hierbas. Agridulce y sabroso. Sobre pan tostado es un golazo.",
    m(["Peso", "350 g"], ["Origen", "Entre Ríos"], ["Conservar", "Frío tras abrir"])],

  // ───────── CAJAS & REGALOS (2) ─────────
  ["caja-gourmet", "Caja Descubrimiento", "We · Cava", "Cajas & Regalos", 42000, 38000, "caja-gourmet", false,
    "6 botellas elegidas a mano. El regalo perfecto.",
    "Caja curada de 6 botellas elegidas a mano: tintos, un blanco y un espumante para arrancar. Viene con ficha de cata y presentación de regalo. Para descubrir o para regalar.",
    m(["Contenido", "6 botellas"], ["Regiones", "3"], ["Incluye", "Ficha de cata"])],
  ["caja-vinos", "Caja Picada We", "We · Cava", "Cajas & Regalos", 36500, null, "caja-vinos", true,
    "Vino, queso y fiambre. Mesa lista.",
    "La caja para armar la mesa sin pensar: 2 botellas, una tabla de quesos, un salame y aceitunas. Todo listo para descorchar y picar. Ideal para una noche con amigos.",
    m(["Contenido", "2 vinos + tabla"], ["Sirve", "4–6 personas"], ["Incluye", "Quesos y fiambres"])],
];

const products = P.map(([id, name, brand, cat, price, promo, imgId, nuevo, notes, desc, meta]) => ({
  id, name, brand, cat, price, promo, img: IMG(imgId),
  stock: true, nuevo, notes, desc, meta,
}));

writeFileSync("assets/data/products.json", JSON.stringify({ products }, null, 2));
console.log(`✓ products.json con ${products.length} productos`);
// listar imágenes únicas necesarias
const imgs = [...new Set(P.map((p) => p[6]))];
console.log(`Imágenes únicas: ${imgs.length}`);
console.log(imgs.join(" "));
