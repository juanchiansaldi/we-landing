import * as XLSX from "xlsx";
import { prisma } from "../../../../../lib/prisma";
import { isAuthed } from "../../../../../lib/auth";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export async function GET() {
  if (!isAuthed()) return new Response("No autorizado", { status: 401 });
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return new Response("Tienda no encontrada", { status: 500 });

  const orders = await prisma.order.findMany({
    where: { storeId: store.id, paymentStatus: "PAID" },
    include: { items: { include: { product: { select: { cost: true } } } }, customer: true },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const rows = orders.map((o) => {
    const costo = o.items.reduce((s, it) => s + (it.product?.cost || 0) * it.qty, 0);
    return {
      Fecha: new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(o.createdAt),
      Pedido: o.id.slice(-6).toUpperCase(),
      Cliente: o.customer?.name || o.customer?.email || "",
      Items: o.items.map((i) => `${i.qty}x ${i.name}`).join(" · "),
      Medio: o.paymentMethod || "",
      Estado: o.status,
      Total: o.total,
      Costo_estimado: costo,
      Ganancia_estimada: o.total - costo,
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ventas");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-ventas-we-${fecha}.xlsx"`,
    },
  });
}
