"use client";
import { useState } from "react";
import { RepeatIcon, Plus, Pencil, Trash2, TrendingDown, TrendingUp, CalendarDays } from "lucide-react";
import { Card, CardLabel, CardValue } from "@/components/ui/Card";
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

  const recurring = transactions.filter((t) => t.isRecurring);

  // Deduplicate by description — keep the most recent template per description
  const seen = new Set<string>();
  const templates = recurring.filter((t) => {
    const key = t.description.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Totals
  const monthlyExpenses = templates
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + monthlyEquivalent(t), 0);

  const monthlyIncome = templates
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + monthlyEquivalent(t), 0);

  const monthlyNet = monthlyIncome - monthlyExpenses;
  const annualNet  = monthlyNet * 12;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("recurring.title")}
        subtitle={t("recurring.subtitle")}
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> {t("recurring.addBtn")}
          </Button>
        }
      />

      {/* Summary totals */}
      <div className="grid grid-cols-2 @3xl:grid-cols-4 gap-4">
        <Card>
          <CardLabel>{t("recurring.expensesPerMonth")}</CardLabel>
          <CardValue className="text-red-500 dark:text-red-400">{formatBRL(monthlyExpenses)}</CardValue>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{t("recurring.expensesSubtitle")}</p>
        </Card>
        <Card>
          <CardLabel>{t("recurring.incomePerMonth")}</CardLabel>
          <CardValue className="text-emerald-600 dark:text-emerald-400">{formatBRL(monthlyIncome)}</CardValue>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{t("recurring.incomeSubtitle")}</p>
        </Card>
        <Card>
          <CardLabel>{t("recurring.netPerMonth")}</CardLabel>
          <CardValue className={monthlyNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
            {monthlyNet >= 0 ? "+" : "−"}{formatBRL(Math.abs(monthlyNet))}
          </CardValue>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{t("recurring.netSubtitle")}</p>
        </Card>
        <Card>
          <CardLabel>{t("recurring.annualImpact")}</CardLabel>
          <CardValue className={annualNet >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}>
            {annualNet >= 0 ? "+" : "−"}{formatBRL(Math.abs(annualNet))}
          </CardValue>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{t("recurring.annualSubtitle")}</p>
        </Card>
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
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
          {templates.map((tx) => {
            const monthly = monthlyEquivalent(tx);
            const annual  = monthly * 12;
            return (
              <Card key={tx.id} className="group">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl shrink-0">
                      {tx.category.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white text-sm">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                          <CalendarDays size={10} />
                          {tx.recurringPeriod === "yearly" ? t("recurring.yearly") : t("recurring.monthly")}
                        </span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: tx.category.color + "20", color: tx.category.color }}>
                          {tx.category.name}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">{tx.account.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => setEditing(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* Amount breakdown */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{t("recurring.perPeriod")}</p>
                    <span className={cn(
                      "text-base font-bold tabular-nums",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                    )}>
                      {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                      {tx.recurringPeriod === "yearly" ? t("recurring.equivMonth") : t("recurring.annualImpactCard")}
                    </p>
                    <span className={cn(
                      "text-sm font-semibold tabular-nums flex items-center gap-1",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                    )}>
                      {tx.type === "income" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {tx.recurringPeriod === "yearly" ? formatBRL(monthly) : formatBRL(annual)}
                    </span>
                  </div>
                  {tx.recurringCount && tx.recurringCount > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-0.5">
                        {t("recurring.totalLabel", { n: String(tx.recurringCount), period: tx.recurringPeriod === "yearly" ? t("recurring.years") : t("recurring.months") })}
                      </p>
                      <span className="text-sm font-bold tabular-nums text-sky-600 dark:text-sky-400">
                        {formatBRL(Math.abs(tx.amount) * tx.recurringCount)}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <TransactionModal open={showNew} onClose={() => setShowNew(false)} />
      <TransactionModal open={!!editing} onClose={() => setEditing(null)} initial={editing ?? undefined} />
    </div>
  );
}
