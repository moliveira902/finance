"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountsApi } from "../lib/api-client";
import type { CreateAccountDto, UpdateAccountDto } from "@financeapp/shared-types";

export function useAccounts() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: accountsApi.list,
    staleTime: 60_000,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateAccountDto) => accountsApi.create(dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAccountDto }) =>
      accountsApi.update(id, dto),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}
