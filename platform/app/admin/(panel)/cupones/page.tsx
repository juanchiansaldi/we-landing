import { prisma } from "../../../../lib/prisma";
import { adminGuard } from "../../../../lib/pos";
import AdminCoupons from "../../../../components/AdminCoupons";

export const dynamic = "force-dynamic";

const STORE_SLUG = process.env.DEFAULT_STORE_SLUG || "we";

export default async function CuponesPage() {
  adminGuard();
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } });
  if (!store) return <div className="pos-wrap">No hay tienda.</div>;

  const coupons = await prisma.coupon.findMany({ where: { storeId: store.id }, orderBy: { code: "asc" } });
  const rows = coupons.map((c) => ({
    id: c.id, code: c.code, type: c.type as "PERCENT" | "FIXED", value: c.value,
    active: c.active, expiresAt: c.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : "",
  }));

  return <AdminCoupons coupons={rows} />;
}
