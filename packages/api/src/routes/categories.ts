import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CategoriesService } from "../services/categories.service.js";

export const categoriesRouter = Router();
const svc = new CategoriesService();

const createSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().uuid().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});

categoriesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.list(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});

categoriesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createSchema.parse(req.body);
    const data = await svc.create(req.user!.sub, body);
    res.status(201).json(data);
  } catch (err) { next(err); }
});

categoriesRouter.patch("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = updateSchema.parse(req.body);
    const data = await svc.update(req.user!.sub, req.params.id, body);
    res.json(data);
  } catch (err) { next(err); }
});

categoriesRouter.delete("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});
