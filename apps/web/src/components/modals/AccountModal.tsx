"use client";
import { useState } from "react";
import { Modal, FieldRow, Input, Select } from "./Modal";
import { Button } from "@/components/ui/Button";
import { useFinanceStore } from "@/stores/financeStore";
import type { Account } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Account;
}

const ACCOUNT_TYPES: { value: Account["type"]; label: string }[] = [
  { value: "checking",   label: "Conta Corrente" },
  { value: "savings",    label: "Poupança"        },
  { value: "credit",     label: "Cartão de Crédito" },
  { value: "investment", label: "Investimentos"   },
];

export function AccountModal({ open, onClose, initial }: Props) {
  const { addAccount, updateAccount } = useFinanceStore();

  const [name,        setName]        = useState(initial?.name ?? "");
  const [type,        setType]        = useState<Account["type"]>(initial?.type ?? "checking");
  const [institution, setInstitution] = useState(initial?.institution ?? "");
  const [balance,     setBalance]     = useState(initial ? String(initial.balance) : "0");
  const [error,       setError]       = useState("");

  function reset() {
    setName(""); setType("checking"); setInstitution(""); setBalance("0"); setError("");
  }

  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(balance.replace(",", "."));
    if (!name.trim()) return setError("Informe o nome da conta.");
    if (isNaN(num))   return setError("Informe um saldo válido.");

    if (initial) {
      updateAccount(initial.id, { name: name.trim(), type, institution: institution.trim(), balance: num });
    } else {
      addAccount({ name: name.trim(), type, institution: institution.trim(), balance: num });
    }
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={initial ? "Editar Conta" : "Nova Conta"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldRow label="Nome da conta">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Conta Corrente" required />
        </FieldRow>

        <FieldRow label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value as Account["type"])}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>
        </FieldRow>

        <FieldRow label="Instituição">
          <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex: Itaú, Nubank…" />
        </FieldRow>

        <FieldRow label="Saldo atual (R$)">
          <Input type="number" step="0.01" value={balance}
            onChange={(e) => setBalance(e.target.value)} placeholder="0,00" />
        </FieldRow>

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
