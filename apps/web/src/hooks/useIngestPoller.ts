"use client";
import { useEffect } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import type { IngestItem } from "@/lib/ingest-queue";
import type { Category, Account } from "@/lib/mock-data";

function resolveCategory(name: string | undefined, categories: Category[]): Category {
  if (!name) return categories.find((c) => c.name === "Outros") ?? categories[0];
  const lower = name.toLowerCase();
  return (
    categories.find((c) => c.name.toLowerCase().includes(lower)) ??
    categories.find((c) => c.name === "Outros") ??
    categories[0]
  );
}

function resolveAccount(name: string | undefined, accounts: Account[]): Account | undefined {
  if (!name || accounts.length === 0) return accounts[0];
  const lower = name.toLowerCase();
  return (
    accounts.find((a) => a.name.toLowerCase().includes(lower) || a.institution.toLowerCase().includes(lower)) ??
    accounts[0]
  );
}

export function useIngestPoller() {
  const { categories, accounts, importTransactions } = useFinanceStore();

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch("/api/ingest/pending", { credentials: "include" });
        if (!res.ok) return;
        const { items } = (await res.json()) as { items: IngestItem[] };
        if (!items?.length) return;

        const defaultAccount = accounts[0];
        if (!defaultAccount) return;

        importTransactions(
          items.map((item) => ({
            description: item.description,
            amount: item.amount,
            type: item.type,
            date: item.date,
            category: resolveCategory(item.categoryName, categories),
            account: resolveAccount(item.accountName, accounts) ?? defaultAccount,
            aiCategory: item.source === "n8n" ? "n8n" : undefined,
          }))
        );
      } catch {
        // Silent — background poll, no user-visible error
      }
    }

    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, [categories, accounts, importTransactions]);
}
