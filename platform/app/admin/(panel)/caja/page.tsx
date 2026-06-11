import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosCaja from "../../../../components/PosCaja";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const store = await getStore();
  const open = await prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, orderBy: { openedAt: "desc" } });

  let current = null as null | {
    id: string; openingAmount: number; openedAt: string;
    count: number; cash: number; card: number; transfer: number; account: number; total: number; expectedCash: number;
  };
  if (open) {
    const sales = await prisma.sale.findMany({ where: { cashSessionId: open.id, voided: false }, select: { total: true, payCash: true, payCard: true, payTransfer: true, payAccount: true } });
    const cash = sales.reduce((s, x) => s + x.payCash, 0);
    const card = sales.reduce((s, x) => s + x.payCard, 0);
    const transfer = sales.reduce((s, x) => s + x.payTransfer, 0);
    const account = sales.reduce((s, x) => s + x.payAccount, 0);
    const total = sales.reduce((s, x) => s + x.total, 0);
    current = {
      id: open.id, openingAmount: open.openingAmount, openedAt: open.openedAt.toISOString(),
      count: sales.length, cash, card, transfer, account, total, expectedCash: open.openingAmount + cash,
    };
  }

  const closed = await prisma.cashSession.findMany({
    where: { storeId: store.id, status: "CERRADA" },
    orderBy: { closedAt: "desc" }, take: 20,
  });
  const history = closed.map((c) => ({
    id: c.id, openedAt: c.openedAt.toISOString(), closedAt: c.closedAt?.toISOString() || "",
    openingAmount: c.openingAmount, expected: c.declaredAmount ?? 0, counted: c.countedAmount ?? 0, difference: c.difference ?? 0,
  }));

  return <PosCaja current={current} history={history} />;
}
