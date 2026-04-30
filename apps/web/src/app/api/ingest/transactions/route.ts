import { NextResponse } from "next/server";
import { enqueue } from "@/lib/ingest-queue";

// ── Configuration ─────────────────────────────────────────────────────────────

const API_KEY            = process.env.API_KEY ?? "fa-ingest-dev-key-change-in-prod";
const RATE_LIMIT_MAX     = 60;        // requests allowed per window
const RATE_LIMIT_WINDOW  = 60_000;   // 1 minute in ms

// ── Rate limiter (in-memory, per IP) ─────────────────────────────────────────

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const b   = buckets.get(ip);

  if (!b || b.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return false;
  }
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

// ── POST /api/ingest/transactions ─────────────────────────────────────────────

export async function POST(request: Request) {
  const ip = clientIp(request);

  // 1 ── Rate limit
  if (isRateLimited(ip)) {
    log("rate_limited", { ip });
    return err(429, "RATE_LIMIT", "Too many requests — try again in 1 minute");
  }

  // 2 ── Content-Type guard
  const ct = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!ct.includes("application/json")) {
    log("bad_content_type", { ip, ct });
    return err(400, "BAD_REQUEST", "Content-Type must be application/json");
  }

  // 3 ── API key
  const key = (request.headers.get("x-api-key") ?? "").trim();
  if (!key || key !== API_KEY) {
    log("auth_failure", { ip });
    return err(401, "UNAUTHORIZED", "Invalid or missing x-api-key");
  }

  // 4 ── Parse JSON body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    log("invalid_json", { ip });
    return err(400, "BAD_REQUEST", "Body must be valid JSON");
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return err(400, "BAD_REQUEST", "Body must be a JSON object");
  }

  const t = body as Record<string, unknown>;

  // 5 ── Validate required fields

  if (!isPositiveFinite(t.amount)) {
    log("validation_error", { ip, field: "amount", value: t.amount });
    return err(400, "BAD_REQUEST", '"amount" must be a number greater than 0');
  }

  if (!isDateString(t.date)) {
    log("validation_error", { ip, field: "date", value: t.date });
    return err(400, "BAD_REQUEST", '"date" must be a string in YYYY-MM-DD format');
  }

  // 6 ── Normalise optional fields

  const description = optString(t.description) ?? "Transação";
  const category    = optString(t.category);
  const account     = optString(t.account);
  const typeRaw     = typeof t.type === "string" ? t.type.toLowerCase() : "";
  const type: "income" | "expense" = typeRaw === "income" ? "income" : "expense";

  // 7 ── Enqueue

  enqueue({
    description,
    amount:       t.amount * (type === "income" ? 1 : -1),
    type,
    date:         (t.date as string).slice(0, 10),
    categoryName: category,
    accountName:  account,
    source:       "n8n",
  });

  log("queued", {
    ip,
    amount:   t.amount,
    type,
    date:     t.date,
    category: category ?? null,
    success:  true,
  });

  return NextResponse.json({ ok: true, queued: 1 }, { status: 202 });
}
