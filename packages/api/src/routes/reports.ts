import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ReportsService } from "../services/reports.service.js";

export const reportsRouter = Router();
const svc = new ReportsService();

const trendSchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

const breakdownSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

reportsRouter.get("/monthly-trend", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { months } = trendSchema.parse(req.query);
    const data = await svc.monthlyTrend(req.user!.sub, months);
    res.json(data);
  } catch (err) { next(err); }
});

reportsRouter.get("/category-breakdown", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate } = breakdownSchema.parse(req.query);
    const data = await svc.categoryBreakdown(req.user!.sub, startDate, endDate);
    res.json(data);
  } catch (err) { next(err); }
});
