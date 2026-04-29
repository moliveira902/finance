"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetsApi } from "../lib/api-client";
import type { CreateBudgetDto, UpdateBudgetDto } from "@financeapp/shared-types";

export function useBudgets() {
  return useQuery({
    queryKey: ["budgets"],
    queryFn: budgetsApi.list,
    staleTime: 60_000,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBudgetDto) => budgetsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBudgetDto }) =>
      budgetsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}
