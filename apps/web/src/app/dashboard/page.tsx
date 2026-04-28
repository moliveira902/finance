"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, CreditCard, Sparkles, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  accounts, transactions, monthlyTrend, categoryBreakdown,
  formatBRL, formatDate,
} from "@/lib/mock-data";
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

export default function DashboardPage() {
  const totalAssets = accounts.reduce((s, a) => s + Math.max(0, a.balance),  0);
  const totalDebt   = accounts.reduce((s, a) => s + Math.max(0, -a.balance), 0);
  const netWorth    = totalAssets - totalDebt;
  const income      = transactions.filter((t) => t.type === "income" ).reduce((s, t) => s + t.amount,  0);
  const expenses    = Math.abs(transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0));
  const recent      = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Visão geral das suas finanças — Abril 2026" />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Patrimônio Líquido" value={formatBRL(netWorth)}          sub="+4.2% este mês"               positive />
        <KpiCard label="Receitas (Abr)"     value={formatBRL(income)}            sub="Salário + freelance"                    />
        <KpiCard label="Despesas (Abr)"     value={formatBRL(expenses)}          sub="8% abaixo do mês anterior"    positive />
        <KpiCard label="Saldo Livre"        value={formatBRL(income - expenses)} sub="Disponível para investir"              />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
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
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP} formatter={(v: number) => [formatBRL(v)]} />
                <Area type="monotone" dataKey="income"   stroke="#10b981" strokeWidth={2} fill="url(#gI)" name="Receitas" />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} fill="url(#gE)" name="Despesas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardLabel className="mb-4">Gastos por Categoria</CardLabel>
          <div className="flex justify-center">
            <PieChart width={150} height={150}>
              <Pie data={categoryBreakdown} cx={70} cy={70} innerRadius={44} outerRadius={68} dataKey="value" stroke="none">
                {categoryBreakdown.map((_, i) => <Cell key={i} fill={categoryBreakdown[i].color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [formatBRL(v)]} contentStyle={TOOLTIP} />
            </PieChart>
          </div>
          <div className="mt-2 space-y-2">
            {categoryBreakdown.slice(0, 4).map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">{formatBRL(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Accounts + Recent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card className="md:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <CardLabel>Transações Recentes</CardLabel>
            <Link href="/transactions"
              className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors">
              Ver todas <ArrowUpRight size={12} />
            </Link>
          </div>
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
        </Card>
      </div>
    </div>
  );
}
