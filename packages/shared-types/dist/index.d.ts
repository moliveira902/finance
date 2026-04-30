export interface User {
    id: string;
    tenantId: string;
    email: string;
    name: string | null;
    timezone: string;
    createdAt: string;
    updatedAt: string;
}
export interface Category {
    id: string;
    userId: string | null;
    name: string;
    slug: string;
    color: string;
    icon: string | null;
    isSystem: boolean;
    parentId: string | null;
    createdAt: string;
}
export interface Account {
    id: string;
    userId: string;
    name: string;
    type: AccountType;
    currency: string;
    balanceCents: number;
    color: string | null;
    icon: string | null;
    isArchived: boolean;
    institution?: string;
    createdAt: string;
    updatedAt: string;
}
export interface Transaction {
    id: string;
    userId: string;
    accountId: string;
    categoryId: string | null;
    amountCents: number;
    description: string;
    notes: string | null;
    transactionDate: string;
    type: TransactionType;
    source: TransactionSource;
    externalId: string | null;
    isRecurring: boolean;
    aiCategoryId: string | null;
    aiConfidence: number | null;
    createdAt: string;
    updatedAt: string;
    category?: Category | null;
    account?: Account;
    aiCategory?: Category | null;
}
export interface Budget {
    id: string;
    userId: string;
    categoryId: string;
    name: string;
    amountCents: number;
    period: BudgetPeriod;
    alertAtPct: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    category?: Category;
    spentCents?: number;
    utilization?: number;
}
export interface BudgetPeriodSnapshot {
    id: string;
    budgetId: string;
    periodStart: string;
    periodEnd: string;
    spentCents: number;
    alertSent80: boolean;
    alertSent100: boolean;
    computedAt: string;
}
export type AccountType = "checking" | "savings" | "credit" | "investment" | "wallet";
export type TransactionType = "expense" | "income" | "transfer";
export type TransactionSource = "manual" | "csv_import" | "bradesco" | "open_finance";
export type BudgetPeriod = "monthly" | "weekly" | "yearly";
export interface LoginDto {
    username: string;
    password: string;
    rememberMe?: boolean;
}
export interface CreateAccountDto {
    name: string;
    type: AccountType;
    currency?: string;
    balanceCents: number;
    color?: string;
    icon?: string;
    institution?: string;
}
export interface UpdateAccountDto {
    name?: string;
    type?: AccountType;
    balanceCents?: number;
    color?: string;
    icon?: string;
    isArchived?: boolean;
}
export interface CreateCategoryDto {
    name: string;
    slug: string;
    color?: string;
    icon?: string;
    parentId?: string;
}
export interface UpdateCategoryDto {
    name?: string;
    color?: string;
    icon?: string;
}
export interface CreateTransactionDto {
    accountId: string;
    categoryId?: string;
    amountCents: number;
    description: string;
    notes?: string;
    transactionDate: string;
    type: TransactionType;
    source?: TransactionSource;
    isRecurring?: boolean;
}
export interface UpdateTransactionDto {
    categoryId?: string | null;
    amountCents?: number;
    description?: string;
    notes?: string | null;
    transactionDate?: string;
    type?: TransactionType;
    isRecurring?: boolean;
}
export interface CreateBudgetDto {
    categoryId: string;
    name: string;
    amountCents: number;
    period: BudgetPeriod;
    alertAtPct?: number;
}
export interface UpdateBudgetDto {
    name?: string;
    amountCents?: number;
    alertAtPct?: number;
    isActive?: boolean;
}
export interface UpdateProfileDto {
    name?: string;
    timezone?: string;
}
export interface UpdateNotificationsDto {
    emailAlerts?: boolean;
    pushNotifications?: boolean;
    weeklyDigest?: boolean;
    monthlyReport?: boolean;
}
export interface AuthResponse {
    user: Pick<User, "id" | "email" | "name" | "timezone">;
    expiresAt: string;
}
export interface DashboardResponse {
    kpis: {
        netWorthCents: number;
        monthlyIncomeCents: number;
        monthlyExpensesCents: number;
        freeBalanceCents: number;
    };
    recentTransactions: Transaction[];
    accounts: Account[];
}
export interface MonthlyTrendPoint {
    month: string;
    incomeCents: number;
    expensesCents: number;
}
export interface CategoryBreakdownPoint {
    categoryId: string;
    categoryName: string;
    color: string;
    totalCents: number;
    percentage: number;
    deltaVsPrevious: number | null;
}
export interface ReportsResponse {
    monthlyTrend: MonthlyTrendPoint[];
    categoryBreakdown: CategoryBreakdownPoint[];
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
export interface TransactionFilters {
    type?: TransactionType;
    categoryId?: string;
    accountId?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    pageSize?: number;
}
export type ApiErrorCode = "NOT_FOUND" | "UNAUTHORIZED" | "FORBIDDEN" | "VALIDATION_ERROR" | "CONFLICT" | "INVALID_JSON" | "INTERNAL_ERROR" | "RATE_LIMITED";
export interface ApiError {
    error: ApiErrorCode;
    message: string;
    details?: unknown;
}
