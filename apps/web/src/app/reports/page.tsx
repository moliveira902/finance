"use client";
import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, ChevronDown, Users, User } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { CombinedTransaction } from "@/app/api/household/report/route";

// ── Recharts helpers ──────────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

function brlFormatter(v: unknown): [string] {
  return [formatBRL(Number(v || 0))];
}

function kFormatter(v: unknown): string {
  return `R$${(Number(v || 0) / 1000).toFixed(0)}k`;
}

// ── Data-building (works for both personal & combined transactions) ───────────

type TxLike = Pick<Transaction, "date" | "type" | "amount" | "category">;

function buildMonthlyTrend(txs: TxLike[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear(), m = d.getMonth();
    const month = d.toLocaleString("pt-BR", { month: "short" });
    const label = month.charAt(0).toUpperCase() + month.slice(1);
    const full  = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const pts = txs.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m;
    });
    const income   = pts.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = pts.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
    return { month: label, fullLabel: full, year: y, monthIndex: m, income, expenses };
  });
}

function buildCategoryBreakdown(txs: TxLike[], year?: number, monthIndex?: number) {
  const pts = (year !== undefined && monthIndex !== undefined)
    ? txs.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === monthIndex && t.type === "expense";
      })
    : txs.filter((t) => t.type === "expense");
  const map = new Map<string, { name: string; value: number; color: string }>();
  pts.forEach((t) => {
    const key  = t.category.name; // group by name so both users' categories merge
    const prev = map.get(key) ?? { name: t.category.name, value: 0, color: t.category.color };
    map.set(key, { ...prev, value: prev.value + Math.abs(t.amount) });
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

function buildCombinedCategoryBreakdown(
  txs: CombinedTransaction[],
  year: number | undefined,
  monthIndex: number | undefined,
  ownerName: string,
) {
  const pts = (year !== undefined && monthIndex !== undefined)
    ? txs.filter((t) => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === monthIndex && t.type === "expense";
      })
    : txs.filter((t) => t.type === "expense");
  const map = new Map<string, {
    name: string; color: string; total: number;
    ownerAmount: number; memberAmount: number;
  }>();
  pts.forEach((t) => {
    const key  = t.category.name;
    const prev = map.get(key) ?? { name: key, color: t.category.color, total: 0, ownerAmount: 0, memberAmount: 0 };
    const amt  = Math.abs(t.amount);
    const isOwner = t.paidByName === ownerName;
    map.set(key, {
      ...prev,
      total: prev.total + amt,
      ownerAmount:  isOwner ? prev.ownerAmount  + amt : prev.ownerAmount,
      memberAmount: isOwner ? prev.memberAmount      : prev.memberAmount + amt,
    });
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// ── Household info ─────────────────────────────────────────────────────────────

interface HouseholdMeta {
  ownerUserId: string;
  memberUserId: string;
  ownerName: string;
  memberName: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

type ViewMode = "personal" | "household";

export default function ReportsPage() {
  const { transactions: personalTxns } = useFinanceStore();

  const [selectedIdx,       setSelectedIdx]       = useState(5);
  const [viewMode,          setViewMode]          = useState<ViewMode>("personal");
  const [household,         setHousehold]         = useState<HouseholdMeta | null>(null);
  const [combinedTxns,      setCombinedTxns]      = useState<CombinedTransaction[]>([]);
  const [loadingHH,         setLoadingHH]         = useState(false);
  const [expandedCategory,  setExpandedCategory]  = useState<string | null>(null);

  // Collapse drill-down whenever the period or view changes
  useEffect(() => { setExpandedCategory(null); }, [selectedIdx, viewMode]);

  // Check for household on mount
  useEffect(() => {
    fetch("/api/household")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { household?: HouseholdMeta | null } | null) => {
        if (d?.household) setHousehold(d.household);
      })
      .catch(() => {});
  }, []);

  // Fetch combined data when switching to household view
  useEffect(() => {
    if (viewMode !== "household" || combinedTxns.length > 0) return;
    setLoadingHH(true);
    fetch("/api/household/report")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { transactions?: CombinedTransaction[] } | null) => {
        if (d?.transactions) setCombinedTxns(d.transactions);
      })
      .catch(() => {})
      .finally(() => setLoadingHH(false));
  }, [viewMode, combinedTxns.length]);

  // Active transactions for this view
  const activeTxns: TxLike[] = viewMode === "household" ? combinedTxns : personalTxns;

  const trend     = buildMonthlyTrend(activeTxns);
  const isAllTime = selectedIdx === -1;
  const selected  = isAllTime ? null : trend[selectedIdx];
  const prev      = !isAllTime && selectedIdx > 0 ? trend[selectedIdx - 1] : null;

  const kpiIncome   = isAllTime
    ? activeTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    : selected!.income;
  const kpiExpenses = isAllTime
    ? Math.abs(activeTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))
    : selected!.expenses;
  const savings = kpiIncome - kpiExpenses;

  const catBreakdown = buildCategoryBreakdown(
    activeTxns,
    isAllTime ? undefined : selected!.year,
    isAllTime ? undefined : selected!.monthIndex,
  );
  const catTotal = catBreakdown.reduce((s, c) => s + c.value, 0);

  const combinedCatBreakdown = viewMode === "household" && household
    ? buildCombinedCategoryBreakdown(
        combinedTxns,
        isAllTime ? undefined : selected?.year,
        isAllTime ? undefined : selected?.monthIndex,
        household.ownerName,
      )
    : [];

  const incDelta = !isAllTime && prev && prev.income > 0
    ? ((selected!.income - prev.income) / prev.income) * 100 : 0;
  const expDelta = !isAllTime && prev && prev.expenses > 0
    ? ((selected!.expenses - prev.expenses) / prev.expenses) * 100 : 0;

  const periodLabel = isAllTime
    ? "Todos os períodos"
    : selected!.fullLabel.charAt(0).toUpperCase() + selected!.fullLabel.slice(1);
  const monthLabel = isAllTime ? "Total" : selected!.month;

  const ownerColor  = "#0ea5e9"; // sky-500
  const memberColor = "#8b5cf6"; // violet-500

  function getCategoryTxns(categoryName: string) {
    const source = viewMode === "household" ? combinedTxns : personalTxns;
    return (source as Array<typeof source[number]>)
      .filter((t) => {
        if (t.category.name !== categoryName || t.type !== "expense") return false;
        if (isAllTime) return true;
        const td = new Date(t.date);
        return td.getFullYear() === selected!.year && td.getMonth() === selected!.monthIndex;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise financeira detalhada"
        actions={
          <>
            {/* View mode toggle — always visible; disabled when no household */}
            <div
              className={cn(
                "flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 gap-0.5",
                !household && "opacity-50"
              )}
              title={!household ? "Configure uma casa compartilhada em Configurações → Membros" : undefined}
            >
              <button
                onClick={() => household && setViewMode("personal")}
                disabled={!household}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === "personal"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400",
                  household && "hover:text-slate-700 dark:hover:text-slate-300",
                  !household && "cursor-not-allowed"
                )}
              >
                <User size={12} /> Minha conta
              </button>
              <button
                onClick={() => household && setViewMode("household")}
                disabled={!household}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  viewMode === "household"
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 dark:text-slate-400",
                  household && "hover:text-slate-700 dark:hover:text-slate-300",
                  !household && "cursor-not-allowed"
                )}
              >
                <Users size={12} /> Visão do casal
              </button>
            </div>

            {/* Month selector */}
            <div className="relative">
              <select
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer"
              >
                <option value={-1}>Todos os períodos</option>
                {trend.map((t, i) => (
                  <option key={i} value={i}>
                    {t.fullLabel.charAt(0).toUpperCase() + t.fullLabel.slice(1)}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <Button size="sm"><Download size={14} /> Exportar PDF</Button>
          </>
        }
      />

      {/* Household mode banner */}
      {viewMode === "household" && household && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 text-sm text-sky-700 dark:text-sky-300">
          <Users size={14} className="text-sky-500 shrink-0" />
          <span>
            Visão combinada de{" "}
            <span className="font-semibold" style={{ color: ownerColor }}>{household.ownerName}</span>
            {" "}e{" "}
            <span className="font-semibold" style={{ color: memberColor }}>{household.memberName}</span>
            {" "}— todas as transações de ambas as contas.
          </span>
        </div>
      )}

      {loadingHH && (
        <p className="text-sm text-slate-400 text-center py-4">Carregando dados do casal…</p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Receitas ({monthLabel})
          </p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatBRL(kpiIncome)}
          </p>
          {!isAllTime && prev && prev.income > 0 && (
            <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
              incDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {incDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(incDelta).toFixed(1)}% vs mês anterior
            </p>
          )}
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Despesas ({monthLabel})
          </p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1 tabular-nums">
            {formatBRL(kpiExpenses)}
          </p>
          {!isAllTime && prev && prev.expenses > 0 && (
            <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
              expDelta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {expDelta <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {Math.abs(expDelta).toFixed(1)}% vs mês anterior
            </p>
          )}
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Economia ({monthLabel})
          </p>
          <p className={cn("text-xl font-bold mt-1 tabular-nums",
            savings >= 0 ? "text-slate-900 dark:text-white" : "text-red-500 dark:text-red-400")}>
            {formatBRL(savings)}
          </p>
          {kpiIncome > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {Math.round((savings / kpiIncome) * 100)}% da receita {viewMode === "household" ? "combinada" : isAllTime ? "total" : "mensal"}
            </p>
          )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
        {/* 6-month bar chart */}
        <Card>
          <CardLabel className="mb-4">
            Receitas vs Despesas — 6 meses
            {viewMode === "household" && (
              <span className="ml-2 text-[10px] font-normal text-sky-500">(casal)</span>
            )}
          </CardLabel>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={kFormatter} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={brlFormatter} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income"   name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardLabel className="mb-4">
            Distribuição de Gastos — {monthLabel}
            {viewMode === "household" && (
              <span className="ml-2 text-[10px] font-normal text-sky-500">(casal)</span>
            )}
          </CardLabel>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">Sem despesas neste período.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={50}
                    dataKey="value" stroke="none">
                    {catBreakdown.map((_, i) => <Cell key={i} fill={catBreakdown[i].color} />)}
                  </Pie>
                  <Tooltip formatter={brlFormatter} contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Category table — personal */}
      {viewMode === "personal" && (
        <Card>
          <CardLabel className="mb-5">
            Detalhamento por Categoria — {periodLabel}
          </CardLabel>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste período.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_auto_auto_auto] pb-2.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>Categoria</span>
                <span className="text-right pr-4 hidden @2xl:block">% do total</span>
                <span className="text-right pr-4">Total</span>
                <span />
              </div>
              {catBreakdown.map((c) => {
                const isOpen = expandedCategory === c.name;
                const txns   = isOpen ? getCategoryTxns(c.name) : [];
                return (
                  <div key={c.name} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isOpen ? null : c.name)}
                      className="w-full grid grid-cols-[1fr_auto_auto_auto] py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors px-1 -mx-1"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium text-left">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                        {c.name}
                      </span>
                      <span className="text-right pr-4 text-sm text-slate-500 dark:text-slate-400 tabular-nums hidden @2xl:block">
                        {catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(1) : "0.0"}%
                      </span>
                      <span className="text-right pr-4 text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                        {formatBRL(c.value)}
                      </span>
                      <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen && (
                      <div className="pb-3 pl-4 space-y-1">
                        {txns.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">Sem transações.</p>
                        ) : txns.map((tx) => {
                          const t = tx as Transaction;
                          return (
                            <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-base leading-none shrink-0">{t.category.icon}</span>
                                <div className="min-w-0">
                                  <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{t.description}</p>
                                  <p className="text-[11px] text-slate-400">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200 shrink-0 ml-4">
                                {formatBRL(Math.abs(t.amount))}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Category table — combined (household view) */}
      {viewMode === "household" && household && (
        <Card>
          <CardLabel className="mb-5 flex items-center gap-2">
            Detalhamento por Categoria — {periodLabel}
            <span className="text-[10px] font-normal text-sky-500">(casal)</span>
          </CardLabel>
          {combinedCatBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste período.</p>
          ) : (
            <div>
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 pb-2.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>Categoria</span>
                <span className="text-right" style={{ color: ownerColor }}>{household.ownerName}</span>
                <span className="text-right" style={{ color: memberColor }}>{household.memberName}</span>
                <span className="text-right">Total</span>
              </div>

              {combinedCatBreakdown.map((c) => {
                const total     = c.ownerAmount + c.memberAmount;
                const ownerPct  = total > 0 ? (c.ownerAmount  / total) * 100 : 0;
                const memberPct = total > 0 ? (c.memberAmount / total) * 100 : 0;
                const isOpen    = expandedCategory === c.name;
                const txns      = isOpen ? getCategoryTxns(c.name) as CombinedTransaction[] : [];
                return (
                  <div key={c.name} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <button
                      type="button"
                      onClick={() => setExpandedCategory(isOpen ? null : c.name)}
                      className="w-full py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg transition-colors px-1 -mx-1 space-y-2"
                    >
                      {/* Row */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center">
                        <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium min-w-0 text-left">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                          {formatBRL(c.ownerAmount)}
                        </span>
                        <span className="text-right text-sm tabular-nums text-slate-600 dark:text-slate-400">
                          {formatBRL(c.memberAmount)}
                        </span>
                        <span className="text-right text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200">
                          {formatBRL(total)}
                        </span>
                        <ChevronDown size={14} className={cn("text-slate-400 transition-transform", isOpen && "rotate-180")} />
                      </div>
                      {/* Split bar */}
                      {total > 0 && (
                        <div className="flex h-1.5 rounded-full overflow-hidden gap-px ml-5">
                          {c.ownerAmount > 0 && (
                            <div style={{ width: `${ownerPct}%`, background: ownerColor }} className="rounded-l-full"
                              title={`${household.ownerName}: ${ownerPct.toFixed(0)}%`} />
                          )}
                          {c.memberAmount > 0 && (
                            <div style={{ width: `${memberPct}%`, background: memberColor }} className="rounded-r-full"
                              title={`${household.memberName}: ${memberPct.toFixed(0)}%`} />
                          )}
                        </div>
                      )}
                    </button>
                    {isOpen && (
                      <div className="pb-3 pl-4 space-y-1">
                        {txns.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">Sem transações.</p>
                        ) : txns.map((tx) => (
                          <div key={`${tx.paidByUserId}-${tx.id}`}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: tx.paidByUserId === household.ownerUserId ? ownerColor : memberColor }} />
                              <div className="min-w-0">
                                <p className="text-sm text-slate-700 dark:text-slate-300 truncate">{tx.description}</p>
                                <p className="text-[11px] text-slate-400">
                                  <span style={{ color: tx.paidByUserId === household.ownerUserId ? ownerColor : memberColor }}>
                                    {tx.paidByName}
                                  </span>
                                  {" · "}{new Date(tx.date).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-200 shrink-0 ml-4">
                              {formatBRL(Math.abs(tx.amount))}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Combined transaction list (household view only) */}
      {viewMode === "household" && household && (
        <Card>
          <CardLabel className="mb-4">
            Todas as transações — {periodLabel}
            <span className="ml-2 text-[10px] font-normal text-sky-500">(casal)</span>
          </CardLabel>
          {(() => {
            const monthTxns = isAllTime
              ? [...combinedTxns].sort((a, b) => b.date.localeCompare(a.date))
              : combinedTxns.filter((t) => {
                  const td = new Date(t.date);
                  return td.getFullYear() === selected!.year && td.getMonth() === selected!.monthIndex;
                });
            if (monthTxns.length === 0) {
              return <p className="text-sm text-slate-400 text-center py-6">Sem transações neste período.</p>;
            }
            return (
              <div className="space-y-1">
                {monthTxns.map((tx) => (
                  <div key={`${tx.paidByUserId}-${tx.id}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: tx.paidByUserId === household.ownerUserId ? ownerColor : memberColor }}
                      title={tx.paidByName}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {tx.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {tx.category.name} · <span style={{ color: tx.paidByUserId === household.ownerUserId ? ownerColor : memberColor }}>
                          {tx.paidByName}
                        </span> · {new Date(tx.date).toLocaleDateString("pt-BR")}
                        {tx.isShared && (
                          <span className="ml-1.5 text-[10px] bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded-full">
                            compartilhada
                          </span>
                        )}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                      tx.type === "expense" ? "text-red-500" : "text-emerald-500"
                    }`}>
                      {tx.type === "expense" ? "-" : "+"}{formatBRL(Math.abs(tx.amount))}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>
      )}
    </div>
  );
}
