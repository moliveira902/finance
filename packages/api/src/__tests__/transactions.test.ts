import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const mockCategory = { id: "cat-1", name: "Alimentação", slug: "alimentacao", color: "#F59E0B", icon: "utensils", isSystem: true, userId: null, parentId: null, createdAt: new Date() };
const mockAccount = { id: "acc-1", userId: DEMO_USER_ID, name: "Conta", type: "checking", currency: "BRL", balanceCents: 100000, institution: "Bradesco", color: null, icon: null, isArchived: false, createdAt: new Date(), updatedAt: new Date() };

const mockTx = {
  id: "tx-1",
  userId: DEMO_USER_ID,
  accountId: "acc-1",
  categoryId: "cat-1",
  amountCents: -38750,
  description: "Supermercado Extra",
  notes: null,
  transactionDate: new Date("2026-04-28"),
  type: "expense",
  source: "manual",
  externalId: null,
  isRecurring: false,
  aiCategoryId: null,
  aiConfidence: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  category: mockCategory,
  account: mockAccount,
  aiCategory: null,
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/transactions", () => {
  it("returns paginated transactions", async () => {
    vi.mocked(prisma.transaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([mockTx]);

    const res = await request(app).get("/api/v1/transactions").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.page).toBe(1);
  });

  it("stores amount in centavos (integer)", async () => {
    vi.mocked(prisma.transaction.count).mockResolvedValue(1);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([mockTx]);

    const res = await request(app).get("/api/v1/transactions").set("Authorization", auth);

    expect(typeof res.body.data[0].amountCents).toBe("number");
    expect(Number.isInteger(res.body.data[0].amountCents)).toBe(true);
  });

  it("filters by type", async () => {
    vi.mocked(prisma.transaction.count).mockResolvedValue(0);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);

    const res = await request(app)
      .get("/api/v1/transactions?type=income")
      .set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("returns 400 for invalid type filter", async () => {
    const res = await request(app)
      .get("/api/v1/transactions?type=invalid")
      .set("Authorization", auth);

    expect(res.status).toBe(400);
  });
});

describe("POST /api/v1/transactions", () => {
  it("creates a transaction and enqueues categorisation", async () => {
    vi.mocked(prisma.transaction.create).mockResolvedValue(mockTx);

    const res = await request(app)
      .post("/api/v1/transactions")
      .set("Authorization", auth)
      .send({
        accountId: "acc-1",
        amountCents: -38750,
        description: "Supermercado Extra",
        transactionDate: "2026-04-28",
        type: "expense",
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("Supermercado Extra");
  });
});

describe("DELETE /api/v1/transactions/:id", () => {
  it("hard-deletes a transaction", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue(mockTx);
    vi.mocked(prisma.transaction.delete).mockResolvedValue(mockTx);

    const res = await request(app)
      .delete("/api/v1/transactions/tx-1")
      .set("Authorization", auth);

    expect(res.status).toBe(204);
  });

  it("returns 404 for someone else's transaction", async () => {
    vi.mocked(prisma.transaction.findUnique).mockResolvedValue({
      ...mockTx,
      userId: "other-user-id",
    });

    const res = await request(app)
      .delete("/api/v1/transactions/tx-1")
      .set("Authorization", auth);

    expect(res.status).toBe(404);
  });
});
