import * as XLSX from "xlsx";
import { prisma } from "../../../../lib/prisma";
import { isAuthed } from "../../../../lib/auth";
import { COLS, productToRow } from "../../../../lib/posExcel";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export async function GET() {
  if (!isAuthed()) return new Response("No autorizado", { status: 401 });

  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return new Response("Tienda no encontrada", { status: 500 });

  const products = await prisma.product.findMany({
    where: { storeId: store.id },
    include: { category: true },
    orderBy: { name: "asc" },
  });

  const rows = products.map(productToRow);
  const ws = XLSX.utils.json_to_sheet(rows, { header: COLS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const fecha = new Date().toISOString().slice(0, 10);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="productos-we-${fecha}.xlsx"`,
    },
  });
}
