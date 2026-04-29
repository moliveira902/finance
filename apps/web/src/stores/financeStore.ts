"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  transactions as mockTx,
  accounts as mockAccounts,
  categories as mockCategories,
  budgets as mockBudgets,
  type Transaction,
  type Account,
  type Category,
  type Budget,
} from "@/lib/mock-data";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

interface FinanceStore {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];

  // Transactions
  addTransaction: (t: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, patch: Partial<Omit<Transaction, "id">>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (rows: Omit<Transaction, "id">[]) => void;

  // Accounts
  addAccount: (a: Omit<Account, "id">) => void;
  updateAccount: (id: string, patch: Partial<Omit<Account, "id">>) => void;
  deleteAccount: (id: string) => void;

  // Categories
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, patch: Partial<Omit<Category, "id">>) => void;
  deleteCategory: (id: string) => void;

  // Budgets
  addBudget: (b: Omit<Budget, "id">) => void;
  updateBudget: (id: string, patch: Partial<Omit<Budget, "id">>) => void;
  deleteBudget: (id: string) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      transactions: mockTx,
      accounts: mockAccounts,
      categories: mockCategories,
      budgets: mockBudgets,

      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid() }, ...s.transactions] })),

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? { ...t, ...patch } : t
          ),
        })),

      deleteTransaction: (id) =>
        set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),

      importTransactions: (rows) =>
        set((s) => ({
          transactions: [
            ...rows.map((r) => ({ ...r, id: uid() })),
            ...s.transactions,
          ],
        })),

      addAccount: (a) =>
        set((s) => ({ accounts: [...s.accounts, { ...a, id: uid() }] })),

      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),

      deleteAccount: (id) =>
        set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      addCategory: (c) =>
        set((s) => ({ categories: [...s.categories, { ...c, id: uid() }] })),

      updateCategory: (id, patch) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        })),

      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      addBudget: (b) =>
        set((s) => ({ budgets: [...s.budgets, { ...b, id: uid() }] })),

      updateBudget: (id, patch) =>
        set((s) => ({
          budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      deleteBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),
    }),
    { name: "financeapp-store" }
  )
);
