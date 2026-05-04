/**
 * Shared key-value store used by all API routes.
 *
 * Uses Upstash Redis when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are present (set these in Vercel → Settings → Environment Variables after
 * creating a free database at console.upstash.com).
 *
 * Falls back to /tmp files when not configured (local dev). /tmp is
 * per-instance and ephemeral — data loss is expected in that mode.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Category = { id: string; name: string; icon: string; color: string };
export type Account  = { id: string; name: string; type: string; balance: number; institution: string };
export type Transaction = {
  id: string; description: string; amount: number;
  type: "income" | "expense"; category: Category; account: Account; date: string;
  isRecurring?: boolean; recurringPeriod?: "monthly" | "yearly"; recurringCount?: number;
};
export interface StoreData {
  transactions: Transaction[];
  accounts:     Account[];
  categories:   Category[];
  profile:      { name: string; email: string };
  members:      unknown[];
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "1",  name: "Alimentação", icon: "🍔", color: "#f97316" },
  { id: "2",  name: "Transporte",  icon: "🚗", color: "#3b82f6" },
  { id: "3",  name: "Moradia",     icon: "🏠", color: "#8b5cf6" },
  { id: "4",  name: "Saúde",       icon: "💊", color: "#ef4444" },
  { id: "5",  name: "Lazer",       icon: "🎬", color: "#ec4899" },
  { id: "6",  name: "Educação",    icon: "📚", color: "#14b8a6" },
  { id: "7",  name: "Vestuário",   icon: "👔", color: "#f59e0b" },
  { id: "8",  name: "Salário",     icon: "💼", color: "#10b981" },
  { id: "9",  name: "Freelance",   icon: "💻", color: "#0ea5e9" },
  { id: "10", name: "Outros",      icon: "📦", color: "#64748b" },
];

const EMPTY_STORE: StoreData = {
  transactions: [],
  accounts:     [],
  categories:   DEFAULT_CATEGORIES,
  profile:      { name: "", email: "" },
  members:      [],
};

// ── Upstash Redis backend ─────────────────────────────────────────────────────

export function isKvConfigured(): boolean {
  return !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;
}

async function getRedis() {
  const { Redis } = await import("@upstash/redis");
  return new Redis({
    url:   process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function kvGet<T = unknown>(key: string): Promise<T | null> {
  const redis = await getRedis();
  return redis.get<T>(key);
}

export async function kvSet<T = unknown>(key: string, data: T, ex?: number): Promise<void> {
  const redis = await getRedis();
  if (ex) {
    await redis.set(key, data, { ex });
  } else {
    await redis.set(key, data);
  }
}

export async function kvDel(key: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(key);
}

// ── /tmp fallback ─────────────────────────────────────────────────────────────

function tmpPath(userId: string): string {
  return join("/tmp", `fa_${userId.replace(/\W/g, "_")}.json`);
}

function tmpGet(userId: string): StoreData | null {
  const fp = tmpPath(userId);
  if (!existsSync(fp)) return null;
  try { return JSON.parse(readFileSync(fp, "utf-8")) as StoreData; } catch { return null; }
}

function tmpSet(userId: string, data: StoreData): void {
  try { writeFileSync(tmpPath(userId), JSON.stringify(data), "utf-8"); } catch { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────────────────────

function storeKey(userId: string): string {
  return `store:${userId}`;
}

export async function getStore(userId: string): Promise<StoreData> {
  let raw: StoreData | null = null;

  if (isKvConfigured()) {
    raw = await kvGet<StoreData>(storeKey(userId));
  } else {
    raw = tmpGet(userId);
  }

  if (!raw) return { ...EMPTY_STORE, categories: [...DEFAULT_CATEGORIES] };

  return {
    transactions: raw.transactions ?? [],
    accounts:     raw.accounts     ?? [],
    categories:   raw.categories?.length ? raw.categories : DEFAULT_CATEGORIES,
    profile:      raw.profile      ?? { name: "", email: "" },
    members:      raw.members      ?? [],
  };
}

export async function setStore(userId: string, data: StoreData): Promise<void> {
  if (isKvConfigured()) {
    await kvSet(storeKey(userId), data);
  } else {
    tmpSet(userId, data);
  }
}
