import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";

const app = createApp();

const VALID_KEY = "fa-ingest-dev-key-change-in-prod";
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000002";
const DEMO_ACCOUNT_ID = "00000000-0000-0000-0000-000000000010";
const DEMO_CATEGORY_ID = "00000000-0000-0000-0000-000000000020";

const mockAccount = {
  id: DEMO_ACCOUNT_ID,
  userId: DEMO_USER_ID,
  name: "Conta Corrente",
  institution: "Bradesco",
  type: "checking",
  balanceCents: 0,
  currency: "BRL",
  color: null,
  icon: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCategory = {
  id: DEMO_CATEGORY_ID,
  userId: DEMO_USER_ID,
  name: "Outros",
  slug: "outros",
  color: "#64748b",
  icon: "📦",
  parentId: null,
  isSystem: true,
  createdAt: new Date(),
};

const mockTransaction = {
  id: "tx-001",
  description: "Supermercado",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.account.findFirst).mockResolvedValue(mockAccount as never);
  vi.mocked(prisma.category.findFirst).mockResolvedValue(mockCategory as never);
  vi.mocked(prisma.transaction.findFirst).mockResolvedValue(null);
  vi.mocked(prisma.transaction.create).mockResolvedValue(mockTransaction as never);
});

describe("POST /api/v1/ingest/transactions", () => {
  it("returns 401 when API key is missing", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .send({ description: "Test", amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("returns 401 when API key is wrong", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", "wrong-key")
      .send({ description: "Test", amount: 100 });

    expect(res.status).toBe(401);
  });

  it("imports a single transaction with valid API key", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send({
        description: "Supermercado Extra",
        amount: 387.50,
        type: "expense",
        date: "2026-04-28",
      });

    expect(res.status).toBe(202);
    expect(res.body.ok).toBe(true);
    expect(res.body.imported).toBe(1);
  });

  it("imports a batch of transactions", async () => {
    vi.mocked(prisma.transaction.create)
      .mockResolvedValueOnce({ id: "tx-001", description: "A" } as never)
      .mockResolvedValueOnce({ id: "tx-002", description: "B" } as never);

    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send([
        { description: "Salário", amount: 8500, type: "income", date: "2026-04-25" },
        { description: "Uber", amount: 45.90, type: "expense", date: "2026-04-24" },
      ]);

    expect(res.status).toBe(202);
    expect(res.body.imported).toBe(2);
  });

  it("infers type from amount sign when type is omitted", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send({ description: "Recebimento", amount: 1000 });

    expect(res.status).toBe(202);
    expect(prisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ amountCents: 100000, type: "income" }),
      })
    );
  });

  it("skips duplicate when externalId already exists", async () => {
    vi.mocked(prisma.transaction.findFirst).mockResolvedValue(mockTransaction as never);

    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send({ description: "Duplicado", amount: 50, externalId: "ext-123" });

    expect(res.status).toBe(202);
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(res.body.imported).toBe(1);
  });

  it("returns 400 for missing description", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send({ amount: 100 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for missing amount", async () => {
    const res = await request(app)
      .post("/api/v1/ingest/transactions")
      .set("x-api-key", VALID_KEY)
      .send({ description: "No amount" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/ingest/config", () => {
  it("returns config with valid API key", async () => {
    const res = await request(app)
      .get("/api/v1/ingest/config")
      .set("x-api-key", VALID_KEY);

    expect(res.status).toBe(200);
    expect(res.body.ingestEndpoint).toBeDefined();
    expect(res.body.aiEnabled).toBe(true);
  });

  it("returns 401 without API key", async () => {
    const res = await request(app).get("/api/v1/ingest/config");
    expect(res.status).toBe(401);
  });
});
