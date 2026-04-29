"use client";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL, type Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TOOLTIP = {
  borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};

function buildMonthlyTrend(txs: Transaction[]) {
  return Array.from({ length: 6 }, (_, i) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear(), m = d.getMonth();
    const month = d.toLocaleString("pt-BR", { month: "short" });
    const label = month.charAt(0).toUpperCase() + month.slice(1);
    const full = d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
    const periodTxs = txs.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m;
    });
    const income   = periodTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenses = periodTxs.filter((t) => t.type === "expense").reduce((s, t) => s + Math.abs(t.amount), 0);
    return { month: label, fullLabel: full, year: y, monthIndex: m, income, expenses };
  });
}

function buildCategoryBreakdown(txs: Transaction[], year: number, monthIndex: number) {
  const periodTxs = txs.filter((t) => {
    const td = new Date(t.date);
    return td.getFullYear() === year && td.getMonth() === monthIndex && t.type === "expense";
  });
  const map = new Map<string, { name: string; value: number; color: string }>();
  periodTxs.forEach((t) => {
    const key = t.category.id;
    const prev = map.get(key) ?? { name: t.category.name, value: 0, color: t.category.color };
    map.set(key, { ...prev, value: prev.value + Math.abs(t.amount) });
  });
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

export default function ReportsPage() {
  const { transactions } = useFinanceStore();
  const [selectedIdx, setSelectedIdx] = useState(5); // 5 = current month (last in array)

  const trend = buildMonthlyTrend(transactions);
  const selected = trend[selectedIdx];
  const prev = trend[selectedIdx - 1];

  const catBreakdown = buildCategoryBreakdown(transactions, selected.year, selected.monthIndex);
  const catTotal = catBreakdown.reduce((s, c) => s + c.value, 0);

  const incDelta = prev && prev.income > 0 ? ((selected.income - prev.income) / prev.income) * 100 : 0;
  const expDelta = prev && prev.expenses > 0 ? ((selected.expenses - prev.expenses) / prev.expenses) * 100 : 0;
  const savings = selected.income - selected.expenses;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise financeira detalhada"
        actions={
          <>
            <div className="relative">
              <select
                value={selectedIdx}
                onChange={(e) => setSelectedIdx(Number(e.target.value))}
                className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer"
              >
                {trend.map((t, i) => (
                  <option key={i} value={i}>{t.fullLabel.charAt(0).toUpperCase() + t.fullLabel.slice(1)}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <Button size="sm"><Download size={14} /> Exportar PDF</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Receitas ({selected.month})</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{formatBRL(selected.income)}</p>
          {prev && prev.income > 0 && (
            <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
              incDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {incDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(incDelta).toFixed(1)}% vs mês anterior
            </p>
          )}
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Despesas ({selected.month})</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1 tabular-nums">{formatBRL(selected.expenses)}</p>
          {prev && prev.expenses > 0 && (
            <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
              expDelta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
              {expDelta <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
              {Math.abs(expDelta).toFixed(1)}% vs mês anterior
            </p>
          )}
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Economia ({selected.month})</p>
          <p className={cn("text-xl font-bold mt-1 tabular-nums",
            savings >= 0 ? "text-slate-900 dark:text-white" : "text-red-500 dark:text-red-400")}>
            {formatBRL(savings)}
          </p>
          {selected.income > 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
              {Math.round((savings / selected.income) * 100)}% da receita mensal
            </p>
          )}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
        <Card>
          <CardLabel className="mb-4">Receitas vs Despesas — 6 meses</CardLabel>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v) => [formatBRL(Number(v || 0))]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income"   name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel className="mb-4">Distribuição de Gastos — {selected.month}</CardLabel>
          {catBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-16">Sem despesas neste período.</p>
          ) : (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={50} dataKey="value" stroke="none">
                    {catBreakdown.map((_, i) => <Cell key={i} fill={catBreakdown[i].color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatBRL(Number(v || 0))]} contentStyle={TOOLTIP} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Category table */}
      <Card>
        <CardLabel className="mb-5">
          Detalhamento por Categoria — {selected.fullLabel.charAt(0).toUpperCase() + selected.fullLabel.slice(1)}
        </CardLabel>
        {catBreakdown.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-8">Sem despesas neste período.</p>
        ) : (
          <div>
            <div className="grid grid-cols-2 @2xl:grid-cols-3 pb-2.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Categoria</span>
              <span className="text-right">Total</span>
              <span className="hidden @2xl:block text-right">% do total</span>
            </div>
            {catBreakdown.map((c) => (
              <div key={c.name} className="grid grid-cols-2 @2xl:grid-cols-3 py-3 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="text-right text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatBRL(c.value)}</span>
                <span className="hidden @2xl:block text-right text-sm text-slate-500 dark:text-slate-400 tabular-nums">
                  {catTotal > 0 ? ((c.value / catTotal) * 100).toFixed(1) : "0.0"}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
