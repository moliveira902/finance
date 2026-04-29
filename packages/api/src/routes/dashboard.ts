import { Router, Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service.js";

export const dashboardRouter = Router();
const svc = new DashboardService();

dashboardRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.get(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});
