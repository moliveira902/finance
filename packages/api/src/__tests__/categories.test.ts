import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const systemCat = { id: "cat-sys", userId: null, name: "Alimentação", slug: "alimentacao", color: "#F59E0B", icon: "utensils", isSystem: true, parentId: null, createdAt: new Date() };
const userCat = { id: "cat-usr", userId: DEMO_USER_ID, name: "Pets", slug: "pets", color: "#10B981", icon: null, isSystem: false, parentId: null, createdAt: new Date() };
const otherUserCat = { id: "cat-other", userId: "other-user-id", name: "Other", slug: "other", color: "#000000", icon: null, isSystem: false, parentId: null, createdAt: new Date() };

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

  it("returns 409 when slug already exists for the user", async () => {
    vi.mocked(prisma.category.findFirst).mockResolvedValue(userCat);

    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", auth)
      .send({ name: "Pets Duplicado", slug: "pets", color: "#10B981" });

    expect(res.status).toBe(409);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", auth)
      .send({ name: "No Slug" });

    expect(res.status).toBe(400);
  });

  it("returns 400 when slug has invalid characters", async () => {
    const res = await request(app)
      .post("/api/v1/categories")
      .set("Authorization", auth)
      .send({ name: "Bad Slug", slug: "has spaces" });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/categories/:id", () => {
  it("updates a user category", async () => {
    const updated = { ...userCat, name: "Pets Updated", color: "#FF0000" };
    vi.mocked(prisma.category.findUnique).mockResolvedValue(userCat);
    vi.mocked(prisma.category.update).mockResolvedValue(updated);

    const res = await request(app)
      .patch("/api/v1/categories/cat-usr")
      .set("Authorization", auth)
      .send({ name: "Pets Updated", color: "#FF0000" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Pets Updated");
  });

  it("returns 403 when trying to update a system category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(systemCat);

    const res = await request(app)
      .patch("/api/v1/categories/cat-sys")
      .set("Authorization", auth)
      .send({ name: "New Name" });

    expect(res.status).toBe(403);
  });

  it("returns 403 when updating another user's category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(otherUserCat);

    const res = await request(app)
      .patch("/api/v1/categories/cat-other")
      .set("Authorization", auth)
      .send({ name: "Stolen" });

    expect(res.status).toBe(403);
  });

  it("returns 404 when category does not exist", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/categories/nonexistent")
      .set("Authorization", auth)
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/categories/:id", () => {
  it("deletes a user category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(userCat);
    vi.mocked(prisma.category.delete).mockResolvedValue(userCat);

    const res = await request(app)
      .delete("/api/v1/categories/cat-usr")
      .set("Authorization", auth);

    expect(res.status).toBe(204);
  });

  it("returns 403 when trying to delete a system category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(systemCat);

    const res = await request(app)
      .delete("/api/v1/categories/cat-sys")
      .set("Authorization", auth);

    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting another user's category", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(otherUserCat);

    const res = await request(app)
      .delete("/api/v1/categories/cat-other")
      .set("Authorization", auth);

    expect(res.status).toBe(403);
  });

  it("returns 404 when category does not exist", async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .delete("/api/v1/categories/nonexistent")
      .set("Authorization", auth);

    expect(res.status).toBe(404);
  });
});
