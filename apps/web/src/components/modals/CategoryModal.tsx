"use client";
import { useState } from "react";
import { Modal, FieldRow, Input } from "./Modal";
import { Button } from "@/components/ui/Button";
import { useFinanceStore } from "@/stores/financeStore";
import type { Category } from "@/lib/mock-data";

const PRESET_COLORS = [
  "#f97316","#3b82f6","#8b5cf6","#ef4444","#ec4899",
  "#14b8a6","#f59e0b","#10b981","#0ea5e9","#64748b",
];

const PRESET_ICONS = ["🍔","🚗","🏠","💊","🎬","📚","👔","💼","💻","📦","✈️","🐾","🎮","🎵","💰","🛒"];

interface Props {
  open: boolean;
  onClose: () => void;
  initial?: Category;
}

export function CategoryModal({ open, onClose, initial }: Props) {
  const { addCategory, updateCategory } = useFinanceStore();

  const [name,  setName]  = useState(initial?.name  ?? "");
  const [icon,  setIcon]  = useState(initial?.icon  ?? "📦");
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [error, setError] = useState("");

  function reset() { setName(""); setIcon("📦"); setColor(PRESET_COLORS[0]); setError(""); }
  function handleClose() { reset(); onClose(); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Informe o nome da categoria.");
    if (initial) {
      updateCategory(initial.id, { name: name.trim(), icon, color });
    } else {
      addCategory({ name: name.trim(), icon, color });
    }
    handleClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={initial ? "Editar Categoria" : "Nova Categoria"} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldRow label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pets" required />
        </FieldRow>

        <FieldRow label="Ícone">
          <div className="flex flex-wrap gap-2">
            {PRESET_ICONS.map((ic) => (
              <button key={ic} type="button"
                onClick={() => setIcon(ic)}
                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center border-2 transition-all ${
                  icon === ic
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
                    : "border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                }`}>
                {ic}
              </button>
            ))}
          </div>
        </FieldRow>

        <FieldRow label="Cor">
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((c) => (
              <button key={c} type="button"
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  color === c ? "border-slate-900 dark:border-white scale-110" : "border-transparent"
                }`} />
            ))}
          </div>
        </FieldRow>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">
            ⚠ {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button type="submit">{initial ? "Salvar" : "Criar"}</Button>
        </div>
      </form>
    </Modal>
  );
}
