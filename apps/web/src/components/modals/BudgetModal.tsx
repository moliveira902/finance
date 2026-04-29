"use client";
import { useState } from "react";
import { Modal, FieldRow, Input, Select } from "./Modal";
import { Button } from "@/components/ui/Button";
import { useFinanceStore } from "@/stores/financeStore";
import type { Budget } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Budget;
}

export function BudgetModal({ open, onClose, initial }: Props) {
  const { categories, budgets, addBudget, updateBudget } = useFinanceStore();
  const usedCatIds = budgets.map((b) => b.category.id);
  const available = initial
    ? categories
    : categories.filter((c) => !usedCatIds.includes(c.id));

  const [catId,  setCatId]  = useState(initial?.category.id ?? available[0]?.id ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [error,  setError]  = useState("");

  function reset() {
    setCatId(available[0]?.id ?? "");
    setAmount(""); setError("");
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(",", "."));
    if (!catId)              return setError("Selecione uma categoria.");
    if (isNaN(num) || num <= 0) return setError("Informe um valor válido.");

    const category = categories.find((c) => c.id === catId)!;
    if (initial) {
      updateBudget(initial.id, { amount: num });
    } else {
      addBudget({ category, amount: num, spent: 0, period: "monthly" });
    }
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={initial ? "Editar Orçamento" : "Novo Orçamento"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldRow label="Categoria">
          <Select value={catId} onChange={(e) => setCatId(e.target.value)} disabled={!!initial}>
            {(initial ? categories : available).map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label="Limite mensal (R$)">
          <Input type="number" min="1" step="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
        </FieldRow>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">
            ⚠ {error}
          </p>
        )}

        {available.length === 0 && !initial && (
          <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 rounded-xl px-3 py-2">
            Todas as categorias já possuem orçamento definido.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button type="submit" disabled={available.length === 0 && !initial}>
            {initial ? "Salvar" : "Criar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
