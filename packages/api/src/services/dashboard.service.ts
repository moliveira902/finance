import { prisma } from "../lib/prisma.js";

export class DashboardService {
  async get(userId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [accounts, recentTransactions, incomeAgg, expenseAgg] = await Promise.all([
      prisma.account.findMany({
        where: { userId, isArchived: false },
        orderBy: { name: "asc" },
      }),

      prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { category: true, account: true, aiCategory: true },
        orderBy: { transactionDate: "desc" },
        take: 5,
      }),

      prisma.transaction.aggregate({
        where: {
          userId, type: "income", deletedAt: null,
          transactionDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),

      prisma.transaction.aggregate({
        where: {
          userId, type: "expense", deletedAt: null,
          transactionDate: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const monthlyIncomeCents = incomeAgg._sum.amountCents ?? 0;
    const monthlyExpensesCents = Math.abs(expenseAgg._sum.amountCents ?? 0);
    const netWorthCents = accounts.reduce((sum, a) => sum + a.balanceCents, 0);
    const freeBalanceCents = monthlyIncomeCents - monthlyExpensesCents;

    return {
      kpis: { netWorthCents, monthlyIncomeCents, monthlyExpensesCents, freeBalanceCents },
      recentTransactions,
      accounts,
    };
  }
}
