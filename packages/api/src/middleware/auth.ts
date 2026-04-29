import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt.js";
import { AppError } from "./errorHandler.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.financeapp_session as string | undefined;

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}
