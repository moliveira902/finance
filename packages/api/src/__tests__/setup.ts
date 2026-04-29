import { vi } from "vitest";

// Mock Prisma so tests don't require a real database
vi.mock("../lib/prisma.js", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    account: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    transaction: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    budget: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    budgetPeriod: { deleteMany: vi.fn() },
    $transaction: vi.fn((ops: unknown[]) => Promise.all(ops)),
    $disconnect: vi.fn(),
  },
}));

// Mock BullMQ queue so tests don't require Redis
vi.mock("../lib/queue.js", () => ({
  categorizationQueue: { add: vi.fn() },
}));

// Silence pino-http logs in tests
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-32-characters-long!";
