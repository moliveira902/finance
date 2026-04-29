import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { UpdateProfileDto, UpdateNotificationsDto } from "@financeapp/shared-types";

// Notification prefs stored as JSON in a simple key-value approach.
// In production this would be a dedicated table.
const notificationDefaults = {
  emailAlerts: true,
  pushNotifications: false,
  weeklyDigest: true,
  monthlyReport: true,
};

const notificationStore = new Map<string, typeof notificationDefaults>();

export class UsersService {
  private async findUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new AppError(404, "NOT_FOUND", "User not found");
    return user;
  }

  async getProfile(userId: string) {
    const user = await this.findUser(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.findUser(userId);
    const updated = await prisma.user.update({ where: { id: userId }, data: dto });
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      timezone: updated.timezone,
    };
  }

  async getNotifications(userId: string) {
    await this.findUser(userId);
    return notificationStore.get(userId) ?? notificationDefaults;
  }

  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    await this.findUser(userId);
    const current = notificationStore.get(userId) ?? notificationDefaults;
    const updated = { ...current, ...dto };
    notificationStore.set(userId, updated);
    return updated;
  }

  async exportData(userId: string) {
    const [user, accounts, categories, transactions, budgets] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.account.findMany({ where: { userId } }),
      prisma.category.findMany({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId, deletedAt: null } }),
      prisma.budget.findMany({ where: { userId } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      user: { id: user?.id, email: user?.email, name: user?.name, timezone: user?.timezone },
      accounts,
      categories,
      transactions,
      budgets,
    };
  }

  async deleteAccount(userId: string) {
    await this.findUser(userId);

    // Cascade delete in order (Prisma doesn't cascade by default for explicit relations)
    await prisma.$transaction([
      prisma.budgetPeriod.deleteMany({ where: { budget: { userId } } }),
      prisma.budget.deleteMany({ where: { userId } }),
      prisma.transaction.deleteMany({ where: { userId } }),
      prisma.account.deleteMany({ where: { userId } }),
      prisma.category.deleteMany({ where: { userId } }),
      prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } }),
    ]);
  }
}
