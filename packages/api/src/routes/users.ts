import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UsersService } from "../services/users.service.js";

export const usersRouter = Router();
const svc = new UsersService();

const VALID_TIMEZONES = Intl.supportedValuesOf("timeZone");

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  timezone: z
    .string()
    .refine((tz) => VALID_TIMEZONES.includes(tz), { message: "Invalid timezone" })
    .optional(),
});

const notificationsSchema = z.object({
  emailAlerts: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyDigest: z.boolean().optional(),
  monthlyReport: z.boolean().optional(),
});

usersRouter.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getProfile(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});

usersRouter.patch("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = profileSchema.parse(req.body);
    const data = await svc.updateProfile(req.user!.sub, body);
    res.json(data);
  } catch (err) { next(err); }
});

usersRouter.get("/me/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getNotifications(req.user!.sub);
    res.json(data);
  } catch (err) { next(err); }
});

usersRouter.patch("/me/notifications", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = notificationsSchema.parse(req.body);
    const data = await svc.updateNotifications(req.user!.sub, body);
    res.json(data);
  } catch (err) { next(err); }
});

usersRouter.get("/me/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.exportData(req.user!.sub);
    res.setHeader("Content-Disposition", 'attachment; filename="financeapp-export.json"');
    res.json(data);
  } catch (err) { next(err); }
});

usersRouter.delete("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.deleteAccount(req.user!.sub);
    res.clearCookie("financeapp_session", { path: "/" });
    res.status(204).send();
  } catch (err) { next(err); }
});
