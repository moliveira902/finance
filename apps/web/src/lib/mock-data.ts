export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type Account = {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit" | "investment";
  balance: number;
  institution: string;
};

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: Category;
  account: Account;
  date: string;
  isRecurring?: boolean;
  recurringPeriod?: "monthly" | "yearly";
  recurringCount?: number;
  aiCategory?: string;
  aiConfidence?: number;
  isShared?: boolean;
  createdByMemberId?: string;
  source?: "telegram" | "manual";
};

export const categories: Category[] = [
  { id: "1", name: "Alimentação", icon: "🍔", color: "#f97316" },
  { id: "2", name: "Transporte", icon: "🚗", color: "#3b82f6" },
  { id: "3", name: "Moradia", icon: "🏠", color: "#8b5cf6" },
  { id: "4", name: "Saúde", icon: "💊", color: "#ef4444" },
  { id: "5", name: "Lazer", icon: "🎬", color: "#ec4899" },
  { id: "6", name: "Educação", icon: "📚", color: "#14b8a6" },
  { id: "7", name: "Vestuário", icon: "👔", color: "#f59e0b" },
  { id: "8", name: "Salário", icon: "💼", color: "#10b981" },
  { id: "9", name: "Freelance", icon: "💻", color: "#0ea5e9" },
  { id: "10", name: "Outros", icon: "📦", color: "#64748b" },
];

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  joinedAt: string;
  mode?: "join" | "merge";
  userId?: string;
};

export type UserProfile = {
  name: string;
  email: string;
};

export const accounts: Account[] = [];

export const transactions: Transaction[] = [];


export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
