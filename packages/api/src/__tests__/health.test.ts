import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

describe("Unknown routes", () => {
  it("returns 404 for unknown route", async () => {
    const res = await request(app).get("/api/v1/nonexistent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("returns 400 for malformed JSON", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send("{bad json}");
    expect(res.status).toBe(400);
  });
});
