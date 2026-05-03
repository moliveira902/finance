"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Sparkles, ArrowUpRight, RepeatIcon, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL, formatDate, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function KpiCard({ label, value, sub, positive }: {
  label: string; value: string; sub: string; positive?: boolean;
}) {
  return (
    <Card>
      <CardLabel>{label}</CardLabel>
      <CardValue>{value}</CardValue>
      <p className={cn(
        "flex items-center gap-1 text-xs mt-2 font-medium",
        positive === undefined ? "text-slate-400 dark:text-slate-500"
          : positive ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400"
      )}>
        {positive === true  && <TrendingUp  size={11} />}
        {positive === false && <TrendingDown size={11} />}
        {sub}
      </p>
    </Card>
  );
}

const TOOLTIP = {
  borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

function brlFormatter(v: unknown): [string] {
  return [formatBRL(Number(v || 0))];
}

function kFormatter(v: unknown): string {
  return `R$${(Number(v || 0) / 1000).toFixed(0)}k`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function buildMonthlyTrend(txs: Transaction[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear(), m = d.getMonth();
    const month = d.toLocaleString("pt-BR", { month: "short" });
    const label = month.charAt(0).toUpperCase() + month.slice(1);
    const periodTxs = txs.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m;
    });
    const income   = periodTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = periodTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
    return { month: label, income, expenses };
  });
}

function buildUpcomingRecurring(all: Transaction[]) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const seen  = new Set<string>();
  return all
    .filter((t) => t.isRecurring)
    .filter((t) => {
      const key = t.description.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      // due = no other occurrence found in current period
      if (t.recurringPeriod === "yearly") {
        return !all.some((o) => {
          if (o.id === t.id) return false;
          const d = new Date(o.date);
          return d.getFullYear() === year && o.description.toLowerCase() === key;
        });
      }
      return !all.some((o) => {
        if (o.id === t.id) return false;
        const d = new Date(o.date);
        return d.getFullYear() === year && d.getMonth() === month && o.description.toLowerCase() === key;
      });
    });
}

function buildCategoryBreakdown(txs: Transaction[]) {
  const map = new Map<string, { name: string; value: number; color: string }>();
  txs.filter((t) => t.type === "expense").forEach((t) => {
    const key = t.category.id;
    const prev = map.get(key) ?? { name: t.category.name, value: 0, color: t.category.color };
    map.set(key, { ...prev, value: prev.value + Math.abs(t.amount) });
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 6);
}

export default function DashboardPage() {
  const { transactions, accounts } = useFinanceStore();

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const totalAssets  = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const totalDebt    = accounts.reduce((s, a) => s + Math.max(0, -a.balance), 0);
  const netWorth     = totalAssets - totalDebt;
  const income       = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses     = Math.abs(monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0));
  const recent            = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const monthlyTrend      = buildMonthlyTrend(transactions);
  const catBreakdown      = buildCategoryBreakdown(monthTxs);
  const upcomingRecurring = buildUpcomingRecurring(transactions);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={`Visão geral das suas finanças — ${currentMonthLabel()}`} />

      {/* KPIs */}
      <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-4">
        <KpiCard label="Patrimônio Líquido" value={formatBRL(netWorth)}      sub="Ativos − dívidas"          />
        <KpiCard label="Receitas do mês"     value={formatBRL(income)}        sub="Salário + freelance"       />
        <KpiCard label="Despesas do mês"     value={formatBRL(expenses)}      sub="Total de saídas"           positive={expenses < income} />
        <KpiCard label="Saldo Livre"         value={formatBRL(income - expenses)} sub="Disponível para investir" positive={income - expenses > 0} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4">
        <Card className="@3xl:col-span-2">
          <CardLabel className="mb-4">Fluxo de Caixa — 6 meses</CardLabel>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={kFormatter} />
                <Tooltip contentStyle={TOOLTIP} formatter={brlFormatter} />
                <Area type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} fill="url(#gI)" name="Receitas" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gE)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel className="mb-4">Gastos por Categoria</CardLabel>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste mês.</p>
          ) : (
            <>
              <div className="flex justify-center">
                <PieChart width={150} height={150}>
                  <Pie data={catBreakdown} cx={70} cy={70} innerRadius={44} outerRadius={68} dataKey="value" stroke="none">
                    {catBreakdown.map((_, i) => <Cell key={i} fill={catBreakdown[i].color} />)}
                  </Pie>
                  <Tooltip formatter={brlFormatter} contentStyle={TOOLTIP} />
                </PieChart>
              </div>
              <div className="mt-2 space-y-2">
                {catBreakdown.slice(0, 4).map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                      <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Upcoming recurring */}
      {upcomingRecurring.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Recorrentes em aberto este mês
              </span>
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                {upcomingRecurring.length}
              </span>
            </div>
            <Link href="/recorrentes"
              className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {upcomingRecurring.slice(0, 4).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-lg leading-none">{tx.category.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</p>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <RepeatIcon size={9} />
                      {tx.recurringPeriod === "yearly" ? "Anual" : "Mensal"}
                    </span>
                  </div>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums",
                  tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200")}>
                  {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Accounts + Recent */}
      <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-4">
        <Card>
          <CardLabel className="mb-4">Contas</CardLabel>
          <div className="space-y-3">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0">
                  {acc.type === "credit"
                    ? <CreditCard size={13} className="text-slate-400 dark:text-slate-500" />
                    : <Wallet    size={13} className="text-slate-400 dark:text-slate-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{acc.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{acc.institution}</p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums shrink-0",
                  acc.balance < 0 ? "text-red-500" : "text-slate-900 dark:text-white")}>
                  {formatBRL(acc.balance)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="@3xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <CardLabel>Transações Recentes</CardLabel>
            <Link href="/transactions"
              className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">Nenhuma transação ainda.</p>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {recent.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-lg leading-none">{tx.category.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-xs text-slate-400 dark:text-slate-500">{formatDate(tx.date)}</span>
                        {tx.aiCategory && (
                          <Badge variant="info" className="text-[10px] py-0 px-1.5 gap-0.5">
                            <Sparkles size={8} /> {tx.aiCategory}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums",
                    tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200")}>
                    {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
