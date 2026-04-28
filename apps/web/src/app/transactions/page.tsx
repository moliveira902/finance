"use client";
import { useState } from "react";
import { Search, Plus, Upload, Sparkles, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { transactions, categories, formatBRL, formatDate } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type TypeFilter = "all" | "income" | "expense";

export default function TransactionsPage() {
  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter,  setCatFilter]  = useState("all");

  const filtered = transactions.filter((tx) => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "all" || tx.type === typeFilter;
    const matchCat    = catFilter  === "all" || tx.category.id === catFilter;
    return matchSearch && matchType && matchCat;
  });

  const totalIncome  = filtered.filter((t) => t.type === "income" ).reduce((s, t) =>  s + t.amount, 0);
  const totalExpense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações"
        subtitle={`${transactions.length} transações em Abril 2026`}
        actions={
          <>
            <Button variant="secondary" size="sm"><Upload size={14} /> Importar CSV</Button>
            <Button size="sm"><Plus size={14} /> Nova Transação</Button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Receitas filtradas", value: formatBRL(totalIncome),             color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Despesas filtradas", value: formatBRL(Math.abs(totalExpense)),  color: "text-red-500 dark:text-red-400"          },
          { label: "Saldo do período",   value: formatBRL(totalIncome + totalExpense),
            color: totalIncome + totalExpense >= 0 ? "text-slate-900 dark:text-white" : "text-red-500 dark:text-red-400" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="py-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
            <p className={cn("text-xl font-bold mt-1 tabular-nums", color)}>{value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar transação…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
          {(["all", "income", "expense"] as TypeFilter[]).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={cn(
                "h-7 px-3 rounded-lg text-xs font-medium transition-all",
                typeFilter === t
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}>
              {t === "all" ? "Todas" : t === "income" ? "Receitas" : "Despesas"}
            </button>
          ))}
        </div>

        <div className="relative">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 appearance-none cursor-pointer">
            <option value="all">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Descrição</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">Categoria</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">Conta</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">Data</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">IA</th>
                <th className="text-right text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, idx) => (
                <tr key={tx.id}
                  className={cn(
                    "transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30",
                    idx !== filtered.length - 1 && "border-b border-slate-50 dark:border-slate-700/50"
                  )}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{tx.category.icon}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: tx.category.color + "20", color: tx.category.color }}>
                      {tx.category.name}
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="text-sm text-slate-500 dark:text-slate-400">{tx.account.institution}</span></td>
                  <td className="px-4 py-3"><span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(tx.date)}</span></td>
                  <td className="px-4 py-3">
                    {tx.aiCategory && (
                      <Badge variant="info" className="text-[10px] gap-0.5 py-0 px-1.5">
                        <Sparkles size={9} /> {Math.round((tx.aiConfidence ?? 0) * 100)}%
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn("text-sm font-semibold tabular-nums",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200")}>
                      {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                      <Search size={24} className="opacity-40" />
                      <p className="text-sm">Nenhuma transação encontrada.</p>
                      <p className="text-xs">Tente ajustar os filtros.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-700/50 text-xs text-slate-400 dark:text-slate-500">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
          </div>
        )}
      </Card>
    </div>
  );
}
