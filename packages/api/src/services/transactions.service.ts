import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { CreateTransactionDto, UpdateTransactionDto, TransactionFilters } from "@financeapp/shared-types";
import { categorizationQueue } from "../lib/queue.js";

const TX_INCLUDE = {
  category: true,
  account: true,
  aiCategory: true,
} as const;

export class TransactionsService {
  async list(userId: string, filters: TransactionFilters) {
    const { type, categoryId, accountId, startDate, endDate, search, page = 1, pageSize = 20 } = filters;

    const where = {
      userId,
      deletedAt: null,
      ...(type && { type }),
      ...(categoryId && { categoryId }),
      ...(accountId && { accountId }),
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate) }),
            },
          }
        : {}),
      ...(search && {
        description: { contains: search, mode: "insensitive" as const },
      }),
    };

    const [total, data] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        include: TX_INCLUDE,
        orderBy: { transactionDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async get(userId: string, id: string) {
    const tx = await prisma.transaction.findUnique({ where: { id }, include: TX_INCLUDE });
    if (!tx || tx.userId !== userId || tx.deletedAt) {
      throw new AppError(404, "NOT_FOUND", "Transaction not found");
    }
    return tx;
  }

  async create(userId: string, dto: CreateTransactionDto) {
    const tx = await prisma.transaction.create({
      data: {
        ...dto,
        userId,
        transactionDate: new Date(dto.transactionDate),
      },
      include: TX_INCLUDE,
    });

    // Enqueue AI categorisation (fire-and-forget)
    try {
      await categorizationQueue.add("categorize", {
        transactionId: tx.id,
        description: tx.description,
        amountCents: tx.amountCents,
        type: tx.type,
      });
    } catch {
      // Queue unavailable (Redis not running) — categorisation is optional
    }

    return tx;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    await this.get(userId, id);
    return prisma.transaction.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.transactionDate && { transactionDate: new Date(dto.transactionDate) }),
      },
      include: TX_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);
    await prisma.transaction.delete({ where: { id } });
  }
}
