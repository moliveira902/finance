import { getStore, kvGet, kvSet, isKvConfigured } from "@/lib/kv-store";
import type {
  FinancialContext,
  MonthlyTotal,
  CategoryTotal,
  AccountSummary,
  RecurringItem,
  RecentTransaction,
} from "@/lib/coach";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const cacheKey = `coach:context:${userId}`;

  if (isKvConfigured()) {
    const cached = await kvGet<FinancialContext>(cacheKey);
    if (cached) return cached;
  }

  const store = await getStore(userId);
  const { transactions, accounts } = store;

  // ── Monthly totals — last 6 months ──────────────────────────────────────────
  const now = new Date();
  const monthMap = new Map<string, { income: number; expense: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, { income: 0, expense: 0 });
  }

  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) continue;
    const cents = Math.round(Math.abs(tx.amount) * 100);
    const entry = monthMap.get(key)!;
    if (tx.type === "income") entry.income += cents;
    else entry.expense += cents;
  }

  const monthlyTotals: MonthlyTotal[] = Array.from(monthMap.entries()).map(([month, v]) => ({
    month,
    income: v.income,
    expense: v.expense,
  }));

  const avgMonthlyIncome  = monthlyTotals.reduce((s, m) => s + m.income, 0) / 6;
  const avgMonthlyExpense = monthlyTotals.reduce((s, m) => s + m.expense, 0) / 6;
  const avgMonthlySaving  = avgMonthlyIncome - avgMonthlyExpense;

  // ── Current month ────────────────────────────────────────────────────────────
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthExpense = monthMap.get(currentMonthKey)?.expense ?? 0;

  // ── Category breakdown — current month expenses, top 8 ──────────────────────
  const catMap = new Map<string, number>();
  for (const tx of transactions) {
    const txDate = new Date(tx.date);
    const key = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, "0")}`;
    if (key !== currentMonthKey || tx.type !== "expense") continue;
    const catName = tx.category?.name ?? "Outros";
    catMap.set(catName, (catMap.get(catName) ?? 0) + Math.round(Math.abs(tx.amount) * 100));
  }

  const categoryBreakdown: CategoryTotal[] = Array.from(catMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const topCategory       = categoryBreakdown[0]?.name  ?? "N/A";
  const topCategoryAmount = categoryBreakdown[0]?.total ?? 0;

  // ── Recent transactions — last 20 ────────────────────────────────────────────
  const recentTransactions: RecentTransaction[] = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20)
    .map((tx) => ({
      description: tx.description.slice(0, 40),
      amount: Math.round(Math.abs(tx.amount) * 100),
      category: tx.category?.name ?? "Outros",
      date: tx.date,
      type: tx.type,
    }));

  // ── Account balances ─────────────────────────────────────────────────────────
  const accountSummaries: AccountSummary[] = accounts.map((a) => ({
    name: a.name,
    type: a.type,
    balance: Math.round(a.balance * 100),
  }));

  const totalBalance = accountSummaries.reduce((s, a) => s + a.balance, 0);

  // ── Recurring items — deduplicated by description+period ─────────────────────
  const recurringMap = new Map<string, RecurringItem>();
  for (const tx of transactions) {
    if (!tx.isRecurring) continue;
    const rKey = `${tx.description}:${tx.recurringPeriod}`;
    if (!recurringMap.has(rKey)) {
      recurringMap.set(rKey, {
        description: tx.description,
        amount: Math.round(Math.abs(tx.amount) * 100),
        period: tx.recurringPeriod ?? "monthly",
      });
    }
  }
  const recurringItems: RecurringItem[] = Array.from(recurringMap.values());

  const ctx: FinancialContext = {
    totalBalance,
    avgMonthlyExpense,
    avgMonthlyIncome,
    avgMonthlySaving,
    currentMonthExpense,
    topCategory,
    topCategoryAmount,
    monthlyTotals,
    categoryBreakdown,
    recentTransactions,
    accounts: accountSummaries,
    recurringItems,
  };

  if (isKvConfigured()) {
    await kvSet(cacheKey, ctx, 300);
  }

  return ctx;
}

export function buildSystemPrompt(ctx: FinancialContext, userName: string): string {
  const brl = centsToBRL;

  const lines: string[] = [
    `Você é o Consultor Financeiro pessoal de ${userName}.`,
    `Responda SEMPRE em português brasileiro, de forma direta e sem jargões.`,
    `Baseie toda análise EXCLUSIVAMENTE nos dados abaixo — nunca invente números.`,
    ``,
    `## SITUAÇÃO ATUAL`,
    `Patrimônio líquido total: ${brl(ctx.totalBalance)}`,
    `Gasto no mês atual: ${brl(ctx.currentMonthExpense)}`,
    `Categoria com maior gasto (mês atual): ${ctx.topCategory} — ${brl(ctx.topCategoryAmount)}`,
    ``,
    `## MÉDIAS DOS ÚLTIMOS 6 MESES`,
    `Receita média/mês: ${brl(ctx.avgMonthlyIncome)}`,
    `Despesa média/mês: ${brl(ctx.avgMonthlyExpense)}`,
    `Economia média/mês: ${brl(ctx.avgMonthlySaving)}`,
    ``,
    `## HISTÓRICO MENSAL (últimos 6 meses)`,
    ...ctx.monthlyTotals.map((m) => `${m.month}: receita ${brl(m.income)} | despesa ${brl(m.expense)}`),
    ``,
    `## GASTOS POR CATEGORIA (mês atual)`,
    ...(ctx.categoryBreakdown.length
      ? ctx.categoryBreakdown.map((c) => `${c.name}: ${brl(c.total)}`)
      : ["Nenhum gasto registrado neste mês."]),
    ``,
    `## CONTAS`,
    ...(ctx.accounts.length
      ? ctx.accounts.map((a) => `${a.name} (${a.type}): ${brl(a.balance)}`)
      : ["Nenhuma conta cadastrada."]),
  ];

  if (ctx.recurringItems.length) {
    lines.push(``, `## DESPESAS/RECEITAS FIXAS`);
    for (const r of ctx.recurringItems) {
      lines.push(`${r.description}: ${brl(r.amount)}/${r.period === "monthly" ? "mês" : "ano"}`);
    }
  }

  lines.push(``, `## ÚLTIMAS TRANSAÇÕES`);
  if (ctx.recentTransactions.length) {
    for (const tx of ctx.recentTransactions) {
      const sign = tx.type === "income" ? "+" : "-";
      lines.push(`${tx.date} | ${sign}${brl(tx.amount)} | ${tx.description} (${tx.category})`);
    }
  } else {
    lines.push("Nenhuma transação registrada.");
  }

  return lines.join("\n");
}
