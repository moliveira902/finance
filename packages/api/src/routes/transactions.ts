import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { TransactionsService } from "../services/transactions.service.js";

export const transactionsRouter = Router();
const svc = new TransactionsService();

const createSchema = z.object({
  accountId: z.string().uuid(),
  categoryId: z.string().uuid().optional(),
  amountCents: z.number().int(),
  description: z.string().min(1).max(255),
  notes: z.string().max(1000).optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(["expense", "income", "transfer"]),
  source: z.enum(["manual", "csv_import", "bradesco", "open_finance"]).default("manual"),
  isRecurring: z.boolean().default(false),
});

const updateSchema = z.object({
  categoryId: z.string().uuid().nullable().optional(),
  amountCents: z.number().int().optional(),
  description: z.string().min(1).max(255).optional(),
  notes: z.string().max(1000).nullable().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  type: z.enum(["expense", "income", "transfer"]).optional(),
  isRecurring: z.boolean().optional(),
});

const filtersSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

transactionsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = filtersSchema.parse(req.query);
    const data = await svc.list(req.user!.sub, filters);
    res.json(data);
  } catch (err) { next(err); }
});

transactionsRouter.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.get(req.user!.sub, req.params.id);
    res.json(data);
  } catch (err) { next(err); }
});

transactionsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.create(req.user!.sub, body);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

transactionsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.update(req.user!.sub, req.params.id, body);
    res.json(data);
  } catch (err) { next(err); }
});

transactionsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
