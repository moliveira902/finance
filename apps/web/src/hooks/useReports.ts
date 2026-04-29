"use client";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "../lib/api-client";

export function useMonthlyTrend(months = 6) {
  return useQuery({
    queryKey: ["reports", "monthly-trend", months],
    queryFn: () => reportsApi.monthlyTrend(months),
    staleTime: 5 * 60_000,
  });
}

export function useCategoryBreakdown(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["reports", "category-breakdown", startDate, endDate],
    queryFn: () => reportsApi.categoryBreakdown(startDate, endDate),
    staleTime: 5 * 60_000,
  });
}
