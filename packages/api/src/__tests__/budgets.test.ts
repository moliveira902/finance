import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const mockCategory = { id: "cat-1", name: "Alimentação", slug: "alimentacao", color: "#F59E0B", icon: "utensils", isSystem: true, userId: null, parentId: null, createdAt: new Date() };

const mockBudget = {
  id: "bud-1",
  userId: DEMO_USER_ID,
  categoryId: "cat-1",
  name: "Alimentação",
  amountCents: 120000,
  period: "monthly",
  alertAtPct: 80,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  category: mockCategory,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/budgets", () => {
  it("returns budgets with computed spent and utilization", async () => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue([mockBudget]);
    vi.mocked(prisma.transaction.aggregate).mockResolvedValue({ _sum: { amountCents: -65680 } } as never);

    const res = await request(app).get("/api/v1/budgets").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].spentCents).toBe(65680);
    expect(res.body[0].utilization).toBeCloseTo(65680 / 120000);
  });

  it("returns 0 spent when no transactions", async () => {
    vi.mocked(prisma.budget.findMany).mockResolvedValue([mockBudget]);
    vi.mocked(prisma.transaction.aggregate).mockResolvedValue({ _sum: { amountCents: null } } as never);

    const res = await request(app).get("/api/v1/budgets").set("Authorization", auth);

    expect(res.body[0].spentCents).toBe(0);
  });
});

describe("POST /api/v1/budgets", () => {
  it("creates a budget", async () => {
    vi.mocked(prisma.budget.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.budget.create).mockResolvedValue(mockBudget);

    const res = await request(app)
      .post("/api/v1/budgets")
      .set("Authorization", auth)
      .send({ categoryId: "cat-1", name: "Alimentação", amountCents: 120000 });

    expect(res.status).toBe(201);
  });

  it("returns 409 for duplicate category+period", async () => {
    vi.mocked(prisma.budget.findFirst).mockResolvedValue(mockBudget);

    const res = await request(app)
      .post("/api/v1/budgets")
      .set("Authorization", auth)
      .send({ categoryId: "cat-1", name: "Alimentação", amountCents: 120000 });

    expect(res.status).toBe(409);
  });
});
