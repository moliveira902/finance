"use client";
import { useState } from "react";
import { RepeatIcon, Plus, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

function monthlyEquivalent(tx: Transaction): number {
  return tx.recurringPeriod === "yearly"
    ? Math.abs(tx.amount) / 12
    : Math.abs(tx.amount);
}

export default function RecorrentesPage() {
  const { transactions, deleteTransaction } = useFinanceStore();
  const { t } = useTranslation();
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const recurring = transactions.filter((tx) => tx.isRecurring);

  const seen = new Set<string>();
  const templates = recurring.filter((tx) => {
    const key = tx.description.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const monthlyExpenses = templates
    .filter((tx) => tx.type === "expense")
    .reduce((s, tx) => s + monthlyEquivalent(tx), 0);

  const monthlyIncome = templates
    .filter((tx) => tx.type === "income")
    .reduce((s, tx) => s + monthlyEquivalent(tx), 0);

  const monthlyNet = monthlyIncome - monthlyExpenses;
  const annualNet  = monthlyNet * 12;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("recurring.title")}
        subtitle={t("recurring.subtitle")}
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> {t("recurring.addBtn")}
          </Button>
        }
      />

      {/* KPI summary — 2 cols, compact text to fit narrow cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{t("recurring.expensesPerMonth")}</p>
          <p className="text-base font-bold tabular-nums text-red-500 dark:text-red-400 mt-0.5 truncate">{formatBRL(monthlyExpenses)}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t("recurring.expensesSubtitle")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{t("recurring.incomePerMonth")}</p>
          <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">{formatBRL(monthlyIncome)}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t("recurring.incomeSubtitle")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{t("recurring.netPerMonth")}</p>
          <p className={cn("text-base font-bold tabular-nums mt-0.5 truncate", monthlyNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
            {monthlyNet >= 0 ? "+" : "−"}{formatBRL(Math.abs(monthlyNet))}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t("recurring.netSubtitle")}</p>
        </div>
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm p-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate">{t("recurring.annualImpact")}</p>
          <p className={cn("text-base font-bold tabular-nums mt-0.5 truncate", annualNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
            {annualNet >= 0 ? "+" : "−"}{formatBRL(Math.abs(annualNet))}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{t("recurring.annualSubtitle")}</p>
        </div>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <Card className="py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <RepeatIcon size={32} className="opacity-30" />
          <p className="text-sm">{t("recurring.empty")}</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> {t("recurring.createFirst")}
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-3">
          {templates.map((tx) => {
            const monthly = monthlyEquivalent(tx);
            const annual  = monthly * 12;
            const count   = tx.recurringCount && tx.recurringCount > 0 ? tx.recurringCount : null;
            const periodLabel = tx.recurringPeriod === "yearly"
              ? (count === 1 ? t("recurring.year") : t("recurring.years"))
              : (count === 1 ? t("recurring.month") : t("recurring.months"));

            return (
              <Card key={tx.id} className="overflow-hidden">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-lg shrink-0">
                      {tx.category.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                          style={{ background: tx.category.color + "20", color: tx.category.color }}
                        >
                          {tx.category.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {tx.recurringPeriod === "yearly" ? t("recurring.yearly") : t("recurring.monthly")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons — always visible (needed on touch devices) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Stats grid — 3 columns: per-period · monthly/annual equiv · installments */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                  {/* Col 1 — per period */}
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 truncate">
                      {t("recurring.perPeriod")}
                    </p>
                    <span className={cn(
                      "text-sm font-bold tabular-nums truncate block",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                    </span>
                  </div>

                  {/* Col 2 — monthly or annual equivalent */}
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 truncate">
                      {tx.recurringPeriod === "yearly" ? t("recurring.equivMonth") : t("recurring.annualImpactCard")}
                    </p>
                    <span className={cn(
                      "text-sm font-semibold tabular-nums flex items-center gap-0.5 truncate",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    )}>
                      {tx.type === "income" ? <TrendingUp size={10} className="shrink-0" /> : <TrendingDown size={10} className="shrink-0" />}
                      {tx.recurringPeriod === "yearly" ? formatBRL(monthly) : formatBRL(annual)}
                    </span>
                  </div>

                  {/* Col 3 — installment count (always shown) */}
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5 truncate">
                      {t("recurring.installments")}
                    </p>
                    {count ? (
                      <span className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400 truncate block">
                        {count}×
                        <span className="text-[10px] font-medium ml-0.5">{periodLabel}</span>
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 truncate block">
                        {t("recurring.indefinite")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Total commitment — only when count is set */}
                {count && (
                  <div className="flex items-center justify-between mt-2.5 px-2.5 py-1.5 rounded-lg bg-sky-50/60 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-900/40">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {t("recurring.totalLabel", { n: String(count), period: periodLabel })}
                    </span>
                    <span className="text-sm font-bold tabular-nums text-sky-700 dark:text-sky-300 ml-2 shrink-0">
                      {formatBRL(Math.abs(tx.amount) * count)}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <TransactionModal open={showNew} onClose={() => setShowNew(false)} defaultRecurring />
      <TransactionModal open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </div>
  );
}
