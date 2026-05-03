import type {
  Account,
  Transaction,
  Category,
  DashboardResponse,
  MonthlyTrendPoint,
  CategoryBreakdownPoint,
  PaginatedResponse,
  TransactionFilters,
  CreateTransactionDto,
  UpdateTransactionDto,
  CreateAccountDto,
  UpdateAccountDto,
  ApiError,
} from "@financeapp/shared-types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: ApiError["error"],
    message: string
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({
      error: "INTERNAL_ERROR" as const,
      message: "Request failed",
    }));
    throw new ApiClientError(res.status, err.error, err.message);
  }

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (username: string, password: string, rememberMe = false) =>
    apiFetch<{ user: { id: string; email: string; name: string | null }; expiresAt: string }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password, rememberMe }) }
    ),

  logout: () => apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" }),

  me: () =>
    apiFetch<{ id: string; email: string; name: string | null; tenantId: string }>("/auth/me"),
};

// ── Accounts ─────────────────────────────────────────────────────────────────

export const accountsApi = {
  list: () => apiFetch<Account[]>("/accounts"),

  create: (dto: CreateAccountDto) =>
    apiFetch<Account>("/accounts", { method: "POST", body: JSON.stringify(dto) }),

  update: (id: string, dto: UpdateAccountDto) =>
    apiFetch<Account>(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),

  remove: (id: string) =>
    apiFetch<void>(`/accounts/${id}`, { method: "DELETE" }),
};

// ── Categories ───────────────────────────────────────────────────────────────

export const categoriesApi = {
  list: () => apiFetch<Category[]>("/categories"),
};

// ── Transactions ─────────────────────────────────────────────────────────────

export const transactionsApi = {
  list: (filters?: TransactionFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.set(k, String(v));
      });
    }
    const qs = params.toString();
    return apiFetch<PaginatedResponse<Transaction>>(`/transactions${qs ? `?${qs}` : ""}`);
  },

  get: (id: string) => apiFetch<Transaction>(`/transactions/${id}`),

  create: (dto: CreateTransactionDto) =>
    apiFetch<Transaction>("/transactions", { method: "POST", body: JSON.stringify(dto) }),

  update: (id: string, dto: UpdateTransactionDto) =>
    apiFetch<Transaction>(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(dto) }),

  remove: (id: string) =>
    apiFetch<void>(`/transactions/${id}`, { method: "DELETE" }),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => apiFetch<DashboardResponse>("/dashboard"),
};

// ── Reports ──────────────────────────────────────────────────────────────────

export const reportsApi = {
  monthlyTrend: (months = 6) =>
    apiFetch<MonthlyTrendPoint[]>(`/reports/monthly-trend?months=${months}`),

  categoryBreakdown: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return apiFetch<CategoryBreakdownPoint[]>(`/reports/category-breakdown${qs ? `?${qs}` : ""}`);
  },
};

export { ApiClientError };
