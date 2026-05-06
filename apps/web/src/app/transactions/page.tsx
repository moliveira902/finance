"use client";
import { useState } from "react";
import { Search, Plus, Upload, Sparkles, Trash2, RepeatIcon, Send } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { CsvImportModal } from "@/components/modals/CsvImportModal";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL, formatDate } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/contexts/LanguageContext";

type TypeFilter = "all" | "income" | "expense" | "recurring";

export default function TransactionsPage() {
  const { transactions, categories, deleteTransaction } = useFinanceStore();
  const { t, locale } = useTranslation();

  const [search,     setSearch]     = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [catFilter,  setCatFilter]  = useState("all");
  const [showNew,    setShowNew]    = useState(false);
  const [showCsv,    setShowCsv]    = useState(false);

  const now = new Date();
  const monthLabel = now.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const filtered = transactions.filter((tx) => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "all" || (typeFilter === "recurring" ? tx.isRecurring : tx.type === typeFilter);
    const matchCat    = catFilter  === "all" || tx.category.id === catFilter;
    return matchSearch && matchType && matchCat;
  });

  const totalIncome  = filtered.filter((tx) => tx.type === "income" ).reduce((s, tx) => s + tx.amount, 0);
  const totalExpense = filtered.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0);

  const TYPE_LABELS: Record<TypeFilter, string> = {
    all:       t("transactions.filterAll"),
    income:    t("transactions.filterIncome"),
    expense:   t("transactions.filterExpense"),
    recurring: t("transactions.filterRecurring"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("transactions.title")}
        subtitle={t("transactions.subtitle", { n: String(transactions.length), month: monthLabel })}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCsv(true)}>
              <Upload size={14} /> {t("transactions.importCsv")}
            </Button>
            <Button size="sm" onClick={() => setShowNew(true)}>
              <Plus size={14} /> {t("transactions.addBtn")}
            </Button>
          </>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-4">
        {[
          { label: t("transactions.filteredIncome"),  value: formatBRL(totalIncome),             color: "text-emerald-600 dark:text-emerald-400" },
          { label: t("transactions.filteredExpense"), value: formatBRL(Math.abs(totalExpense)),  color: "text-red-500 dark:text-red-400"          },
          { label: t("transactions.periodBalance"),   value: formatBRL(totalIncome + totalExpense),
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
            placeholder={t("transactions.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
          {(["all", "income", "expense", "recurring"] as TypeFilter[]).map((f) => (
            <button key={f} onClick={() => setTypeFilter(f)}
              className={cn(
                "h-7 px-3 rounded-lg text-xs font-medium transition-all",
                typeFilter === f
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}>
              {TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="relative">
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}
            className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 appearance-none cursor-pointer">
            <option value="all">{t("transactions.allCategories")}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">{t("transactions.colDescription")}</th>
                <th className="hidden @3xl:table-cell text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("transactions.colCategory")}</th>
                <th className="hidden @3xl:table-cell text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("transactions.colAccount")}</th>
                <th className="text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("transactions.colDate")}</th>
                <th className="hidden @3xl:table-cell text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-4 py-3">{t("transactions.colAI")}</th>
                <th className="text-right text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-5 py-3">{t("transactions.colAmount")}</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((tx, idx) => (
                <tr key={tx.id}
                  className={cn(
                    "group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30",
                    idx !== filtered.length - 1 && "border-b border-slate-50 dark:border-slate-700/50"
                  )}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-lg leading-none">{tx.category.icon}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{tx.description}</span>
                    </div>
                  </td>
                  <td className="hidden @3xl:table-cell px-4 py-3">
                    <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: tx.category.color + "20", color: tx.category.color }}>
                      {tx.category.name}
                    </span>
                  </td>
                  <td className="hidden @3xl:table-cell px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{tx.account.institution}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(tx.date)}</span>
                  </td>
                  <td className="hidden @3xl:table-cell px-4 py-3">
                    <div className="flex items-center gap-1">
                      {tx.isRecurring && (
                        <Badge variant="info" className="text-[10px] gap-0.5 py-0 px-1.5">
                          <RepeatIcon size={9} /> {tx.recurringPeriod === "yearly" ? t("transactions.recYearly") : t("transactions.recMonthly")}
                        </Badge>
                      )}
                      {tx.source === "telegram" && (
                        <Badge variant="info" className="text-[10px] gap-0.5 py-0 px-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-0">
                          <Send size={9} /> Telegram
                        </Badge>
                      )}
                      {tx.aiCategory && (
                        <Badge variant="info" className="text-[10px] gap-0.5 py-0 px-1.5">
                          <Sparkles size={9} /> {Math.round((tx.aiConfidence ?? 0) * 100)}%
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className={cn("text-sm font-semibold tabular-nums",
                      tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200")}>
                      {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                    </span>
                  </td>
                  <td className="pr-3">
                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                      <Search size={24} className="opacity-40" />
                      <p className="text-sm">{t("transactions.empty")}</p>
                      <p className="text-xs">{t("transactions.emptyHint")}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-50 dark:border-slate-700/50 text-xs text-slate-400 dark:text-slate-500">
            {t("transactions.results", { n: String(filtered.length), s: filtered.length !== 1 ? "s" : "" })}
          </div>
        )}
      </Card>

      <TransactionModal open={showNew} onClose={() => setShowNew(false)} />
      <CsvImportModal   open={showCsv} onClose={() => setShowCsv(false)} />
    </div>
  );
}
