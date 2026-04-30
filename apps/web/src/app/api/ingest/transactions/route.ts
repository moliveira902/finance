import { NextResponse } from "next/server";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// ── Configuration ─────────────────────────────────────────────────────────────

const API_KEY           = process.env.API_KEY ?? "fa-ingest-dev-key-change-in-prod";
const RATE_LIMIT_MAX    = 60;
const RATE_LIMIT_WINDOW = 60_000;

// ── Store (writes directly to same /tmp file the UI reads) ────────────────────

// The single demo user — ingest always writes to this user's store
const STORE_PATH = join(
  "/tmp",
  "fa_00000000_0000_0000_0000_000000000002.json"
);

type Category = { id: string; name: string; icon: string; color: string };
type Account  = { id: string; name: string; type: string; balance: number; institution: string };
type Transaction = {
  id: string; description: string; amount: number;
  type: "income" | "expense"; category: Category; account: Account; date: string;
};
interface StoreData {
  transactions: Transaction[]; accounts: Account[]; categories: Category[];
  budgets: unknown[]; profile: { name: string; email: string }; members: unknown[];
}

const DEFAULT_CATEGORIES: Category[] = [
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

function readStore(): StoreData {
  if (existsSync(STORE_PATH)) {
    try {
      const parsed = JSON.parse(readFileSync(STORE_PATH, "utf-8"));
      return {
        transactions: parsed.transactions ?? [],
        accounts:     parsed.accounts     ?? [],
        categories:   parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
        budgets:      parsed.budgets      ?? [],
        profile:      parsed.profile      ?? { name: "", email: "" },
        members:      parsed.members      ?? [],
      };
    } catch { /* corrupt file — fall through */ }
  }
  return { transactions: [], accounts: [], categories: DEFAULT_CATEGORIES,
           budgets: [], profile: { name: "", email: "" }, members: [] };
}

function writeStore(data: StoreData): void {
  try { writeFileSync(STORE_PATH, JSON.stringify(data), "utf-8"); } catch { /* /tmp unavailable */ }
}

function storeUid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function findOrCreateCategory(categories: Category[], name?: string): Category {
  if (!name) return categories.find((c) => c.name === "Outros") ?? DEFAULT_CATEGORIES[9];
  const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
  return found ?? { id: storeUid(), name, icon: "📦", color: "#64748b" };
}

function findOrCreateAccount(accounts: Account[], name?: string): Account {
  if (!name) return accounts[0] ?? { id: storeUid(), name: "Geral", type: "checking", balance: 0, institution: "" };
  const found = accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  return found ?? { id: storeUid(), name, type: "checking", balance: 0, institution: name };
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);
  if (!b || b.resetAt <= now) { buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW }); return false; }
  if (b.count >= RATE_LIMIT_MAX) return true;
  b.count++;
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function log(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...data }));
}

function err(status: number, error: string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status });
}

function isPositiveFinite(v: unknown): v is number {
  return typeof v === "number" && isFinite(v) && v > 0;
}

function isDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.slice(0, 10));
}

function optString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function resolveType(raw: unknown): "income" | "expense" {
  const v = (typeof raw === "string" ? raw : "").toLowerCase();
  return ["income", "receita", "renda", "entrada"].includes(v) ? "income" : "expense";
}

// ── POST /api/ingest/transactions ─────────────────────────────────────────────

export async function POST(request: Request) {
  const ip = clientIp(request);

  if (isRateLimited(ip)) {
    log("rate_limited", { ip });
    return err(429, "RATE_LIMIT", "Too many requests — try again in 1 minute");
  }

  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json")) {
    log("bad_content_type", { ip, ct });
    return err(400, "BAD_REQUEST", "Content-Type must be application/json");
  }

  const key = (request.headers.get("x-api-key") ?? "").trim();
  if (!key || key !== API_KEY) {
    log("auth_failure", { ip });
    return err(401, "UNAUTHORIZED", "Invalid or missing x-api-key");
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { log("invalid_json", { ip }); return err(400, "BAD_REQUEST", "Body must be valid JSON"); }

  // Accept single object or array (n8n sends arrays)
  const items: Record<string, unknown>[] = Array.isArray(body)
    ? (body as Record<string, unknown>[])
    : (typeof body === "object" && body !== null ? [body as Record<string, unknown>] : []);

  if (items.length === 0) {
    return err(400, "BAD_REQUEST", "Body must be a JSON object or a non-empty array of objects");
  }

  // Validate all items before writing anything
  for (let i = 0; i < items.length; i++) {
    const t = items[i];
    if (!isPositiveFinite(t.amount)) {
      log("validation_error", { ip, index: i, field: "amount", value: t.amount });
      return err(400, "BAD_REQUEST", `Item[${i}]: "amount" must be a number greater than 0`);
    }
    if (!isDateString(t.date)) {
      log("validation_error", { ip, index: i, field: "date", value: t.date });
      return err(400, "BAD_REQUEST", `Item[${i}]: "date" must be a string in YYYY-MM-DD format`);
    }
  }

  // Read store once, apply all items, write once
  const store = readStore();
  let queued = 0;

  for (const t of items) {
    const type         = resolveType(t.type);
    const categoryName = optString(t.category);
    const accountName  = optString(t.account);
    const category     = findOrCreateCategory(store.categories, categoryName);
    const account      = findOrCreateAccount(store.accounts, accountName);

    // Persist new category/account if created on the fly
    if (!store.categories.find((c) => c.id === category.id)) store.categories.push(category);
    if (!store.accounts.find((a) => a.id === account.id))    store.accounts.push(account);

    // Expenses are stored as negative numbers (matches UI convention)
    const signedAmount = (t.amount as number) * (type === "income" ? 1 : -1);

    const transaction: Transaction = {
      id:          storeUid(),
      description: optString(t.description) ?? "Transação",
      amount:      signedAmount,
      type,
      category,
      account,
      date:        (t.date as string).slice(0, 10),
    };

    store.transactions.unshift(transaction); // newest first
    queued++;

    log("saved", {
      ip, id: transaction.id, amount: signedAmount, type,
      date: transaction.date, category: category.name, account: account.name,
    });
  }

  writeStore(store);

  return NextResponse.json({ ok: true, queued }, { status: 202 });
}
