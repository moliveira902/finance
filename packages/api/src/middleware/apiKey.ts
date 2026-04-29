import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler.js";

const INGEST_API_KEY =
  process.env.INGEST_API_KEY ?? "fa-ingest-dev-key-change-in-prod";

export function requireApiKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-api-key"];
  if (!key || key !== INGEST_API_KEY) {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid or missing API key"));
  }
  next();
}
