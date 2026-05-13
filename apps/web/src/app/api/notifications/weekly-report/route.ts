import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getStore, type Transaction } from "@/lib/kv-store";
import { dispatch } from "@/lib/notificationService";

function getWeekRange(offsetWeeks: number = 0): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday - offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

function filterExpenses(txs: Transaction[], start: Date, end: Date): Transaction[] {
  return txs.filter((t) => {
    if (t.type !== "expense") return false;
    const d = new Date(t.date);
    return d >= start && d <= end;
  });
}

function groupByCategory(txs: Transaction[]): Map<string, { name: string; icon: string; total: number }> {
  const map = new Map<string, { name: string; icon: string; total: number }>();
  for (const t of txs) {
    const key = t.category.id;
    const prev = map.get(key) ?? { name: t.category.name, icon: t.category.icon, total: 0 };
    map.set(key, { ...prev, total: prev.total + Math.abs(t.amount) });
  }
  return map;
}

function fmt(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function buildMessage(
  thisTxs: Transaction[],
  prevTxs: Transaction[],
  weekStart: Date,
  weekEnd: Date,
): string {
  const thisTotal = thisTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const prevTotal = prevTxs.reduce((s, t) => s + Math.abs(t.amount), 0);
  const delta = thisTotal - prevTotal;

  const thisByCategory = groupByCategory(thisTxs);
  const prevByCategory = groupByCategory(prevTxs);

  const sortedCategories = Array.from(thisByCategory.entries())
    .sort(([, a], [, b]) => b.total - a.total);

  const lines: string[] = [];
  lines.push(`📊 *Resumo Semanal de Gastos*`);
  lines.push(`*${fmtDate(weekStart)} a ${fmtDate(weekEnd)}*\n`);
  lines.push(`💸 *Total gasto: ${fmt(thisTotal)}*`);

  if (prevTotal > 0) {
    const pct = Math.abs((delta / prevTotal) * 100).toFixed(0);
    const arrow = delta > 0 ? "📈" : "📉";
    const sign = delta > 0 ? "+" : "−";
    lines.push(`${arrow} ${sign}${fmt(Math.abs(delta))} vs semana anterior (${sign}${pct}%)`);
  } else if (thisTotal > 0) {
    lines.push(`📅 Primeira semana com dados registrados`);
  }

  if (sortedCategories.length > 0) {
    lines.push(`\n*Por categoria:*`);
    for (const [catId, cat] of sortedCategories) {
      const prevCat = prevByCategory.get(catId);
      let delta = "";
      if (prevCat) {
        const diff = cat.total - prevCat.total;
        if (diff > 1) delta = ` *(▲ ${fmt(diff)})*`;
        else if (diff < -1) delta = ` *(▼ ${fmt(Math.abs(diff))})*`;
      } else if (prevTotal > 0) {
        delta = ` _(novo)_`;
      }
      lines.push(`${cat.icon} ${cat.name}: ${fmt(cat.total)}${delta}`);
    }
  } else {
    lines.push(`\n_Nenhuma despesa registrada nesta semana._`);
  }

  lines.push(`\n_Enviado pelo FinanceApp_`);
  return lines.join("\n");
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let clientTransactions: Transaction[] | undefined;
  try {
    const body = await request.json() as { transactions?: Transaction[] };
    clientTransactions = body.transactions;
  } catch {
    // body is optional
  }

  const allTxs = clientTransactions ?? (await getStore(user.id)).transactions;

  const thisWeek = getWeekRange(0);
  const prevWeek = getWeekRange(1);

  const thisTxs = filterExpenses(allTxs, thisWeek.start, thisWeek.end);
  const prevTxs = filterExpenses(allTxs, prevWeek.start, prevWeek.end);

  const message = buildMessage(thisTxs, prevTxs, thisWeek.start, thisWeek.end);

  await dispatch(user.id, "WEEKLY_EXPENSE_REPORT", message, {
    weekStart: thisWeek.start.toISOString(),
    weekEnd:   thisWeek.end.toISOString(),
    total:     thisTxs.reduce((s, t) => s + Math.abs(t.amount), 0),
  });

  return NextResponse.json({ ok: true });
}
