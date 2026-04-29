import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

describe("POST /api/v1/auth/login", () => {
  it("returns 200 and sets cookie with valid demo credentials", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null); // demo fallback

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user", password: "pass" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.expiresAt).toBeDefined();
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("sets a short-lived cookie when rememberMe is false", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user", password: "pass", rememberMe: false });

    expect(res.status).toBe(200);
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    // Max-Age should be 8 hours (28800 seconds)
    expect(cookie).toMatch(/Max-Age=28800/i);
  });

  it("sets a 30-day cookie when rememberMe is true", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user", password: "pass", rememberMe: true });

    expect(res.status).toBe(200);
    const cookie = res.headers["set-cookie"]?.[0] ?? "";
    // Max-Age should be 30 days (2592000 seconds)
    expect(cookie).toMatch(/Max-Age=2592000/i);
  });

  it("returns 401 for wrong credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "wrong", password: "wrong" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("clears the cookie and returns ok", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("Protected routes without token", () => {
  it("returns 401 when no token is provided", async () => {
    const res = await request(app).get("/api/v1/accounts");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });
});
