import { cookies } from "next/headers";
import { prisma } from "../../../../lib/prisma";
import { getStore, POS_USER_COOKIE } from "../../../../lib/pos";
import PosUsuarios from "../../../../components/PosUsuarios";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const store = await getStore();
  const users = await prisma.posUser.findMany({
    where: { storeId: store.id },
    select: { id: true, username: true, nombre: true, role: true, activo: true, _count: { select: { sales: true } } },
    orderBy: { nombre: "asc" },
  });
  const activeId = cookies().get(POS_USER_COOKIE)?.value || "";
  const rows = users.map((u) => ({ id: u.id, username: u.username, nombre: u.nombre, role: u.role, activo: u.activo, sales: u._count.sales }));
  return <PosUsuarios users={rows} activeId={activeId} />;
}
