"use client";
import { useState } from "react";
import { RepeatIcon } from "lucide-react";
import { Modal, FieldRow, Input, Select } from "./Modal";
import { Button } from "@/components/ui/Button";
import { useFinanceStore } from "@/stores/financeStore";
import type { Transaction } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Transaction;
}

export function TransactionModal({ open, onClose, initial }: Props) {
  const { categories, accounts, addTransaction, updateTransaction } = useFinanceStore();
  const today = new Date().toISOString().slice(0, 10);

  const [desc,            setDesc]            = useState(initial?.description ?? "");
  const [amount,          setAmount]          = useState(initial ? String(Math.abs(initial.amount)) : "");
  const [type,            setType]            = useState<"income" | "expense">(initial?.type ?? "expense");
  const [catId,           setCatId]           = useState(initial?.category.id ?? categories[0]?.id ?? "");
  const [accId,           setAccId]           = useState(initial?.account.id  ?? accounts[0]?.id  ?? "");
  const [date,            setDate]            = useState(initial?.date ?? today);
  const [isRecurring,     setIsRecurring]     = useState(initial?.isRecurring ?? false);
  const [recurringPeriod, setRecurringPeriod] = useState<"monthly" | "yearly">(initial?.recurringPeriod ?? "monthly");
  const [error,           setError]           = useState("");

  function reset() {
    setDesc(""); setAmount(""); setType("expense");
    setCatId(categories[0]?.id ?? "");
    setAccId(accounts[0]?.id ?? "");
    setDate(today); setIsRecurring(false); setRecurringPeriod("monthly"); setError("");
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount.replace(",", "."));
    if (!desc.trim())        return setError("Informe a descrição.");
    if (isNaN(num) || num <= 0) return setError("Informe um valor válido.");
    if (!catId)              return setError("Selecione uma categoria.");
    if (!accId)              return setError("Selecione uma conta.");

    const category = categories.find((c) => c.id === catId)!;
    const account  = accounts.find((a) => a.id === accId)!;
    const signed   = type === "expense" ? -num : num;

    const fields = {
      description: desc.trim(), amount: signed, type, category, account, date,
      isRecurring,
      recurringPeriod: isRecurring ? recurringPeriod : undefined,
    };

    if (initial) {
      updateTransaction(initial.id, fields);
    } else {
      addTransaction(fields);
    }
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={initial ? "Editar Transação" : "Nova Transação"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldRow label="Descrição">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: Supermercado Extra" required />
        </FieldRow>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Tipo">
            <Select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")}>
              <option value="expense">Despesa</option>
              <option value="income">Receita</option>
            </Select>
          </FieldRow>
          <FieldRow label="Valor (R$)">
            <Input type="number" min="0.01" step="0.01" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required />
          </FieldRow>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Categoria">
            <Select value={catId} onChange={(e) => setCatId(e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </Select>
          </FieldRow>
          <FieldRow label="Conta">
            <Select value={accId} onChange={(e) => setAccId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </FieldRow>
        </div>

        <FieldRow label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </FieldRow>

        {/* Recurring toggle */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <RepeatIcon size={15} className={isRecurring ? "text-sky-500" : "text-slate-400"} />
              Transação recorrente
            </span>
            <div className={`w-9 h-5 rounded-full transition-colors relative ${isRecurring ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isRecurring ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
          </button>

          {isRecurring && (
            <div className="px-4 pb-3 bg-sky-50/50 dark:bg-sky-950/20 border-t border-slate-100 dark:border-slate-700">
              <FieldRow label="Periodicidade">
                <Select value={recurringPeriod} onChange={(e) => setRecurringPeriod(e.target.value as "monthly" | "yearly")}>
                  <option value="monthly">Mensal</option>
                  <option value="yearly">Anual</option>
                </Select>
              </FieldRow>
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">
            ⚠ {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button type="submit">{initial ? "Salvar" : "Adicionar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
