"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  categories as defaultCategories,
  type Transaction,
  type Account,
  type Category,
  type Member,
  type UserProfile,
} from "@/lib/mock-data";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type { Member, UserProfile };

interface FinanceStore {
  // Master data
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];

  // Profile & members
  profile: UserProfile;
  members: Member[];

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

  // Profile
  updateProfile: (patch: Partial<UserProfile>) => void;

  // Members
  addMember: (m: Omit<Member, "id" | "joinedAt">) => void;
  updateMember: (id: string, patch: Partial<Omit<Member, "id" | "joinedAt">>) => void;
  removeMember: (id: string) => void;
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set) => ({
      transactions: [],
      accounts: [],
      categories: defaultCategories,
      profile: { name: "", email: "" },
      members: [],

      addTransaction: (t) =>
        set((s) => {
          const newTx = { ...t, id: uid() };
          return {
            transactions: [newTx, ...s.transactions],
            accounts: s.accounts.map((a) =>
              a.id === newTx.account.id ? { ...a, balance: a.balance + newTx.amount } : a
            ),
          };
        }),

      updateTransaction: (id, patch) =>
        set((s) => {
          const old = s.transactions.find((t) => t.id === id);
          if (!old) return {};
          const updated = { ...old, ...patch };
          return {
            transactions: s.transactions.map((t) => (t.id === id ? updated : t)),
            accounts: s.accounts.map((a) => {
              let balance = a.balance;
              // Reverse old effect
              if (a.id === old.account.id)     balance -= old.amount;
              // Apply new effect
              if (a.id === updated.account.id) balance += updated.amount;
              return balance !== a.balance ? { ...a, balance } : a;
            }),
          };
        }),

      deleteTransaction: (id) =>
        set((s) => {
          const tx = s.transactions.find((t) => t.id === id);
          return {
            transactions: s.transactions.filter((t) => t.id !== id),
            accounts: tx
              ? s.accounts.map((a) =>
                  a.id === tx.account.id ? { ...a, balance: a.balance - tx.amount } : a
                )
              : s.accounts,
          };
        }),

      importTransactions: (rows) =>
        set((s) => {
          const newTxs = rows.map((r) => ({ ...r, id: uid() }));
          const updatedAccounts = s.accounts.map((a) => {
            const delta = newTxs
              .filter((t) => t.account.id === a.id)
              .reduce((sum, t) => sum + t.amount, 0);
            return delta !== 0 ? { ...a, balance: a.balance + delta } : a;
          });
          return {
            transactions: [...newTxs, ...s.transactions],
            accounts: updatedAccounts,
          };
        }),

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
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),

      deleteCategory: (id) =>
        set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      addMember: (m) =>
        set((s) => ({
          members: [
            ...s.members,
            { ...m, id: uid(), joinedAt: new Date().toISOString() },
          ],
        })),

      updateMember: (id, patch) =>
        set((s) => ({
          members: s.members.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      removeMember: (id) =>
        set((s) => ({ members: s.members.filter((m) => m.id !== id) })),
    }),
    {
      name: "financeapp-store-v2",
    }
  )
);
