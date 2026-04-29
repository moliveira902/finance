"use client";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../lib/api-client";
import { accounts as mockAccounts, transactions as mockTransactions } from "../lib/mock-data";
import type { DashboardResponse } from "@financeapp/shared-types";

function buildMockDashboard(): DashboardResponse {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const monthTxns = mockTransactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });

  const monthlyIncomeCents = monthTxns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Math.round(t.amount * 100), 0);

  const monthlyExpensesCents = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Math.round(Math.abs(t.amount) * 100), 0);

  const netWorthCents = mockAccounts.reduce((s, a) => s + Math.round(a.balance * 100), 0);

  return {
    kpis: {
      netWorthCents,
      monthlyIncomeCents,
      monthlyExpensesCents,
      freeBalanceCents: monthlyIncomeCents - monthlyExpensesCents,
    },
    recentTransactions: [] as DashboardResponse["recentTransactions"],
    accounts: [] as DashboardResponse["accounts"],
  };
}

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    staleTime: 30_000,
    placeholderData: buildMockDashboard,
  });
}
