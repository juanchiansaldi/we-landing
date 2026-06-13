"use client";

export const dynamic = "force-dynamic";

export default function ManualPage() {
  return (
    <div className="pos-wrap man-wrap">
      <header className="admin-top">
        <div>
          <span className="eyebrow">Ayuda</span>
          <h1 className="serif">Manual del sistema</h1>
          <p className="pos-muted">Cómo configurar We Cava y usarlo en el día a día. Tenelo de referencia.</p>
        </div>
        <div className="admin-top-actions">
          <button className="btn btn-ghost man-print-btn" type="button" onClick={() => window.print()}>🖨️ Imprimir / guardar PDF</button>
        </div>
      </header>

      {/* CONFIGURACIÓN INICIAL */}
      <section className="man-sec">
        <h2 className="serif"><span className="man-num-sec">1</span> Configuración inicial (se hace una sola vez)</h2>
        <p className="pos-muted">Seguí estos pasos en orden para dejar el sistema listo para vender.</p>
        <div className="man-steps">
          <a className="man-step" href="/admin/categorias">
            <span className="man-n">1</span>
            <div><b>Creá las categorías</b><p>Tintos, Blancos, Espumantes, Quesos, etc. Sirven para ordenar el catálogo y la tienda online.</p></div>
            <span className="man-go">Ir →</span>
          </a>
          <a className="man-step" href="/admin/proveedores">
            <span className="man-n">2</span>
            <div><b>Cargá tus proveedores</b><p>Bodegas y distribuidores a los que les comprás. Tip: pegá el link de Google Maps y autocompleta el nombre y la ubicación.</p></div>
            <span className="man-go">Ir →</span>
          </a>
          <a className="man-step" href="/admin/productos">
            <span className="man-n">3</span>
            <div><b>Cargá tus productos con precio y stock</b><p>Para cada uno: nombre, <b>precio</b> (lo que cobrás), <b>costo</b> (lo que te sale), <b>stock</b> (botellas que tenés), código de barras y foto. Uno por uno con el botón <b>+ Nuevo</b>, o muchos de una con <b>Importar Excel</b>.</p></div>
            <span className="man-go">Ir →</span>
          </a>
          <a className="man-step" href="/admin/combos">
            <span className="man-n">4</span>
            <div><b>Armá combos (opcional)</b><p>Ej. Fernet + 2 Cocas. Le ponés un margen y el precio sale solo; al venderlo descuenta el stock de cada componente.</p></div>
            <span className="man-go">Ir →</span>
          </a>
          <a className="man-step" href="/admin/usuarios">
            <span className="man-n">5</span>
            <div><b>Cargá vendedores (opcional)</b><p>Si tenés empleados, elegís un "vendedor activo" y cada venta queda firmada con quién la hizo.</p></div>
            <span className="man-go">Ir →</span>
          </a>
        </div>
      </section>

      {/* PRECIOS Y STOCK */}
      <section className="man-sec">
        <h2 className="serif">💰 Cómo cargar precios y stock</h2>
        <div className="man-grid">
          <div className="man-card"><b>Precio</b><p>Lo que le cobrás al cliente por botella. Si hacés una promo, cargá además el "precio con descuento".</p></div>
          <div className="man-card"><b>Costo</b><p>Lo que te cuesta a vos. Sirve para que Reportes calcule la ganancia real.</p></div>
          <div className="man-card"><b>Stock</b><p>Cuántas botellas tenés. El stock <b>solo se carga al crear</b> el producto; después se ajusta desde <a href="/admin/stock">Stock</a> y queda registrado.</p></div>
          <div className="man-card"><b>Precio por caja</b><p>Si vendés cajas cerradas, su precio. Una caja descuenta del stock las botellas que trae.</p></div>
        </div>
        <p className="man-tip">💡 <b>Carga masiva:</b> en Productos bajás la <b>plantilla Excel</b>, completás todo cómodo en la compu y la subís con <b>Importar</b>. Ideal para cargar muchos productos de una.</p>
      </section>

      {/* DÍA A DÍA */}
      <section className="man-sec">
        <h2 className="serif"><span className="man-num-sec">2</span> El día a día en el local</h2>
        <div className="man-flow">
          <a className="man-flow-step" href="/admin/caja"><span>1</span><b>Abrí la caja</b><p>Al empezar el día, con el fondo de cambio que dejás.</p></a>
          <a className="man-flow-step" href="/admin/vender"><span>2</span><b>Vendé</b><p>Escaneá el código de barras o tocá el producto. Elegí el pago y cobrá. El ticket se imprime solo si tildás "imprimir comprobante".</p></a>
          <a className="man-flow-step" href="/admin/ventas"><span>3</span><b>Anulá si hace falta</b><p>En Ventas ves el historial del mostrador; anular una venta repone el stock automáticamente.</p></a>
          <a className="man-flow-step" href="/admin/caja"><span>4</span><b>Cerrá la caja</b><p>Al final del día contás la plata y el sistema te dice si cuadra (arqueo).</p></a>
        </div>
      </section>

      {/* INVENTARIO */}
      <section className="man-sec">
        <h2 className="serif">📦 Inventario</h2>
        <div className="man-grid">
          <a className="man-card" href="/admin/compras"><b>Compras →</b><p>Cuando entra mercadería, cargala acá: suma el stock y, si querés, actualiza el costo del producto.</p></a>
          <a className="man-card" href="/admin/stock"><b>Stock →</b><p>Ajustá el stock con motivo (conteo físico, merma, rotura). Cada cambio queda en el historial. También ves el valor del inventario y qué está por agotarse.</p></a>
        </div>
      </section>

      {/* CLIENTES */}
      <section className="man-sec">
        <h2 className="serif">👤 Clientes y cuenta corriente (fiado)</h2>
        <div className="man-grid">
          <a className="man-card" href="/admin/clientes"><b>Clientes →</b><p>Para fiar: en Vender cobrás con "Cuenta corriente" y elegís el cliente; le queda la deuda. Después registrás el pago desde Clientes. Ahí ves cuánto te debe cada uno.</p></a>
        </div>
      </section>

      {/* TIENDA ONLINE */}
      <section className="man-sec">
        <h2 className="serif">🛒 Tienda online</h2>
        <div className="man-grid">
          <a className="man-card" href="/admin/pedidos"><b>Pedidos →</b><p>Los pedidos de la web caen acá. Marcás "pagado", subís el comprobante de transferencia y seguís el estado del envío.</p></a>
          <a className="man-card" href="/admin/cupones"><b>Cupones →</b><p>Códigos de descuento para la tienda web (porcentaje o monto fijo).</p></a>
        </div>
        <p className="man-tip">El catálogo de la tienda online es <b>el mismo</b> que el del local: un solo inventario. Lo que cargás en Productos aparece en la web si está activo, y el stock se comparte.</p>
      </section>

      {/* REPORTES */}
      <section className="man-sec">
        <h2 className="serif">📊 Reportes</h2>
        <a className="man-card" href="/admin/reportes" style={{ maxWidth: 520 }}><b>Ver el negocio →</b><p>Ventas, ganancia estimada, ticket promedio, más vendidos y valorización del stock. Todo exportable a Excel.</p></a>
      </section>

      {/* GLOSARIO */}
      <section className="man-sec">
        <h2 className="serif">📖 Diccionario rápido</h2>
        <div className="man-gloss">
          <div><b>Código de barras</b><span>El EAN de fábrica de la botella (el que lee el escáner).</span></div>
          <div><b>Código rápido</b><span>Un número corto que vos le ponés (ej. 170) para tipear rápido en la caja.</span></div>
          <div><b>SKU</b><span>Código interno que genera solo el sistema (WE-000123).</span></div>
          <div><b>Combo</b><span>Varios productos juntos a un precio; descuenta el stock de cada uno.</span></div>
          <div><b>Arqueo</b><span>Contar la plata de la caja al cerrar y compararla con lo que el sistema esperaba.</span></div>
          <div><b>Cuenta corriente</b><span>Fiado: lo que un cliente te debe y va saldando.</span></div>
        </div>
      </section>

      <p className="man-foot">We · Cava &amp; Gourmet — Sistema de gestión. Ante cualquier duda, este manual está siempre en el menú <b>Manual</b>.</p>
    </div>
  );
}
