"use client";
import { Plus, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { budgets, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function BudgetsPage() {
  const totalBudgeted = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent    = budgets.reduce((s, b) => s + b.spent,  0);
  const overBudget    = budgets.filter((b) => b.spent >= b.amount);
  const nearLimit     = budgets.filter((b) => b.spent / b.amount >= 0.8 && b.spent < b.amount);
  const sorted        = [...budgets].sort((a, b) => b.spent / b.amount - a.spent / a.amount);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Acompanhe seus limites de gasto por categoria"
        actions={<Button size="sm"><Plus size={14} /> Novo Orçamento</Button>}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total orçado</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1 tabular-nums">{formatBRL(totalBudgeted)}</p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total gasto</p>
          <p className={cn("text-xl font-bold mt-1 tabular-nums",
            totalSpent > totalBudgeted ? "text-red-500" : "text-slate-900 dark:text-white")}>
            {formatBRL(totalSpent)}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {Math.round((totalSpent / totalBudgeted) * 100)}% do total
          </p>
        </Card>
        <Card className="py-4">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Disponível</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatBRL(totalBudgeted - totalSpent)}
          </p>
          {overBudget.length > 0 && (
            <Badge variant="danger" className="mt-1.5">
              <AlertTriangle size={9} /> {overBudget.length} estourado{overBudget.length > 1 ? "s" : ""}
            </Badge>
          )}
        </Card>
      </div>

      {/* Alerts */}
      {(overBudget.length > 0 || nearLimit.length > 0) && (
        <div className="space-y-2">
          {overBudget.map((b) => (
            <div key={b.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50">
              <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>{b.category.icon} {b.category.name}</strong> excedeu o orçamento em{" "}
                <strong>{formatBRL(b.spent - b.amount)}</strong>
              </p>
            </div>
          ))}
          {nearLimit.map((b) => (
            <div key={b.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
              <TrendingUp size={15} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>{b.category.icon} {b.category.name}</strong> atingiu{" "}
                <strong>{Math.round((b.spent / b.amount) * 100)}%</strong> do orçamento
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Budget cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sorted.map((budget) => {
          const pct       = Math.min(100, Math.round((budget.spent / budget.amount) * 100));
          const isOver    = budget.spent >= budget.amount;
          const isNear    = pct >= 80 && !isOver;
          const remaining = budget.amount - budget.spent;

          return (
            <Card key={budget.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center text-xl">
                    {budget.category.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">{budget.category.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Mensal</p>
                  </div>
                </div>
                {isOver ? (
                  <Badge variant="danger"><AlertTriangle size={10} /> Estourado</Badge>
                ) : isNear ? (
                  <Badge variant="warning"><AlertTriangle size={10} /> Atenção</Badge>
                ) : (
                  <Badge variant="success"><CheckCircle2 size={10} /> Dentro do limite</Badge>
                )}
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5">
                  <span>{formatBRL(budget.spent)} gastos</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{pct}%</span>
                </div>
                <ProgressBar value={budget.spent} max={budget.amount} />
              </div>

              <div className="flex justify-between pt-3 border-t border-slate-50 dark:border-slate-700/50">
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">
                    {isOver ? "Excesso" : "Restante"}
                  </p>
                  <p className={cn("text-sm font-bold tabular-nums mt-0.5",
                    isOver ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>
                    {formatBRL(Math.abs(remaining))}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">Orçado</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">{formatBRL(budget.amount)}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
