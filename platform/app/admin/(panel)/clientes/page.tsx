import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosClientes from "../../../../components/PosClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const store = await getStore();
  const customers = await prisma.customer.findMany({
    where: { storeId: store.id },
    select: { id: true, name: true, email: true, phone: true, cuit: true, vip: true, ccBalance: true, createdAt: true },
    orderBy: [{ ccBalance: "desc" }, { createdAt: "desc" }],
  });
  const ids = customers.map((c) => c.id);
  const ledger = ids.length
    ? await prisma.customerLedger.findMany({ where: { customerId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 300 })
    : [];

  const rows = customers.map((c) => ({
    id: c.id, name: c.name || "", email: c.email.includes("@local.we") ? "" : c.email,
    phone: c.phone || "", cuit: c.cuit || "", vip: c.vip, ccBalance: c.ccBalance,
  }));
  const moves = ledger.map((l) => ({
    id: l.id, customerId: l.customerId, type: l.type, amount: l.amount,
    resultingBalance: l.resultingBalance, note: l.note || "", at: l.createdAt.toISOString(),
  }));

  return <PosClientes customers={rows} ledger={moves} />;
}
