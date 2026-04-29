import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const systemCat = { id: "cat-sys", userId: null, name: "Alimentação", slug: "alimentacao", color: "#F59E0B", icon: "utensils", isSystem: true, parentId: null, createdAt: new Date() };
const userCat = { id: "cat-usr", userId: DEMO_USER_ID, name: "Pets", slug: "pets", color: "#10B981", icon: null, isSystem: false, parentId: null, createdAt: new Date() };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/categories", () => {
  it("lists system and user categories", async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([systemCat, userCat]);

    const res = await request(app).get("/api/v1/categories").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe("POST /api/v1/categories", () => {
  it("creates a user category", async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.category.create).mockResolvedValue(userCat);

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", auth)
      .send({ name: "Pets", slug: "pets", color: "#10B981" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Pets");
  });
});

describe("DELETE /api/v1/categories/:id", () => {
  it("returns 403 when trying to delete a system category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(systemCat);

    const res = await request(app)
      .delete("/api/v1/categories/cat-sys")
      .set("Authorization", auth);

    expect(res.status).toBe(403);
  });

  it("deletes a user category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(userCat);
    vi.mocked(prisma.category.delete).mockResolvedValue(userCat);

    const res = await request(app)
      .delete("/api/v1/categories/cat-usr")
      .set("Authorization", auth);

    expect(res.status).toBe(204);
  });
});
