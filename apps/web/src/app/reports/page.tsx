"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { monthlyTrend, categoryBreakdown, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const TOOLTIP = {
  borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.06)",
};
const MOCK_DELTA = [+5, -12, +2, -8, +15, +3, -4];

export default function ReportsPage() {
  const last     = monthlyTrend[monthlyTrend.length - 1];
  const prev     = monthlyTrend[monthlyTrend.length - 2];
  const incDelta = ((last.income   - prev.income)   / prev.income)   * 100;
  const expDelta = ((last.expenses - prev.expenses) / prev.expenses) * 100;
  const catTotal = categoryBreakdown.reduce((s, c) => s + c.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Análise financeira detalhada"
        actions={
          <>
            <div className="relative">
              <select className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer">
                <option>Abril 2026</option>
                <option>Março 2026</option>
                <option>Fevereiro 2026</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            <Button size="sm"><Download size={14} /> Exportar PDF</Button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Receitas (Abr)</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{formatBRL(last.income)}</p>
          <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
            incDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
            {incDelta >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(incDelta).toFixed(1)}% vs mês anterior
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Despesas (Abr)</p>
          <p className="text-xl font-bold text-red-500 dark:text-red-400 mt-1 tabular-nums">{formatBRL(last.expenses)}</p>
          <p className={cn("flex items-center gap-1 text-xs mt-2 font-medium",
            expDelta <= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
            {expDelta <= 0 ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
            {Math.abs(expDelta).toFixed(1)}% vs mês anterior
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Economia (Abr)</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{formatBRL(last.income - last.expenses)}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            {Math.round(((last.income - last.expenses) / last.income) * 100)}% da receita mensal
          </p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardLabel className="mb-4">Receitas vs Despesas — 6 meses</CardLabel>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barCategoryGap="35%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [formatBRL(v)]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="income"   name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel className="mb-4">Distribuição de Gastos</CardLabel>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryBreakdown} cx="50%" cy="45%" outerRadius={90} innerRadius={50} dataKey="value" stroke="none">
                  {categoryBreakdown.map((_, i) => <Cell key={i} fill={categoryBreakdown[i].color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [formatBRL(v)]} contentStyle={TOOLTIP} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Category table */}
      <Card>
        <CardLabel className="mb-5">Detalhamento por Categoria — Abril 2026</CardLabel>
        <div>
          <div className="grid grid-cols-4 pb-2.5 border-b border-slate-100 dark:border-slate-700 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <span>Categoria</span>
            <span className="text-right">Total</span>
            <span className="text-right">% do total</span>
            <span className="text-right">Vs. mês ant.</span>
          </div>
          {categoryBreakdown.map((c, i) => {
            const delta = MOCK_DELTA[i] ?? 0;
            return (
              <div key={c.name} className="grid grid-cols-4 py-3 items-center border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="text-right text-sm font-semibold text-slate-800 dark:text-slate-200 tabular-nums">{formatBRL(c.value)}</span>
                <span className="text-right text-sm text-slate-500 dark:text-slate-400 tabular-nums">{((c.value / catTotal) * 100).toFixed(1)}%</span>
                <span className={cn("text-right text-sm font-semibold tabular-nums",
                  delta > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                  {delta > 0 ? "+" : ""}{delta}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
