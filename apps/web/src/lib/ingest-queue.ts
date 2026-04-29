// Server-side in-memory queue for n8n-ingested transactions.
// Survives across requests in the same Node.js process; gets drained by the
// client when it calls GET /api/ingest/pending.

export interface IngestItem {
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  categoryName?: string;
  accountName?: string;
  source?: string;
}

const queue: IngestItem[] = [];

export function enqueue(items: IngestItem | IngestItem[]) {
  const arr = Array.isArray(items) ? items : [items];
  queue.push(...arr);
}

export function drainQueue(): IngestItem[] {
  return queue.splice(0, queue.length);
}

export function queueLength(): number {
  return queue.length;
}

export const INGEST_API_KEY =
  process.env.INGEST_API_KEY ?? "fa-ingest-dev-key-change-in-prod";
