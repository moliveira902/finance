import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service.js";
import { authenticate } from "../middleware/auth.js";

export const authRouter = Router();
const authService = new AuthService();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

authRouter.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = loginSchema.parse(req.body);
    const { token, user, expiresAt } = await authService.login(body);

    const maxAge = body.rememberMe
      ? 60 * 60 * 24 * 30  // 30 days
      : 60 * 60 * 8;        // 8 hours

    res.cookie("financeapp_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: maxAge * 1000,
    });

    res.json({ user, expiresAt });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("financeapp_session", { path: "/" });
  res.json({ ok: true });
});

authRouter.post("/refresh", authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { token, expiresAt } = await authService.refresh(user);

    res.cookie("financeapp_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8 * 1000,
    });

    res.json({ user: { id: user.sub, email: user.email, name: user.name }, expiresAt });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, (req: Request, res: Response) => {
  const u = req.user!;
  res.json({ id: u.sub, email: u.email, name: u.name, tenantId: u.tenantId });
});
