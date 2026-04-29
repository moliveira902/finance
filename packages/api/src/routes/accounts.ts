import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AccountsService } from "../services/accounts.service.js";

export const accountsRouter = Router();
const svc = new AccountsService();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["checking", "savings", "credit", "investment", "wallet"]),
  currency: z.string().length(3).default("BRL"),
  balanceCents: z.number().int(),
  color: z.string().optional(),
  icon: z.string().optional(),
  institution: z.string().max(120).optional(),
});

const updateSchema = createSchema.partial().omit({ currency: true });

accountsRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.list(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});

accountsRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.create(req.user!.sub, body);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

accountsRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.update(req.user!.sub, req.params.id, body);
    res.json(data);
  } catch (err) { next(err); }
});

accountsRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
