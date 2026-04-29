import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "@financeapp/shared-types";
import pino from "pino";

const log = pino({ name: "errorHandler" });

export class AppError extends Error {
  constructor(
    public status: number,
    public code: ApiError["error"],
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` } satisfies ApiError);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message,
      details: err.details,
    } satisfies ApiError);
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: err.flatten(),
    } satisfies ApiError);
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "CONFLICT",
        message: "A record with these values already exists",
      } satisfies ApiError);
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Record not found",
      } satisfies ApiError);
    }
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "INVALID_JSON",
      message: "Malformed JSON in request body",
    } satisfies ApiError);
  }

  log.error({ err, path: req.path }, "Unhandled error");
  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
  } satisfies ApiError);
}
