import { NextResponse } from "next/server";
import { enqueue, type IngestItem } from "@/lib/ingest-queue";

const API_KEY = process.env.API_KEY ?? "fa-ingest-dev-key-change-in-prod";

export async function POST(request: Request) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const key = request.headers.get("x-api-key");
  if (!key || key !== API_KEY) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: "Invalid or missing x-api-key header" },
      { status: 401 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "Body must be valid JSON" },
      { status: 400 }
    );
  }

  const items: unknown[] = Array.isArray(body) ? body : [body];

  // ── Validate & normalise each item ──────────────────────────────────────────
  const valid: IngestItem[] = [];
  const errors: string[] = [];

  items.forEach((item, idx) => {
    if (typeof item !== "object" || item === null) {
      errors.push(`[${idx}] not an object`);
      return;
    }

    const t = item as Record<string, unknown>;

    // Required: amount
    const rawAmount = Number(t.amount ?? t.value ?? t.valor ?? NaN);
    if (isNaN(rawAmount) || rawAmount === 0) {
      errors.push(`[${idx}] "amount" is required and must be a non-zero number`);
      return;
    }

    // Required: date (YYYY-MM-DD)
    const rawDate = String(t.date ?? t.data ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      errors.push(`[${idx}] "date" is required in YYYY-MM-DD format`);
      return;
    }

    // Optional: description (defaults to "Transação")
    const description = String(t.description ?? t.desc ?? t.name ?? "Transação").trim();

    // Optional: type — inferred from sign if omitted
    const typeHint = String(t.type ?? t.tipo ?? "").toLowerCase();
    const type: "income" | "expense" =
      typeHint === "income" || typeHint.startsWith("rec") || rawAmount > 0
        ? "income"
        : "expense";

    valid.push({
      description,
      amount: Math.abs(rawAmount) * (type === "income" ? 1 : -1),
      type,
      date: rawDate,
      categoryName: t.category  ? String(t.category)  : t.categoria ? String(t.categoria) : undefined,
      accountName:  t.account   ? String(t.account)   : t.conta     ? String(t.conta)     : undefined,
      source: "n8n",
    });
  });

  if (valid.length === 0) {
    return NextResponse.json(
      { ok: false, error: "BAD_REQUEST", message: "No valid transactions found", errors },
      { status: 400 }
    );
  }

  enqueue(valid);

  return NextResponse.json(
    { ok: true, queued: valid.length, ...(errors.length ? { skipped: errors } : {}) },
    { status: 202 }
  );
}
