import * as XLSX from "xlsx";
import { isAuthed } from "../../../../lib/auth";
import { COLS, EXAMPLE_ROW } from "../../../../lib/posExcel";

export async function GET() {
  if (!isAuthed()) return new Response("No autorizado", { status: 401 });

  const ws = XLSX.utils.json_to_sheet([EXAMPLE_ROW], { header: COLS as unknown as string[] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla-productos-we.xlsx"',
    },
  });
}
