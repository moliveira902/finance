import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { prisma } from "../lib/prisma.js";
import { makeAuthHeader, DEMO_USER_ID } from "./helpers.js";

const app = createApp();
const auth = makeAuthHeader();

const mockAccount = { id: "acc-1", userId: DEMO_USER_ID, name: "Conta", type: "checking", currency: "BRL", balanceCents: 100000, institution: "Bradesco", color: null, icon: null, isArchived: false, createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => vi.clearAllMocks());

describe("GET /api/v1/dashboard", () => {
  it("returns kpis, recentTransactions, and accounts", async () => {
    vi.mocked(prisma.account.findMany).mockResolvedValue([mockAccount]);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transaction.aggregate)
      .mockResolvedValueOnce({ _sum: { amountCents: 850000 } } as never)  // income
      .mockResolvedValueOnce({ _sum: { amountCents: -368750 } } as never); // expenses

    const res = await request(app).get("/api/v1/dashboard").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.kpis.monthlyIncomeCents).toBe(850000);
    expect(res.body.kpis.monthlyExpensesCents).toBe(368750);
    expect(res.body.kpis.freeBalanceCents).toBe(481250);
    expect(res.body.kpis.netWorthCents).toBe(100000);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.recentTransactions).toHaveLength(0);
  });

  it("handles empty state — all zeros, no errors", async () => {
    vi.mocked(prisma.account.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transaction.findMany).mockResolvedValue([]);
    vi.mocked(prisma.transaction.aggregate).mockResolvedValue({ _sum: { amountCents: null } } as never);

    const res = await request(app).get("/api/v1/dashboard").set("Authorization", auth);

    expect(res.status).toBe(200);
    expect(res.body.kpis.netWorthCents).toBe(0);
    expect(res.body.kpis.monthlyIncomeCents).toBe(0);
    expect(res.body.kpis.monthlyExpensesCents).toBe(0);
  });
});
