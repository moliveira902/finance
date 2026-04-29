import { prisma } from "../lib/prisma.js";

export class ReportsService {
  async monthlyTrend(userId: string, months: number) {
    const result: { month: string; incomeCents: number; expensesCents: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);

      const label = start.toLocaleString("pt-BR", { month: "short" });
      const capitalised = label.charAt(0).toUpperCase() + label.slice(1);

      const [income, expenses] = await Promise.all([
        prisma.transaction.aggregate({
          where: { userId, type: "income", deletedAt: null, transactionDate: { gte: start, lte: end } },
          _sum: { amountCents: true },
        }),
        prisma.transaction.aggregate({
          where: { userId, type: "expense", deletedAt: null, transactionDate: { gte: start, lte: end } },
          _sum: { amountCents: true },
        }),
      ]);

      result.push({
        month: capitalised,
        incomeCents: income._sum.amountCents ?? 0,
        expensesCents: Math.abs(expenses._sum.amountCents ?? 0),
      });
    }

    return result;
  }

  async categoryBreakdown(userId: string, startDate?: string, endDate?: string) {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Current period
    const current = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", deletedAt: null, transactionDate: { gte: start, lte: end } },
      _sum: { amountCents: true },
    });

    // Previous period (same duration)
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    const previous = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: { userId, type: "expense", deletedAt: null, transactionDate: { gte: prevStart, lte: prevEnd } },
      _sum: { amountCents: true },
    });

    const prevMap = new Map(previous.map((p) => [p.categoryId, Math.abs(p._sum.amountCents ?? 0)]));

    const totalCents = current.reduce((s, r) => s + Math.abs(r._sum.amountCents ?? 0), 0) || 1;

    // Fetch category details
    const categoryIds = current.map((r) => r.categoryId).filter(Boolean) as string[];
    const cats = await prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const catMap = new Map(cats.map((c) => [c.id, c]));

    return current
      .filter((r) => r.categoryId)
      .map((r) => {
        const cat = catMap.get(r.categoryId!);
        const totalCentsCurrent = Math.abs(r._sum.amountCents ?? 0);
        const prevCents = prevMap.get(r.categoryId!) ?? null;
        const delta = prevCents != null && prevCents > 0
          ? ((totalCentsCurrent - prevCents) / prevCents) * 100
          : null;

        return {
          categoryId: r.categoryId!,
          categoryName: cat?.name ?? "Outros",
          color: cat?.color ?? "#6B7280",
          totalCents: totalCentsCurrent,
          percentage: (totalCentsCurrent / totalCents) * 100,
          deltaVsPrevious: delta,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);
  }
}
