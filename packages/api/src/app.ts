import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { requestId } from "./middleware/requestId.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { router } from "./routes/index.js";

const CORS_ORIGINS = (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",");

export function createApp() {
  const app = express();

  app.use(pinoHttp({ autoLogging: process.env.NODE_ENV !== "test" }));
  app.use(requestId);
  app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      version: process.env.npm_package_version ?? "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1", router);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
