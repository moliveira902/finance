"use client";
import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Home, ChevronLeft, ChevronRight, ArrowUpCircle, AlertCircle, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import type { HouseholdDashboard, SharedTransaction } from "@/lib/household";

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

function initials(name: string) {
  const p = name.trim().split(/\s+/);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const SKY   = "#0ea5e9";
const VIOLET = "#8b5cf6";

export default function HouseholdPage() {
  const [month,     setMonth]     = useState(currentMonthKey);
  const [dashboard, setDashboard] = useState<HouseholdDashboard | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [closing,   setClosing]   = useState(false);
  const [closed,    setClosed]    = useState(false);

  const load = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/household/dashboard?month=${m}`);
      if (res.status === 404) { setError("no-household"); return; }
      if (!res.ok) throw new Error("Failed to load dashboard.");
      const data = await res.json() as { dashboard: HouseholdDashboard };
      setDashboard(data.dashboard);
    } catch {
      setError("Erro ao carregar dados da casa.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(month); }, [load, month]);

  async function handleCloseMonth() {
    if (!dashboard) return;
    setClosing(true);
    try {
      const res = await fetch("/api/household/settlement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      });
      if (!res.ok && res.status !== 409) throw new Error();
      setClosed(true);
    } catch {
      alert("Erro ao fechar o mês.");
    } finally {
      setClosing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Casa" subtitle="Finanças compartilhadas do casal" />
        <div className="text-center py-20 text-slate-400">Carregando...</div>
      </div>
    );
  }

  if (error === "no-household") {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Casa" subtitle="Finanças compartilhadas do casal" />
        <Card>
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
              <Home size={26} className="text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Você não tem uma casa compartilhada</p>
              <p className="text-sm text-slate-400 mt-1">
                Peça ao seu parceiro(a) para enviar um convite via Configurações → Membros.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader title="Casa" subtitle="Finanças compartilhadas do casal" />
        <Card>
          <div className="text-center py-12 text-slate-400">{error ?? "Erro desconhecido."}</div>
        </Card>
      </div>
    );
  }

  const { household, ownerSharedTotal, memberSharedTotal, combinedTotal,
          categoryBreakdown, transactions, settlement } = dashboard;

  const chartData = categoryBreakdown.map((c) => ({
    name: c.category.length > 10 ? c.category.slice(0, 10) + "…" : c.category,
    [household.ownerName]:  Number(c.ownerAmount.toFixed(2)),
    [household.memberName]: Number(c.memberAmount.toFixed(2)),
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col @sm:flex-row @sm:items-center @sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Home size={16} className="text-sky-500" />
            <h1 className="text-xl @sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {household.name}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-900">
                {initials(household.ownerName)}
              </div>
              <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-900">
                {initials(household.memberName)}
              </div>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {household.ownerName} & {household.memberName}
            </span>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5">
          <button onClick={() => setMonth(prevMonth(month))}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize px-1 min-w-[140px] text-center">
            {monthLabel(month)}
          </span>
          <button
            onClick={() => setMonth(nextMonth(month))}
            disabled={nextMonth(month) > currentMonthKey()}
            className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-4">
        {[
          { label: "Total do casal", value: combinedTotal, color: "text-slate-900 dark:text-white" },
          { label: `${household.ownerName} compartilhou`, value: ownerSharedTotal, color: "text-sky-600 dark:text-sky-400" },
          { label: `${household.memberName} compartilhou`, value: memberSharedTotal, color: "text-violet-600 dark:text-violet-400" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{label}</p>
            <p className={`text-sm @sm:text-base @md:text-xl font-bold tabular-nums whitespace-nowrap ${color}`}>{formatBRL(value)}</p>
          </Card>
        ))}
      </div>

      {/* Category breakdown chart */}
      {chartData.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
            Gastos por categoria
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
            <BarChart layout="vertical" data={chartData} margin={{ left: 8, right: 16 }}>
              <XAxis type="number" tickFormatter={(v: number) => `R$${v.toFixed(0)}`}
                tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => typeof v === "number" ? formatBRL(v) : String(v)} />
              <Legend />
              <Bar dataKey={household.ownerName}  fill={SKY}    radius={[0, 4, 4, 0]} />
              <Bar dataKey={household.memberName} fill={VIOLET} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Shared transaction list */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Transações compartilhadas ({transactions.length})
        </h2>
        {transactions.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Nenhuma transação compartilhada este mês.
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx: SharedTransaction) => (
              <div key={tx.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: tx.paidByUserId === household.ownerUserId ? SKY : VIOLET }}
                  title={tx.paidByName}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {tx.description}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {tx.category} · {tx.paidByName} · {new Date(tx.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className={`text-sm font-semibold tabular-nums shrink-0 ${
                  tx.type === "expense" ? "text-red-500" : "text-emerald-500"
                }`}>
                  {tx.type === "expense" ? "-" : "+"}{formatBRL(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Settle-up banner */}
      <Card className="border-2 border-dashed border-slate-200 dark:border-slate-700">
        <div className="flex flex-col @sm:flex-row @sm:items-center @sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {settlement.isEven ? (
              <Check size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-amber-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {settlement.isEven
                  ? "Tudo quitado este mês!"
                  : `${settlement.debtorName} deve ${formatBRL(settlement.amount)} a ${settlement.creditorName}`}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Divisão: {Math.round(household.splitRatio * 100)}% / {Math.round((1 - household.splitRatio) * 100)}%
                {" · "}{household.ownerName}: {formatBRL(ownerSharedTotal)} · {household.memberName}: {formatBRL(memberSharedTotal)}
              </p>
            </div>
          </div>

          {!closed ? (
            <button
              onClick={handleCloseMonth}
              disabled={closing || settlement.isEven}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-medium transition-colors shrink-0"
            >
              <ArrowUpCircle size={14} />
              {closing ? "Fechando…" : "Fechar mês"}
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
              <Check size={13} /> Mês fechado
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
