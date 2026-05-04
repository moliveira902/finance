export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CoachWebhookRequest {
  userId: string;
  message: string;
  history?: ChatMessage[];
}

export interface CoachWebhookResponse {
  ok: boolean;
  reply: string;
}

export interface MonthlyTotal {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryTotal {
  name: string;
  total: number;
}

export interface AccountSummary {
  name: string;
  type: string;
  balance: number;
}

export interface RecurringItem {
  description: string;
  amount: number;
  period: "monthly" | "yearly";
}

export interface RecentTransaction {
  description: string;
  amount: number;
  category: string;
  date: string;
  type: "income" | "expense";
}

export interface FinancialContext {
  totalBalance: number;
  avgMonthlyExpense: number;
  avgMonthlyIncome: number;
  avgMonthlySaving: number;
  currentMonthExpense: number;
  topCategory: string;
  topCategoryAmount: number;
  monthlyTotals: MonthlyTotal[];
  categoryBreakdown: CategoryTotal[];
  recentTransactions: RecentTransaction[];
  accounts: AccountSummary[];
  recurringItems: RecurringItem[];
}
