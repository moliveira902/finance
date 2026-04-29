import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { CreateCategoryDto, UpdateCategoryDto } from "@financeapp/shared-types";

export class CategoriesService {
  async list(userId: string) {
    return prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId }],
        // exclude soft-deleted (categories have no deletedAt — use isSystem flag instead)
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    });
  }

  async create(userId: string, dto: CreateCategoryDto) {
    const existing = await prisma.category.findFirst({
      where: { userId, slug: dto.slug },
    });
    if (existing) {
      throw new AppError(409, "CONFLICT", `Category with slug "${dto.slug}" already exists`);
    }
    return prisma.category.create({
      data: { ...dto, userId, isSystem: false },
    });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError(404, "NOT_FOUND", "Category not found");
    if (cat.isSystem) throw new AppError(403, "FORBIDDEN", "System categories cannot be modified");
    if (cat.userId !== userId) throw new AppError(403, "FORBIDDEN", "Access denied");

    return prisma.category.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    const cat = await prisma.category.findUnique({ where: { id } });
    if (!cat) throw new AppError(404, "NOT_FOUND", "Category not found");
    if (cat.isSystem) throw new AppError(403, "FORBIDDEN", "System categories cannot be deleted");
    if (cat.userId !== userId) throw new AppError(403, "FORBIDDEN", "Access denied");

    await prisma.category.delete({ where: { id } });
  }
}
