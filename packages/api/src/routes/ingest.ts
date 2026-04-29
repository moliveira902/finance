import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { requireApiKey } from "../middleware/apiKey.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../middleware/errorHandler.js";

export const ingestRouter = Router();

const itemSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  type: z.enum(["income", "expense"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
  account: z.string().optional(),
  externalId: z.string().optional(),
});

const bodySchema = z.union([itemSchema, z.array(itemSchema)]);

ingestRouter.post(
  "/transactions",
  requireApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const raw = bodySchema.parse(req.body);
      const items = Array.isArray(raw) ? raw : [raw];

      // Resolve tenant from the first account found (single-tenant for now)
      const firstAccount = await prisma.account.findFirst({
        select: { userId: true },
      });
      if (!firstAccount) {
        throw new AppError(422, "VALIDATION_ERROR", "No accounts found — create an account first");
      }
      const userId = firstAccount.userId;

      const [defaultCategory, defaultAccount] = await Promise.all([
        prisma.category.findFirst({ where: { userId, isSystem: true } }),
        prisma.account.findFirst({ where: { userId } }),
      ]);

      if (!defaultAccount || !defaultCategory) {
        throw new AppError(422, "VALIDATION_ERROR", "Cannot resolve default category or account");
      }

      const results: { id: string; description: string }[] = [];

      for (const item of items) {
        const type: "income" | "expense" =
          item.type ?? (item.amount > 0 ? "income" : "expense");
        const amountCents = Math.round(Math.abs(item.amount) * 100) * (type === "income" ? 1 : -1);

        // Skip duplicates by externalId
        if (item.externalId) {
          const existing = await prisma.transaction.findFirst({
            where: { externalId: item.externalId, userId },
          });
          if (existing) { results.push({ id: existing.id, description: item.description }); continue; }
        }

        // Resolve category by name
        const category = item.category
          ? (await prisma.category.findFirst({
              where: { userId, name: { contains: item.category, mode: "insensitive" } },
            }) ?? defaultCategory)
          : defaultCategory;

        // Resolve account by name or institution
        const account = item.account
          ? (await prisma.account.findFirst({
              where: {
                userId,
                OR: [
                  { name: { contains: item.account, mode: "insensitive" } },
                  { institution: { contains: item.account, mode: "insensitive" } },
                ],
              },
            }) ?? defaultAccount)
          : defaultAccount;

        const tx = await prisma.transaction.create({
          data: {
            userId,
            categoryId: category.id,
            accountId: account.id,
            description: item.description,
            amountCents,
            type,
            source: "n8n",
            transactionDate: new Date(item.date ?? new Date().toISOString().slice(0, 10)),
            externalId: item.externalId ?? null,
            notes: "Importado via n8n",
          },
          select: { id: true, description: true },
        });
        results.push(tx);
      }

      res.status(202).json({ ok: true, imported: results.length, transactions: results });
    } catch (err) {
      next(err);
    }
  }
);

// System config — public info (API key is server-side only)
ingestRouter.get("/config", requireApiKey, (_req: Request, res: Response) => {
  res.json({
    ingestEndpoint: "/api/v1/ingest/transactions",
    aiEnabled: true,
    version: process.env.npm_package_version ?? "1.0.0",
  });
});
