/* ============================================================
   We · Cava — Catálogo de productos
   ------------------------------------------------------------
   Esta es la "fuente de la verdad" de la tienda. Para sumar,
   editar o sacar productos, modificá este archivo.

   Campos:
     id     : identificador único (sin espacios)
     name   : nombre del producto
     brand  : marca / bodega
     cat    : categoría (debe coincidir con las de abajo)
     price  : precio en pesos (número, sin puntos)
     promo  : precio promocional (número) o null si no está en promo
     img    : ruta a la imagen, o null para usar el placeholder
     notes  : descripción corta
     stock  : true/false (si está disponible)

   Categorías válidas (CATS): editá esta lista si querés otras.
   ============================================================ */

window.WE_CATS = ['Tintos', 'Blancos & Rosados', 'Espumantes', 'Quesos & Fiambres', 'Dulces & Chocolates', 'Conservas', 'Cajas & Regalos'];

window.WE_PRODUCTS = [
  { id:'malbec-gr',     name:'Malbec Gran Reserva',      brand:'Finca Altura',    cat:'Tintos',              price:11500, promo:9900,  img:'./assets/frames/we-0010.webp', notes:'Valle de Uco · 12 meses de roble. Ciruela y vainilla.', stock:true },
  { id:'cabfranc',      name:'Cabernet Franc',           brand:'Casa del Valle',  cat:'Tintos',              price:13800, promo:null,  img:'./assets/frames/we-0030.webp', notes:'Pimienta y frutos negros. Para guardar.', stock:true },
  { id:'bonarda',       name:'Bonarda de Autor',         brand:'Norte Vivo',      cat:'Tintos',              price:8900,  promo:null,  img:'./assets/frames/we-0185.webp', notes:'Jugoso y goloso. El tinto de todos los días.', stock:true },
  { id:'blend-roble',   name:'Blend Roble',              brand:'Finca Altura',    cat:'Tintos',              price:15600, promo:null,  img:'./assets/frames/we-0120.webp', notes:'Malbec, Cabernet y Petit Verdot. Final largo.', stock:true },
  { id:'chardonnay',    name:'Chardonnay',               brand:'La Delfina',      cat:'Blancos & Rosados',   price:9200,  promo:null,  img:'./assets/frames/we-0150.webp', notes:'Fresco, con paso por madera. Cítricos y manteca.', stock:true },
  { id:'torrontes',     name:'Torrontés Salteño',        brand:'Cafayate Alto',   cat:'Blancos & Rosados',   price:7800,  promo:6500,  img:null, notes:'Aromático y floral. De altura, bien fresco.', stock:true },
  { id:'rosado',        name:'Rosado de Malbec',         brand:'Casa del Valle',  cat:'Blancos & Rosados',   price:7400,  promo:null,  img:null, notes:'Frutillas y un final seco. Para el verano.', stock:true },
  { id:'brut-nature',   name:'Brut Nature',              brand:'We · Casa',       cat:'Espumantes',          price:9200,  promo:null,  img:'./assets/frames/we-0088.webp', notes:'Método tradicional, burbuja fina y bien seco.', stock:true },
  { id:'extra-brut',    name:'Extra Brut Rosé',          brand:'La Delfina',      cat:'Espumantes',          price:11200, promo:null,  img:'./assets/frames/we-0097.webp', notes:'Elegante y festivo. Para brindar en serio.', stock:true },
  { id:'queso-estac',   name:'Queso estacionado 6m',     brand:'Tambo La Rosa',   cat:'Quesos & Fiambres',   price:6800,  promo:null,  img:null, notes:'Intenso, ideal para tabla con tintos.', stock:true },
  { id:'salame',        name:'Salame de campo',          brand:'Colonia Crespo',  cat:'Quesos & Fiambres',   price:5400,  promo:null,  img:null, notes:'Curado artesanal de la zona.', stock:true },
  { id:'choco70',       name:'Chocolate 70% cacao',      brand:'Cacao Sur',       cat:'Dulces & Chocolates', price:3900,  promo:2990,  img:null, notes:'Tableta intensa. Marida con tintos dulces.', stock:true },
  { id:'dulce-membr',   name:'Dulce de membrillo',       brand:'La Abuela',       cat:'Dulces & Chocolates', price:2800,  promo:null,  img:null, notes:'Casero, en pan. Con quesos, una fija.', stock:true },
  { id:'aceite-oliva',  name:'Aceite de oliva extra',    brand:'Olivares del Sol',cat:'Conservas',           price:5600,  promo:null,  img:null, notes:'Primera prensada en frío. Botella 500ml.', stock:true },
  { id:'antipasto',     name:'Antipasto de la casa',     brand:'We · Casa',       cat:'Conservas',           price:4200,  promo:null,  img:null, notes:'Vegetales en escabeche, receta propia.', stock:false },
  { id:'caja-descubr',  name:'Caja Descubrimiento x6',   brand:'We · Casa',       cat:'Cajas & Regalos',     price:42000, promo:37900, img:'./assets/frames/we-0045.webp', notes:'6 botellas elegidas a mano + ficha de cata.', stock:true },
  { id:'caja-gourmet',  name:'Caja Gourmet',             brand:'We · Casa',       cat:'Cajas & Regalos',     price:28500, promo:null,  img:null, notes:'2 vinos + quesos + dulces. Lista para regalar.', stock:true }
];

/* Datos para el checkout por transferencia / WhatsApp */
window.WE_SHOP = {
  whatsapp: '5493435172449',        // número de Andrés (sin +, sin espacios)
  alias: 'WE.CAVA.CRESPO',          // alias de transferencia (placeholder, cambialo)
  titular: 'We · Cava & Gourmet',
  envioNota: 'Envío sin cargo en Crespo a partir de $25.000. Coordinamos por WhatsApp.'
};
