import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { BudgetsService } from "../services/budgets.service.js";

export const budgetsRouter = Router();
const svc = new BudgetsService();

const createSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(120),
  amountCents: z.number().int().positive(),
  period: z.enum(["monthly", "weekly", "yearly"]).default("monthly"),
  alertAtPct: z.number().int().min(1).max(100).default(80),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  amountCents: z.number().int().positive().optional(),
  alertAtPct: z.number().int().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

budgetsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.list(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});

budgetsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.create(req.user!.sub, body);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

budgetsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.update(req.user!.sub, req.params.id, body);
    res.json(data);
  } catch (err) { next(err); }
});

budgetsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
