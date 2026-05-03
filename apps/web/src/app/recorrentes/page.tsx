"use client";
import { useState } from "react";
import { RepeatIcon, Plus, Pencil, Trash2, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { TransactionModal } from "@/components/modals/TransactionModal";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL } from "@/lib/mock-data";
import type { Transaction } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

// Determine if a recurring transaction already has an occurrence in the current period
function isDue(tx: Transaction, allTransactions: Transaction[]): boolean {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  if (tx.recurringPeriod === "yearly") {
    return !allTransactions.some((t) => {
      if (t.id === tx.id) return false;
      const d = new Date(t.date);
      return (
        d.getFullYear() === year &&
        t.description.toLowerCase() === tx.description.toLowerCase()
      );
    });
  }

  // monthly (default)
  return !allTransactions.some((t) => {
    if (t.id === tx.id) return false;
    const d = new Date(t.date);
    return (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      t.description.toLowerCase() === tx.description.toLowerCase()
    );
  });
}

export default function RecorrentesPage() {
  const { transactions, addTransaction, deleteTransaction } = useFinanceStore();
  const [showNew, setShowNew]   = useState(false);
  const [editing, setEditing]   = useState<Transaction | null>(null);

  const recurring = transactions.filter((t) => t.isRecurring);

  // Deduplicate by description — show only the latest template per description
  const seen = new Set<string>();
  const templates = recurring.filter((t) => {
    const key = t.description.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const dueCount = templates.filter((t) => isDue(t, transactions)).length;

  function handleRegisterOccurrence(tx: Transaction) {
    const today = new Date().toISOString().slice(0, 10);
    addTransaction({
      description:     tx.description,
      amount:          tx.amount,
      type:            tx.type,
      category:        tx.category,
      account:         tx.account,
      date:            today,
      isRecurring:     true,
      recurringPeriod: tx.recurringPeriod,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recorrentes"
        subtitle="Transações que se repetem mensalmente ou anualmente"
        actions={
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Nova Recorrente
          </Button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 @sm:grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total recorrentes</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{templates.length}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Em aberto</p>
          <p className={cn("text-xl font-bold mt-1", dueCount > 0 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400")}>
            {dueCount}
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Em dia</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {templates.length - dueCount}
          </p>
        </Card>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <Card className="py-16 flex flex-col items-center gap-3 text-slate-400 dark:text-slate-500">
          <RepeatIcon size={32} className="opacity-30" />
          <p className="text-sm">Nenhuma transação recorrente cadastrada.</p>
          <Button size="sm" onClick={() => setShowNew(true)}>
            <Plus size={14} /> Criar primeira recorrente
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
          {templates.map((tx) => {
            const due = isDue(tx, transactions);
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
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {tx.recurringPeriod === "yearly" ? "Anual" : "Mensal"}
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    {due ? (
                      <Badge variant="warning" className="text-[10px]">
                        <Clock size={9} /> Em aberto
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">
                        <CheckCircle2 size={9} /> Em dia
                      </Badge>
                    )}
                    <button onClick={() => setEditing(tx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 opacity-0 group-hover:opacity-100 transition-all">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => deleteTransaction(tx.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                  <span className={cn(
                    "text-base font-bold tabular-nums",
                    tx.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-slate-200"
                  )}>
                    {tx.type === "income" ? "+" : "−"}{formatBRL(Math.abs(tx.amount))}
                  </span>

                  {due && (
                    <Button size="sm" onClick={() => handleRegisterOccurrence(tx)}>
                      <Plus size={12} /> Registrar ocorrência
                    </Button>
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
