import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getStore, type Transaction } from "@/lib/kv-store";
import { getUserPrefs, setUserPrefs } from "@/lib/userPrefs";

const FAMILIO_ENDPOINT     = process.env.FAMILIO_ENDPOINT     ?? "https://familio-git-master-moliveira902-5664s-projects.vercel.app/api/finance";
const FAMILIO_API_KEY      = process.env.FAMILIO_API_KEY      ?? "fam_d3e87d2f030713433d95c7025cd768b989b9c2baa98f8d2c";
const FAMILIO_BYPASS_TOKEN = process.env.FAMILIO_BYPASS_TOKEN ?? "";

// Returns the Mon–Sun week range for the given offset (0 = current, 1 = previous)
function getWeekRange(offsetWeeks = 0): { start: Date; end: Date } {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(now);
  mon.setDate(now.getDate() + diff - offsetWeeks * 7);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon, end: sun };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function filterExpenses(txs: Transaction[], start: Date, end: Date): Transaction[] {
  return txs.filter((t) => {
    if (t.type !== "expense") return false;
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

function groupByCategory(txs: Transaction[]): { name: string; amount: number }[] {
  const map = new Map<string, { name: string; amount: number }>();
  for (const t of txs) {
    const key  = t.category.id;
    const prev = map.get(key) ?? { name: t.category.name, amount: 0 };
    map.set(key, { name: prev.name, amount: prev.amount + Math.abs(t.amount) });
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

function buildNote(thisTotal: number, prevTotal: number): string {
  if (prevTotal <= 0) return "First week with recorded data.";
  const pct = ((thisTotal - prevTotal) / prevTotal) * 100;
  const abs = Math.abs(pct).toFixed(0);
  return pct > 0 ? `${abs}% above last week.` : `${abs}% below last week.`;
}

export interface FamilioPayload {
  summary: {
    title:         string;
    totalExpenses: number;
    currency:      string;
    period:        string;
    categories:    { name: string; amount: number }[];
    note:          string;
  };
  date:       string;
  assignedTo: string;
}

export async function buildFamilioPayload(
  txs: Transaction[],
  assignedTo: string,
): Promise<FamilioPayload> {
  const thisWeek = getWeekRange(0);
  const prevWeek = getWeekRange(1);

  const thisTxs  = filterExpenses(txs, thisWeek.start, thisWeek.end);
  const prevTxs  = filterExpenses(txs, prevWeek.start, prevWeek.end);
  const thisTotal = thisTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevTotal = prevTxs.reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    summary: {
      title:         "Weekly Finance Summary",
      totalExpenses: Math.round(thisTotal * 100) / 100,
      currency:      "BRL",
      period:        `${isoDate(thisWeek.start)}/${isoDate(thisWeek.end)}`,
      categories:    groupByCategory(thisTxs).map((c) => ({
        name:   c.name,
        amount: Math.round(c.amount * 100) / 100,
      })),
      note: buildNote(thisTotal, prevTotal),
    },
    date:       isoDate(new Date()),
    assignedTo: assignedTo || "Family",
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const prefs = await getUserPrefs(user.id);

  let assignedTo = prefs.familioConfig?.assignedTo ?? "";
  try {
    const body = await request.json() as { assignedTo?: string };
    if (body.assignedTo !== undefined) assignedTo = body.assignedTo;
  } catch { /* body is optional */ }

  const store  = await getStore(user.id);
  const txs    = (store as { transactions: Transaction[] }).transactions ?? [];
  const payload = await buildFamilioPayload(txs, assignedTo);

  let familioOk   = false;
  let familioBody = "";
  let error       = "";

  try {
    const headers: Record<string, string> = {
      "Content-Type":  "application/json",
      "x-api-key":     FAMILIO_API_KEY,
      "Authorization": `Bearer ${FAMILIO_API_KEY}`,
    };
    if (FAMILIO_BYPASS_TOKEN) headers["x-vercel-protection-bypass"] = FAMILIO_BYPASS_TOKEN;

    const res = await fetch(FAMILIO_ENDPOINT, {
      method: "POST",
      headers,
      body:   JSON.stringify(payload),
    });
    familioBody = await res.text().catch(() => "");
    if (res.ok) {
      familioOk = true;
    } else {
      error = `Familio returned ${res.status}: ${familioBody}`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Network error";
  }

  // Persist last payload & timestamp regardless of success so user can review
  await setUserPrefs(user.id, {
    familioConfig: {
      ...(prefs.familioConfig ?? { enabled: false, sendDay: 0, assignedTo: "" }),
      assignedTo,
      lastPayload: JSON.stringify(payload, null, 2),
      ...(familioOk ? { lastSentAt: new Date().toISOString() } : {}),
    },
  });

  if (!familioOk) {
    return NextResponse.json({ ok: false, payload, error }, { status: 502 });
  }

  return NextResponse.json({ ok: true, payload, familioResponse: familioBody });
}
