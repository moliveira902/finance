import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const mockAccount = {
  id: "acc-1",
  userId: DEMO_USER_ID,
  name: "Conta Corrente",
  type: "checking",
  currency: "BRL",
  balanceCents: 845075,
  institution: "Bradesco",
  color: null,
  icon: null,
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/accounts", () => {
  it("lists accounts for the authenticated user", async () => {
    vi.mocked(prisma.account.findMany).mockResolvedValue([mockAccount]);

    const res = await request(app).get("/api/v1/accounts").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe("acc-1");
  });
});

describe("POST /api/v1/accounts", () => {
  it("creates a new account", async () => {
    vi.mocked(prisma.account.create).mockResolvedValue(mockAccount);

    const res = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", auth)
      .send({ name: "Conta Corrente", type: "checking", balanceCents: 845075, institution: "Bradesco" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Conta Corrente");
  });

  it("returns 400 for invalid account type", async () => {
    const res = await request(app)
      .post("/api/v1/accounts")
      .set("Authorization", auth)
      .send({ name: "X", type: "invalid", balanceCents: 0 });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/v1/accounts/:id", () => {
  it("updates an account", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount);
    vi.mocked(prisma.account.update).mockResolvedValue({ ...mockAccount, name: "Updated" });

    const res = await request(app)
      .patch("/api/v1/accounts/acc-1")
      .set("Authorization", auth)
      .send({ name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated");
  });

  it("returns 404 when account does not exist", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(null);

    const res = await request(app)
      .patch("/api/v1/accounts/missing")
      .set("Authorization", auth)
      .send({ name: "X" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/accounts/:id", () => {
  it("returns 409 when account has transactions", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount);
    vi.mocked(prisma.transaction.count).mockResolvedValue(3);

    const res = await request(app)
      .delete("/api/v1/accounts/acc-1")
      .set("Authorization", auth);

    expect(res.status).toBe(409);
  });

  it("deletes account with no transactions", async () => {
    vi.mocked(prisma.account.findUnique).mockResolvedValue(mockAccount);
    vi.mocked(prisma.transaction.count).mockResolvedValue(0);
    vi.mocked(prisma.account.delete).mockResolvedValue(mockAccount);

    const res = await request(app)
      .delete("/api/v1/accounts/acc-1")
      .set("Authorization", auth);

    expect(res.status).toBe(204);
  });
});
