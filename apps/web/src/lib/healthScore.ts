// ── Types ─────────────────────────────────────────────────────────────────────

export interface DimensionScore {
  score:    number;
  maxScore: number;
  rawValue: number;
  label:    string;
}

export interface HealthScoreTier {
  level:    1 | 2 | 3 | 4 | 5;
  name:     "Iniciante" | "Básico" | "Bom" | "Ótimo" | "Excelente";
  minScore: number;
  maxScore: number;
}

export interface HealthScore {
  total:                number;
  tier:                 HealthScoreTier;
  savings:              DimensionScore;
  budget:               DimensionScore;
  emergency:            DimensionScore;
  debt:                 DimensionScore;
  streak:               DimensionScore;
  currentStreak:        number;
  streakFreezeAvailable: boolean;
  computedAt:           string;
}

export interface HealthScoreHistoryEntry {
  month:      string; // YYYY-MM
  score:      number;
  tier:       HealthScoreTier;
  savingsScore:   number;
  budgetScore:    number;
  emergencyScore: number;
  debtScore:      number;
  streakScore:    number;
  currentStreak:  number;
  computedAt:     string;
}

export interface BadgeRecord {
  badgeId:  string;
  earnedAt: string;
}

export interface BadgeItem {
  id:          string;
  name:        string;
  description: string;
  earned:      boolean;
  earnedAt?:   string;
}

// ── Tiers ─────────────────────────────────────────────────────────────────────

export const TIERS: HealthScoreTier[] = [
  { level: 1, name: "Iniciante",  minScore: 0,  maxScore: 39  },
  { level: 2, name: "Básico",     minScore: 40, maxScore: 59  },
  { level: 3, name: "Bom",        minScore: 60, maxScore: 74  },
  { level: 4, name: "Ótimo",      minScore: 75, maxScore: 89  },
  { level: 5, name: "Excelente",  minScore: 90, maxScore: 100 },
];

export function getTier(score: number): HealthScoreTier {
  return TIERS.find((t) => score >= t.minScore && score <= t.maxScore) ?? TIERS[0];
}

// ── Badge catalog ─────────────────────────────────────────────────────────────

export const BADGE_CATALOG: Record<string, { name: string; description: string }> = {
  first_transaction: { name: "Primeira transação",    description: "Registrou a primeira transação no app" },
  saver_10:          { name: "Poupador iniciante",     description: "Taxa de poupança ≥ 10% pela primeira vez" },
  saver_20:          { name: "Poupador dedicado",      description: "Taxa de poupança ≥ 20% pela primeira vez" },
  emergency_3m:      { name: "Reserva em construção",  description: "Atingiu 3 meses de reserva de emergência" },
  emergency_6m:      { name: "Reserva completa",       description: "Atingiu 6 meses de reserva de emergência" },
  debt_healthy:      { name: "Gastos controlados",     description: "Despesas abaixo de 70% da renda pela primeira vez" },
  streak_4w:         { name: "4 semanas seguidas",     description: "Manteve controle por 4 semanas consecutivas" },
  streak_8w:         { name: "2 meses seguidos",       description: "8 semanas consecutivas com gastos controlados" },
  streak_26w:        { name: "6 meses de controle",    description: "26 semanas consecutivas — conquista rara!" },
  score_60:          { name: "Score Bom",              description: "Pontuação de saúde financeira ≥ 60" },
  score_75:          { name: "Score Ótimo",            description: "Pontuação de saúde financeira ≥ 75" },
  score_90:          { name: "Financeiro excelente",   description: "Pontuação de saúde financeira ≥ 90" },
  casa_settled:      { name: "Contas em dia",          description: "Realizou o primeiro acerto da Casa Compartilhada" },
  telegram_connected:{ name: "Conectado",              description: "Conectou o Telegram para receber notificações" },
};
