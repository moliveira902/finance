/**
 * Shared key-value store used by all API routes.
 *
 * Uses Vercel KV (Redis) when the KV_REST_API_URL env var is present —
 * this is added automatically when you link a KV database in the Vercel dashboard.
 *
 * Falls back to /tmp files when KV is not configured (local dev, or before
 * KV is set up). /tmp is per-instance and ephemeral — data loss is possible
 * in that mode.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Category = { id: string; name: string; icon: string; color: string };
export type Account  = { id: string; name: string; type: string; balance: number; institution: string };
export type Transaction = {
  id: string; description: string; amount: number;
  type: "income" | "expense"; category: Category; account: Account; date: string;
};
export interface StoreData {
  transactions: Transaction[];
  accounts:     Account[];
  categories:   Category[];
  budgets:      unknown[];
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
  budgets:      [],
  profile:      { name: "", email: "" },
  members:      [],
};

// ── KV backend ────────────────────────────────────────────────────────────────

function isKvConfigured(): boolean {
  return !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
}

async function kvGet(key: string): Promise<StoreData | null> {
  const { kv } = await import("@vercel/kv");
  return kv.get<StoreData>(key);
}

async function kvSet(key: string, data: StoreData): Promise<void> {
  const { kv } = await import("@vercel/kv");
  await kv.set(key, data);
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
    raw = await kvGet(storeKey(userId));
  } else {
    raw = tmpGet(userId);
  }

  if (!raw) return { ...EMPTY_STORE, categories: [...DEFAULT_CATEGORIES] };

  return {
    transactions: raw.transactions ?? [],
    accounts:     raw.accounts     ?? [],
    categories:   raw.categories?.length ? raw.categories : DEFAULT_CATEGORIES,
    budgets:      raw.budgets      ?? [],
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
