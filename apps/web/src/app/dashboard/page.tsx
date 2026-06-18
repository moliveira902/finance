"use client";
import { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ComposedChart, Bar, Line, BarChart,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Sparkles, ArrowUpRight, RepeatIcon, Clock } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScoreWidget } from "@/components/dashboard/ScoreWidget";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL, formatDate, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

function KpiCard({ label, value, sub, positive }: {
  label: string; value: string; sub: string; positive?: boolean;
}) {
  return (
    <Card>
      <CardLabel>{label}</CardLabel>
      <CardValue>{value}</CardValue>
      <p className={cn(
        "flex items-center gap-1 text-xs mt-2 font-medium truncate",
        positive === undefined ? "text-slate-400 dark:text-slate-500"
          : positive ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-500 dark:text-red-400"
      )}>
        {positive === true  && <TrendingUp  size={11} className="shrink-0" />}
        {positive === false && <TrendingDown size={11} className="shrink-0" />}
        <span className="truncate">{sub}</span>
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

function buildMonthlyTrend(txs: Transaction[], locale: string) {
  return Array.from({ length: 6 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear(), m = d.getMonth();
    const month = d.toLocaleString(locale, { month: "short" });
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
  const map = new Map<string, { id: string; name: string; value: number; color: string }>();
  txs.filter((t) => t.type === "expense").forEach((t) => {
    const key = t.category.id;
    const prev = map.get(key) ?? { id: key, name: t.category.name, value: 0, color: t.category.color };
    map.set(key, { ...prev, value: prev.value + Math.abs(t.amount) });
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 6);
}

function buildDailyCategorySpending(txs: Transaction[], year: number, month: number, categoryId: string) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const amount = txs
      .filter((t) => {
        if (t.type !== "expense" || t.category.id !== categoryId) return false;
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return { day, amount };
  });
}

function buildDailySpending(txs: Transaction[], year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dow = new Date(year, month, day).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const amount = txs
      .filter((t) => {
        if (t.type !== "expense") return false;
        const d = new Date(t.date);
        return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    return { day, isWeekend, amount };
  });
}

function monthlyRecurringNet(txs: Transaction[]): number {
  const seen = new Set<string>();
  return txs
    .filter((t) => t.isRecurring)
    .filter((t) => {
      const key = t.description.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .reduce((s, t) => {
      const monthly = t.recurringPeriod === "yearly"
        ? Math.abs(t.amount) / 12
        : Math.abs(t.amount);
      return t.type === "income" ? s + monthly : s - monthly;
    }, 0);
}

export default function DashboardPage() {
  const { transactions, accounts, appSettings, categories } = useFinanceStore();
  const { t, locale } = useTranslation();
  const [compareOffset, setCompareOffset] = useState<1 | 2 | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string>(() => categories[0]?.id ?? "");

  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const monthLabel = now.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const totalAssets  = accounts.reduce((s, a) => s + Math.max(0, a.balance), 0);
  const totalDebt    = accounts.reduce((s, a) => s + Math.max(0, -a.balance), 0);
  const netWorth     = totalAssets - totalDebt;
  const income       = monthTxs.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0);
  const expenses     = Math.abs(monthTxs.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0));
  const monthlyFixedNet = monthlyRecurringNet(transactions);
  const recent            = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const monthlyTrend      = buildMonthlyTrend(transactions, locale);
  const catBreakdown      = buildCategoryBreakdown(monthTxs);
  const upcomingRecurring = buildUpcomingRecurring(transactions);

  // Daily spending data
  const dailyCurrent = buildDailySpending(transactions, y, m);
  const compareDate  = compareOffset !== null ? new Date(y, m - compareOffset, 1) : null;
  const dailyCompare = compareDate
    ? buildDailySpending(transactions, compareDate.getFullYear(), compareDate.getMonth())
    : null;
  const dailyData = dailyCurrent.map((d, i) => ({
    ...d,
    compare: dailyCompare?.[i]?.amount ?? null,
  }));

  // Daily spending by category
  const selectedCat = categories.find((c) => c.id === selectedCatId);
  const dailyCatData = selectedCatId
    ? buildDailyCategorySpending(transactions, y, m, selectedCatId)
    : [];

  function monthChipLabel(offsetMonths: number) {
    const d = new Date(y, m - offsetMonths, 1);
    const label = d.toLocaleString(locale, { month: "short" });
    return label.charAt(0).toUpperCase() + label.slice(1).replace(".", "");
  }

  return (
    <div className="space-y-4 @sm:space-y-6">
      <PageHeader title={t("dashboard.title")} subtitle={t("dashboard.subtitle", { month: monthLabel })} />

      {/* KPIs */}
      <div className="grid grid-cols-2 @xl:grid-cols-2 @3xl:grid-cols-4 gap-3 @sm:gap-4">
        <KpiCard label={t("dashboard.netWorth")} value={formatBRL(netWorth)}
          sub={t("dashboard.netWorthSub", { sign: monthlyFixedNet >= 0 ? "+" : "−", value: formatBRL(Math.abs(monthlyFixedNet)) })} />
        <KpiCard label={t("dashboard.monthlyIncome")}   value={formatBRL(income)}        sub={t("dashboard.incomeSub")}    />
        <KpiCard label={t("dashboard.monthlyExpenses")} value={formatBRL(expenses)}      sub={t("dashboard.expensesSub")}  positive={expenses < income} />
        <KpiCard label={t("dashboard.freeBalance")}     value={formatBRL(income - expenses)} sub={t("dashboard.freeBalanceSub")} positive={income - expenses > 0} />
      </div>

      {/* Health Score widget — shown only when feature is enabled */}
      {appSettings?.healthScoreEnabled !== false && <ScoreWidget />}

      {/* Charts row */}
      <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-3 @sm:gap-4">
        <Card className="@3xl:col-span-2">
          <CardLabel className="mb-4">{t("dashboard.cashFlow")}</CardLabel>
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
                <Area type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} fill="url(#gI)" name={t("common.income")} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gE)" name={t("common.expenses")} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel className="mb-4">{t("dashboard.byCategory")}</CardLabel>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">{t("dashboard.noExpenses")}</p>
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

      {/* Daily spending chart */}
      <Card>
        <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 mb-4">
          <CardLabel>{t("dashboard.dailySpending")}</CardLabel>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCompareOffset(null)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                compareOffset === null
                  ? "bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300"
                  : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {monthChipLabel(0)}
            </button>
            <button
              onClick={() => setCompareOffset(compareOffset === 1 ? null : 1)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                compareOffset === 1
                  ? "bg-violet-50 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              {t("dashboard.dailyVs")} {monthChipLabel(1)}
            </button>
            <button
              onClick={() => setCompareOffset(compareOffset === 2 ? null : 2)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                compareOffset === 2
                  ? "bg-violet-50 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300"
                  : "border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              {t("dashboard.dailyVs")} {monthChipLabel(2)}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <span className="w-3 h-3 rounded bg-sky-400" />
            {t("dashboard.dailyWeekday")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-amber-500 dark:text-amber-400">
            <span className="w-3 h-3 rounded bg-amber-400" />
            {t("dashboard.dailyWeekend")}
          </span>
          {compareOffset !== null && (
            <span className="flex items-center gap-1.5 text-xs text-violet-500 dark:text-violet-400">
              <span className="inline-block w-5 border-t-2 border-dashed border-violet-400" />
              {monthChipLabel(compareOffset)}
            </span>
          )}
        </div>

        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={kFormatter} width={38} />
              <Tooltip
                contentStyle={TOOLTIP}
                formatter={(value: unknown, name: unknown) => [formatBRL(Number(value || 0)), name === "amount" ? t("dashboard.dailyWeekday") : monthChipLabel(compareOffset ?? 1)]}
                labelFormatter={(label) => `Dia ${label}`}
              />
              <Bar dataKey="amount" name="amount" radius={[3, 3, 0, 0]} maxBarSize={14}>
                {dailyData.map((d, i) => (
                  <Cell key={i} fill={d.isWeekend ? "#f59e0b" : "#38bdf8"} fillOpacity={d.amount === 0 ? 0.25 : 0.85} />
                ))}
              </Bar>
              {compareOffset !== null && (
                <Line
                  type="monotone"
                  dataKey="compare"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="4 3"
                  connectNulls={false}
                  name="compare"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Daily expenses by category */}
      <Card>
        <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 mb-4">
          <CardLabel>{t("dashboard.categoryDaily")}</CardLabel>
          <select
            value={selectedCatId}
            onChange={(e) => setSelectedCatId(e.target.value)}
            className="h-8 max-w-[200px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs px-2.5 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 dark:focus:ring-offset-slate-900"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        {dailyCatData.every((d) => d.amount === 0) ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">{t("dashboard.noExpenses")}</p>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyCatData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={kFormatter} width={38} />
                <Tooltip
                  contentStyle={TOOLTIP}
                  formatter={(v) => [formatBRL(Number(v || 0))]}
                  labelFormatter={(l) => `Dia ${l}`}
                />
                <Bar
                  dataKey="amount"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={14}
                  fill={selectedCat?.color ?? "#38bdf8"}
                  fillOpacity={0.85}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {/* Upcoming recurring */}
      {upcomingRecurring.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("dashboard.openRecurring")}
              </span>
              <span className="text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                {upcomingRecurring.length}
              </span>
            </div>
            <Link href="/recorrentes"
              className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
              {t("common.viewAll")} <ArrowUpRight size={12} />
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
                      {tx.recurringPeriod === "yearly" ? t("dashboard.recYearly") : t("dashboard.recMonthly")}
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
      <div className="grid grid-cols-1 @3xl:grid-cols-3 gap-3 @sm:gap-4">
        <Card>
          <CardLabel className="mb-4">{t("dashboard.accounts")}</CardLabel>
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
            <CardLabel>{t("dashboard.recentTxns")}</CardLabel>
            <Link href="/transactions"
              className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
              {t("common.viewAll")} <ArrowUpRight size={12} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">{t("dashboard.noTxns")}</p>
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
