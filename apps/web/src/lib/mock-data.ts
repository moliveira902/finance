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
  aiCategory?: string;
  aiConfidence?: number;
};

export type Budget = {
  id: string;
  category: Category;
  amount: number;
  spent: number;
  period: "monthly";
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

export const accounts: Account[] = [
  { id: "1", name: "Conta Corrente", type: "checking", balance: 8450.75, institution: "Bradesco" },
  { id: "2", name: "Poupança", type: "savings", balance: 23100.00, institution: "Itaú" },
  { id: "3", name: "Cartão de Crédito", type: "credit", balance: -2340.50, institution: "Nubank" },
  { id: "4", name: "Investimentos", type: "investment", balance: 48900.00, institution: "XP Investimentos" },
];

export const transactions: Transaction[] = [
  { id: "1", description: "Supermercado Extra", amount: -387.50, type: "expense", category: categories[0], account: accounts[0], date: "2026-04-28", aiCategory: "Alimentação", aiConfidence: 0.97 },
  { id: "2", description: "Salário Abril", amount: 8500.00, type: "income", category: categories[7], account: accounts[0], date: "2026-04-25", aiCategory: "Salário", aiConfidence: 0.99 },
  { id: "3", description: "Uber", amount: -45.90, type: "expense", category: categories[1], account: accounts[2], date: "2026-04-24", aiCategory: "Transporte", aiConfidence: 0.95 },
  { id: "4", description: "Netflix", amount: -55.90, type: "expense", category: categories[4], account: accounts[2], date: "2026-04-23", aiCategory: "Lazer", aiConfidence: 0.98 },
  { id: "5", description: "Farmácia Drogasil", amount: -89.00, type: "expense", category: categories[3], account: accounts[2], date: "2026-04-22", aiCategory: "Saúde", aiConfidence: 0.92 },
  { id: "6", description: "Aluguel Abril", amount: -2200.00, type: "expense", category: categories[2], account: accounts[0], date: "2026-04-21", aiCategory: "Moradia", aiConfidence: 0.99 },
  { id: "7", description: "Freelance Design", amount: 1800.00, type: "income", category: categories[8], account: accounts[0], date: "2026-04-20", aiCategory: "Freelance", aiConfidence: 0.88 },
  { id: "8", description: "iFood", amount: -112.50, type: "expense", category: categories[0], account: accounts[2], date: "2026-04-19", aiCategory: "Alimentação", aiConfidence: 0.96 },
  { id: "9", description: "Posto Shell", amount: -180.00, type: "expense", category: categories[1], account: accounts[0], date: "2026-04-18", aiCategory: "Transporte", aiConfidence: 0.94 },
  { id: "10", description: "Curso Udemy", amount: -79.90, type: "expense", category: categories[5], account: accounts[2], date: "2026-04-17", aiCategory: "Educação", aiConfidence: 0.91 },
  { id: "11", description: "Conta de Luz", amount: -245.30, type: "expense", category: categories[2], account: accounts[0], date: "2026-04-16", aiCategory: "Moradia", aiConfidence: 0.97 },
  { id: "12", description: "Restaurante Madero", amount: -156.80, type: "expense", category: categories[0], account: accounts[2], date: "2026-04-15", aiCategory: "Alimentação", aiConfidence: 0.95 },
];

export const budgets: Budget[] = [
  { id: "1", category: categories[0], amount: 1200, spent: 656.80, period: "monthly" },
  { id: "2", category: categories[1], amount: 400, spent: 225.90, period: "monthly" },
  { id: "3", category: categories[2], amount: 2500, spent: 2445.30, period: "monthly" },
  { id: "4", category: categories[3], amount: 300, spent: 89.00, period: "monthly" },
  { id: "5", category: categories[4], amount: 200, spent: 55.90, period: "monthly" },
  { id: "6", category: categories[5], amount: 150, spent: 79.90, period: "monthly" },
];

export const monthlyTrend = [
  { month: "Nov", income: 9200, expenses: 6800 },
  { month: "Dez", income: 10500, expenses: 8200 },
  { month: "Jan", income: 8500, expenses: 7100 },
  { month: "Fev", income: 9800, expenses: 6500 },
  { month: "Mar", income: 8500, expenses: 7400 },
  { month: "Abr", income: 10300, expenses: 6800 },
];

export const categoryBreakdown = categories.slice(0, 7).map((cat, i) => ({
  name: cat.name,
  value: [656, 226, 2445, 89, 56, 80, 45][i],
  color: cat.color,
}));

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
