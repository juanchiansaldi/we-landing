import { prisma } from "../../../../lib/prisma";
import { getStore } from "../../../../lib/pos";
import PosCaja from "../../../../components/PosCaja";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const store = await getStore();
  const open = await prisma.cashSession.findFirst({ where: { storeId: store.id, status: "ABIERTA" }, orderBy: { openedAt: "desc" } });

  type Mov = { id: string; type: string; amount: number; reason: string; at: string };
  let current = null as null | {
    id: string; openingAmount: number; openedAt: string;
    count: number; cash: number; card: number; transfer: number; account: number; total: number;
    movIn: number; movOut: number; expectedCash: number; movements: Mov[];
  };
  if (open) {
    const [sales, movs] = await Promise.all([
      prisma.sale.findMany({ where: { cashSessionId: open.id, voided: false }, select: { total: true, payCash: true, payCard: true, payTransfer: true, payAccount: true } }),
      prisma.cashMovement.findMany({ where: { cashSessionId: open.id }, orderBy: { createdAt: "desc" } }),
    ]);
    const cash = sales.reduce((s, x) => s + x.payCash, 0);
    const card = sales.reduce((s, x) => s + x.payCard, 0);
    const transfer = sales.reduce((s, x) => s + x.payTransfer, 0);
    const account = sales.reduce((s, x) => s + x.payAccount, 0);
    const total = sales.reduce((s, x) => s + x.total, 0);
    const movIn = movs.filter((m) => m.type === "INGRESO").reduce((s, m) => s + m.amount, 0);
    const movOut = movs.filter((m) => m.type === "EGRESO").reduce((s, m) => s + m.amount, 0);
    current = {
      id: open.id, openingAmount: open.openingAmount, openedAt: open.openedAt.toISOString(),
      count: sales.length, cash, card, transfer, account, total,
      movIn, movOut, expectedCash: open.openingAmount + cash + movIn - movOut,
      movements: movs.map((m) => ({ id: m.id, type: m.type, amount: m.amount, reason: m.reason, at: m.createdAt.toISOString() })),
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
