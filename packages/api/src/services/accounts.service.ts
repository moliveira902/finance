import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { CreateAccountDto, UpdateAccountDto } from "@financeapp/shared-types";

export class AccountsService {
  async list(userId: string) {
    return prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: "asc" },
    });
  }

  async get(userId: string, id: string) {
    const acc = await prisma.account.findUnique({ where: { id } });
    if (!acc || acc.userId !== userId) throw new AppError(404, "NOT_FOUND", "Account not found");
    return acc;
  }

  async create(userId: string, dto: CreateAccountDto) {
    return prisma.account.create({ data: { ...dto, userId } });
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.get(userId, id);
    return prisma.account.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.get(userId, id);

    const hasTxns = await prisma.transaction.count({
      where: { accountId: id, deletedAt: null },
    });
    if (hasTxns > 0) {
      throw new AppError(409, "CONFLICT", "Cannot delete account with existing transactions. Archive it instead.");
    }

    await prisma.account.delete({ where: { id } });
  }
}
