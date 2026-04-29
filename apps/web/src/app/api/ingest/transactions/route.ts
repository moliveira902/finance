import { NextResponse } from "next/server";
import { enqueue, INGEST_API_KEY, type IngestItem } from "@/lib/ingest-queue";

export async function POST(request: Request) {
  const key = request.headers.get("x-api-key");
  if (!key || key !== INGEST_API_KEY) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Invalid API key" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST", message: "Invalid JSON" }, { status: 400 });
  }

  const items: IngestItem[] = Array.isArray(body) ? body : [body as IngestItem];

  const valid: IngestItem[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as unknown as Record<string, unknown>;
    const description = String(t.description ?? t.desc ?? t.name ?? "").trim();
    const rawAmount = Number(t.amount ?? t.value ?? t.valor ?? 0);
    if (!description || isNaN(rawAmount)) continue;

    const typeHint = String(t.type ?? t.tipo ?? "").toLowerCase();
    const type: "income" | "expense" =
      typeHint.includes("rec") || typeHint === "income" || rawAmount > 0
        ? "income"
        : "expense";

    valid.push({
      description,
      amount: Math.abs(rawAmount) * (type === "income" ? 1 : -1),
      type,
      date:
        String(t.date ?? t.data ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
      categoryName: t.category ? String(t.category) : t.categoria ? String(t.categoria) : undefined,
      accountName: t.account ? String(t.account) : t.conta ? String(t.conta) : undefined,
      source: "n8n",
    });
  }

  if (valid.length === 0) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "No valid transactions in payload" },
      { status: 400 }
    );
  }

  enqueue(valid);
  return NextResponse.json({ ok: true, queued: valid.length }, { status: 202 });
}
