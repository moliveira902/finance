"use client";
import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2 } from "lucide-react";
import { Modal, FieldRow, Select } from "./Modal";
import { Button } from "@/components/ui/Button";
import { useFinanceStore } from "@/stores/financeStore";
import type { Transaction, Category, Account } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
}

const EXAMPLE = `descrição,valor,tipo,data
Supermercado Extra,-387.50,despesa,2026-04-28
Salário Maio,8500.00,receita,2026-05-05
Uber,-45.90,despesa,2026-05-06`;

function parseCSV(raw: string, defaultCatId: string, defaultAccId: string, categories: Category[], accounts: Account[]): Omit<Transaction, "id">[] {
  const lines = raw.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("O arquivo precisa ter pelo menos uma linha de dados.");

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const descIdx = header.findIndex((h) => h.includes("desc") || h.includes("nome"));
  const valIdx  = header.findIndex((h) => h.includes("valor") || h.includes("amount") || h.includes("value"));
  const typeIdx = header.findIndex((h) => h.includes("tipo") || h.includes("type"));
  const dateIdx = header.findIndex((h) => h.includes("data") || h.includes("date"));

  if (descIdx < 0 || valIdx < 0) throw new Error("Colunas obrigatórias não encontradas: descrição, valor.");

  const defaultCat = categories.find((c) => c.id === defaultCatId) ?? categories[0];
  const defaultAcc = accounts.find((a) => a.id === defaultAccId) ?? accounts[0];

  return lines.slice(1).map((line) => {
    const cols = line.split(",");
    const rawVal = parseFloat((cols[valIdx] ?? "0").trim().replace(/[^0-9.,-]/g, "").replace(",", "."));
    const type: "income" | "expense" = typeIdx >= 0 && (cols[typeIdx] ?? "").toLowerCase().includes("rec") ? "income" : "expense";
    const amount = Math.abs(rawVal) * (type === "income" ? 1 : -1);
    const date = dateIdx >= 0 ? (cols[dateIdx] ?? "").trim() : new Date().toISOString().slice(0, 10);

    return {
      description: (cols[descIdx] ?? "").trim() || "Importado",
      amount,
      type,
      category: defaultCat,
      account: defaultAcc,
      date: date || new Date().toISOString().slice(0, 10),
    };
  });
}

export function CsvImportModal({ open, onClose }: Props) {
  const { categories, accounts, importTransactions } = useFinanceStore();
  const [raw,       setRaw]       = useState("");
  const [catId,     setCatId]     = useState(categories[0]?.id ?? "");
  const [accId,     setAccId]     = useState(accounts[0]?.id  ?? "");
  const [preview,   setPreview]   = useState<ReturnType<typeof parseCSV> | null>(null);
  const [error,     setError]     = useState("");
  const [imported,  setImported]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setRaw((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function handlePreview() {
    setError(""); setPreview(null);
    try {
      const rows = parseCSV(raw, catId, accId, categories, accounts);
      setPreview(rows);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleImport() {
    if (!preview) return;
    importTransactions(preview);
    setImported(true);
    setTimeout(() => { setImported(false); setRaw(""); setPreview(null); onClose(); }, 1200);
  }

  function handleClose() {
    setRaw(""); setPreview(null); setError(""); setImported(false); onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Importar CSV" size="lg">
      {imported ? (
        <div className="flex flex-col items-center gap-3 py-8 text-emerald-600">
          <CheckCircle2 size={40} />
          <p className="font-semibold">{preview?.length} transações importadas!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Formato esperado</p>
            <pre className="text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-pre-wrap">{EXAMPLE}</pre>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Categoria padrão">
              <Select value={catId} onChange={(e) => setCatId(e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </Select>
            </FieldRow>
            <FieldRow label="Conta padrão">
              <Select value={accId} onChange={(e) => setAccId(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
            </FieldRow>
          </div>

          <FieldRow label="Arquivo CSV ou colar dados">
            <div className="space-y-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm text-slate-500 hover:border-sky-400 hover:text-sky-500 transition-colors">
                <Upload size={14} /> Selecionar arquivo .csv
              </button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={handleFile} />
              <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={6}
                placeholder="Ou cole o conteúdo CSV aqui…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 resize-none" />
            </div>
          </FieldRow>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 rounded-xl px-3 py-2">⚠ {error}</p>
          )}

          {preview && (
            <div className="rounded-xl border border-emerald-100 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex items-center gap-2">
              <FileText size={14} className="text-emerald-600 shrink-0" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400">
                {preview.length} linha{preview.length !== 1 ? "s" : ""} prontas para importar.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
            {!preview ? (
              <Button type="button" onClick={handlePreview} disabled={!raw.trim()}>Verificar</Button>
            ) : (
              <Button type="button" onClick={handleImport}>Importar {preview.length} transações</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
