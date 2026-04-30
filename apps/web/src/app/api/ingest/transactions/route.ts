import { NextResponse } from "next/server";
import { enqueue, type IngestItem } from "@/lib/ingest-queue";

const API_KEY = process.env.API_KEY ?? "fa-ingest-dev-key-change-in-prod";

export async function POST(request: Request) {
  // ── 1. Validate API key ─────────────────────────────────────────────────────
  const key = request.headers.get("x-api-key");
  if (!key || key !== API_KEY) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: "Invalid or missing x-api-key" },
      { status: 401 }
    );
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Body must be valid JSON" },
      { status: 400 }
    );
  }

  // Accept a single object or an array
  const items: unknown[] = Array.isArray(body) ? body : [body];

  // ── 3. Validate and normalise each item ─────────────────────────────────────
  const valid: IngestItem[] = [];
  const skipped: string[] = [];

  items.forEach((item, idx) => {
    if (typeof item !== "object" || item === null) {
      skipped.push(`[${idx}] not an object`);
      return;
    }

    const t = item as Record<string, unknown>;

    // Required: amount (non-zero number)
    const rawAmount = Number(t.amount ?? t.value ?? t.valor ?? NaN);
    if (!rawAmount || isNaN(rawAmount)) {
      skipped.push(`[${idx}] "amount" is required and must be a non-zero number`);
      return;
    }

    // Required: date in YYYY-MM-DD
    const rawDate = String(t.date ?? t.data ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      skipped.push(`[${idx}] "date" is required in YYYY-MM-DD format`);
      return;
    }

    // Optional: type — inferred from amount sign when omitted
    const typeHint = String(t.type ?? t.tipo ?? "").toLowerCase();
    const type: "income" | "expense" =
      typeHint === "income" || typeHint.startsWith("rec") || rawAmount > 0
        ? "income"
        : "expense";

    valid.push({
      description: String(t.description ?? t.desc ?? t.name ?? "Transação").trim(),
      amount:      Math.abs(rawAmount) * (type === "income" ? 1 : -1),
      type,
      date:        rawDate,
      categoryName: t.category  ? String(t.category)  : t.categoria ? String(t.categoria) : undefined,
      accountName:  t.account   ? String(t.account)   : t.conta     ? String(t.conta)     : undefined,
      source: "n8n",
    });
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "No valid transactions in payload", skipped },
      { status: 400 }
    );
  }

  // ── 4. Enqueue and respond ──────────────────────────────────────────────────
  enqueue(valid);

  return NextResponse.json(
    { ok: true, queued: valid.length, ...(skipped.length && { skipped }) },
    { status: 202 }
  );
}
