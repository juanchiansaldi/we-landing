import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosProveedores from "../../../../components/PosProveedores";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const store = await getStore();
  const provs = await prisma.supplier.findMany({
    where: { storeId: store.id },
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: "asc" },
  });
  const rows = provs.map((p) => ({
    id: p.id, nombre: p.nombre, cuit: p.cuit || "", contacto: p.contacto || "",
    telefono: p.telefono || "", email: p.email || "", notas: p.notas || "",
    activo: p.activo, count: p._count.productos,
  }));
  return <PosProveedores proveedores={rows} />;
}
