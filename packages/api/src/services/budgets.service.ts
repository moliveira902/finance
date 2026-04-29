import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { CreateBudgetDto, UpdateBudgetDto } from "@financeapp/shared-types";

function currentPeriodBounds(period: string) {
  const now = new Date();
  if (period === "monthly") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }
  // weekly
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

export class BudgetsService {
  async list(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId, isActive: true },
      include: { category: true },
      orderBy: { name: "asc" },
    });

    // Compute spent for each budget in the current period
    const results = await Promise.all(
      budgets.map(async (budget) => {
        const { start, end } = currentPeriodBounds(budget.period);
        const agg = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: budget.categoryId,
            type: "expense",
            deletedAt: null,
            transactionDate: { gte: start, lte: end },
          },
          _sum: { amountCents: true },
        });
        const spentCents = Math.abs(agg._sum.amountCents ?? 0);
        const utilization = budget.amountCents > 0 ? spentCents / budget.amountCents : 0;
        return { ...budget, spentCents, utilization };
      })
    );

    return results;
  }

  async get(userId: string, id: string) {
    const b = await prisma.budget.findUnique({ where: { id }, include: { category: true } });
    if (!b || b.userId !== userId) throw new AppError(404, "NOT_FOUND", "Budget not found");
    return b;
  }

  async create(userId: string, dto: CreateBudgetDto) {
    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId: dto.categoryId, period: dto.period },
    });
    if (existing) {
      throw new AppError(409, "CONFLICT", "A budget for this category and period already exists");
    }
    return prisma.budget.create({
      data: { ...dto, userId },
      include: { category: true },
    });
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.get(userId, id);
    return prisma.budget.update({ where: { id }, data: dto, include: { category: true } });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.budget.delete({ where: { id } });
  }
}
