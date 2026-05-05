import { getStore } from "@/lib/kv-store";
import { kvGet, kvSet, kvDel, isKvConfigured } from "@/lib/kv-store";
import {
  getTier, BADGE_CATALOG,
  type HealthScore, type HealthScoreHistoryEntry, type BadgeRecord, type BadgeItem,
} from "@/lib/healthScore";
import { getUserPrefs, setUserPrefs } from "@/lib/userPrefs";

// ── Constants ─────────────────────────────────────────────────────────────────

const CACHE_TTL      = parseInt(process.env.HEALTH_SCORE_CACHE_TTL ?? "3600");
const MAX_HISTORY    = 12;
const MAX_STREAK_WKS = 26;

function scoreKey(userId: string)   { return `health_score:${userId}`; }
function historyKey(userId: string) { return `health_score_history:${userId}`; }
function badgesKey(userId: string)  { return `badges:${userId}`; }

// ── Score helpers ─────────────────────────────────────────────────────────────

function calcSavingsScore(rate: number): number {
  if (rate >= 20) return 25;
  if (rate >= 10) return Math.round(15 + (rate - 10));
  if (rate >= 5)  return Math.round(8  + (rate - 5) * 1.4);
  return Math.max(0, Math.round(rate * 1.6));
}

function calcBudgetScore(current: number, avg: number): number {
  if (avg <= 0) return 20; // no history — give partial score
  const ratio = current / avg;
  if (ratio <= 1.0)  return 25;
  if (ratio <= 1.1)  return Math.round(25 - (ratio - 1.0) * 50);
  if (ratio <= 1.5)  return Math.round(20 - (ratio - 1.1) / 0.4 * 15);
  return Math.max(0, Math.round(5 - (ratio - 1.5) * 10));
}

function calcEmergencyScore(months: number): number {
  if (months >= 6) return 20;
  if (months >= 3) return Math.round(12 + (months - 3) * 1.33);
  return Math.round(months * 4);
}

function calcDebtScore(expenseRatio: number): number {
  // expenseRatio = expenses / income (0–1+)
  if (expenseRatio <= 0.7)  return 20;
  if (expenseRatio <= 0.85) return Math.round(20 - ((expenseRatio - 0.7) / 0.15) * 10);
  if (expenseRatio <= 1.0)  return Math.round(10 - ((expenseRatio - 0.85) / 0.15) * 8);
  return Math.max(0, Math.round(2 - (expenseRatio - 1.0) * 4));
}

function calcStreakScore(weeks: number): number {
  return Math.min(10, Math.round(weeks * 10 / 12));
}

// ── Streak from transaction history ──────────────────────────────────────────

function computeStreakFromTransactions(
  txns: { date: string; amount: number; type: "income" | "expense" }[],
  avgMonthlyExpense: number,
): number {
  const now = new Date();
  const weeklyBudget = avgMonthlyExpense / 4.33;
  let streak = 0;

  for (let w = 0; w < MAX_STREAK_WKS; w++) {
    const weekEnd   = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekTxns = txns.filter((t) => {
      const d = new Date(t.date);
      return d >= weekStart && d < weekEnd;
    });

    const weekExpenses = weekTxns
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Skip weeks with no data (give benefit of doubt at start of tracking)
    if (weekTxns.length === 0) {
      if (streak === 0) continue; // haven't started counting yet
      break; // gap in data ends streak
    }

    const budget = weeklyBudget > 0 ? weeklyBudget * 1.1 : Infinity;
    if (weekExpenses <= budget) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ── Main compute ──────────────────────────────────────────────────────────────

export async function computeHealthScore(userId: string): Promise<HealthScore> {
  const store  = await getStore(userId);
  const prefs  = await getUserPrefs(userId);
  const txns   = store.transactions;
  const accts  = store.accounts;

  const now       = new Date();
  const monthKey  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // ── 6-month monthly totals ─────────────────────────────────────────────────
  const monthMap = new Map<string, { income: number; expense: number }>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(k, { income: 0, expense: 0 });
  }

  txns.forEach((t) => {
    const k = t.date.slice(0, 7);
    if (!monthMap.has(k)) return;
    const entry = monthMap.get(k)!;
    if (t.type === "income")  entry.income  += t.amount;
    else                      entry.expense += Math.abs(t.amount);
  });

  const months = Array.from(monthMap.values());
  const currentMonthEntry = monthMap.get(monthKey) ?? { income: 0, expense: 0 };

  const income   = currentMonthEntry.income;
  const expenses = currentMonthEntry.expense;

  const activeMonths = months.filter((m) => m.income > 0 || m.expense > 0);
  const avgMonthlyExpense = activeMonths.length > 0
    ? activeMonths.reduce((s, m) => s + m.expense, 0) / activeMonths.length : 0;

  // ── Scoring ────────────────────────────────────────────────────────────────
  const savingsRate    = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const expenseRatio   = income > 0 ? expenses / income : 1;
  const liquidBalance  = accts.reduce((s, a) => s + a.balance, 0);
  const monthsCovered  = avgMonthlyExpense > 0 ? liquidBalance / avgMonthlyExpense : 0;
  const currentStreak  = computeStreakFromTransactions(txns, avgMonthlyExpense);

  const savingsScore   = calcSavingsScore(savingsRate);
  const budgetScore    = calcBudgetScore(expenses, avgMonthlyExpense);
  const emergencyScore = calcEmergencyScore(monthsCovered);
  const debtScore      = calcDebtScore(expenseRatio);
  const streakScore    = calcStreakScore(currentStreak);
  const total          = savingsScore + budgetScore + emergencyScore + debtScore + streakScore;
  const tier           = getTier(total);

  // ── Streak freeze ─────────────────────────────────────────────────────────
  const freezeAvailable = !prefs.streakFreezeUsedMonth
    || prefs.streakFreezeUsedMonth.slice(0, 7) !== monthKey;

  // ── Build score object ────────────────────────────────────────────────────
  const scoreObj: HealthScore = {
    total,
    tier: { level: tier.level, name: tier.name, minScore: tier.minScore, maxScore: tier.maxScore },
    savings:   { score: savingsScore,   maxScore: 25, rawValue: Math.round(savingsRate * 10) / 10,   label: "Taxa de poupança" },
    budget:    { score: budgetScore,    maxScore: 25, rawValue: Math.round(expenses),                 label: "Controle de gastos" },
    emergency: { score: emergencyScore, maxScore: 20, rawValue: Math.round(monthsCovered * 10) / 10, label: "Reserva de emergência" },
    debt:      { score: debtScore,      maxScore: 20, rawValue: Math.round(expenseRatio * 100),       label: "Saúde financeira" },
    streak:    { score: streakScore,    maxScore: 10, rawValue: currentStreak,                        label: "Consistência" },
    currentStreak,
    streakFreezeAvailable: freezeAvailable,
    computedAt: now.toISOString(),
  };

  // ── Persist to history ────────────────────────────────────────────────────
  if (isKvConfigured()) {
    const history = (await kvGet<HealthScoreHistoryEntry[]>(historyKey(userId))) ?? [];
    const entry: HealthScoreHistoryEntry = {
      month: monthKey, score: total, tier: scoreObj.tier,
      savingsScore, budgetScore, emergencyScore, debtScore, streakScore,
      currentStreak, computedAt: now.toISOString(),
    };
    const idx = history.findIndex((h) => h.month === monthKey);
    if (idx >= 0) history[idx] = entry; else history.unshift(entry);
    history.sort((a, b) => b.month.localeCompare(a.month));
    await kvSet(historyKey(userId), history.slice(0, MAX_HISTORY));
    await kvSet(scoreKey(userId), scoreObj, CACHE_TTL);
  }

  // Award badges (non-blocking)
  awardBadges(userId, { savingsRate, monthsCovered, currentStreak, total, expenseRatio, txnsCount: txns.length })
    .catch(() => {});

  return scoreObj;
}

export async function getHealthScore(userId: string): Promise<HealthScore> {
  if (isKvConfigured()) {
    const cached = await kvGet<HealthScore>(scoreKey(userId));
    if (cached) return cached;
  }
  return computeHealthScore(userId);
}

export async function invalidateHealthScoreCache(userId: string): Promise<void> {
  if (isKvConfigured()) await kvDel(scoreKey(userId));
}

export async function getHealthScoreHistory(
  userId: string,
  months = 12,
): Promise<HealthScoreHistoryEntry[]> {
  if (!isKvConfigured()) return [];
  const history = (await kvGet<HealthScoreHistoryEntry[]>(historyKey(userId))) ?? [];
  return history.slice(0, months);
}

// ── Badge awarding ─────────────────────────────────────────────────────────────

async function awardBadges(
  userId: string,
  ctx: {
    savingsRate:  number;
    monthsCovered: number;
    currentStreak: number;
    total:         number;
    expenseRatio:  number;
    txnsCount:     number;
  },
) {
  if (!isKvConfigured()) return;

  const earned = (await kvGet<BadgeRecord[]>(badgesKey(userId))) ?? [];
  const earnedSet = new Set(earned.map((b) => b.badgeId));
  const newBadges: BadgeRecord[] = [];

  function check(id: string, condition: boolean) {
    if (condition && !earnedSet.has(id)) {
      newBadges.push({ badgeId: id, earnedAt: new Date().toISOString() });
    }
  }

  check("first_transaction", ctx.txnsCount >= 1);
  check("saver_10",          ctx.savingsRate >= 10);
  check("saver_20",          ctx.savingsRate >= 20);
  check("emergency_3m",      ctx.monthsCovered >= 3);
  check("emergency_6m",      ctx.monthsCovered >= 6);
  check("debt_healthy",      ctx.expenseRatio <= 0.7);
  check("streak_4w",         ctx.currentStreak >= 4);
  check("streak_8w",         ctx.currentStreak >= 8);
  check("streak_26w",        ctx.currentStreak >= 26);
  check("score_60",          ctx.total >= 60);
  check("score_75",          ctx.total >= 75);
  check("score_90",          ctx.total >= 90);

  if (newBadges.length > 0) {
    await kvSet(badgesKey(userId), [...earned, ...newBadges]);
    // Fire BADGE_EARNED notifications for each new badge
    const { dispatch } = await import("@/lib/notificationService");
    const { Templates } = await import("@/lib/notificationTemplates");
    const store = await getStore(userId);
    const name = store.profile.name || "você";
    for (const nb of newBadges) {
      const cat = BADGE_CATALOG[nb.badgeId];
      if (cat) {
        await dispatch(userId, "BADGE_EARNED",
          Templates.BADGE_EARNED(name, cat.name, cat.description),
          { badge_id: nb.badgeId, badge_name: cat.name },
        ).catch(() => {});
      }
    }
  }
}

export async function getBadges(userId: string): Promise<BadgeItem[]> {
  const earned = isKvConfigured()
    ? (await kvGet<BadgeRecord[]>(badgesKey(userId))) ?? []
    : [];
  const earnedMap = new Map(earned.map((b) => [b.badgeId, b.earnedAt]));

  return Object.entries(BADGE_CATALOG).map(([id, def]) => ({
    id,
    name:        def.name,
    description: def.description,
    earned:      earnedMap.has(id),
    earnedAt:    earnedMap.get(id),
  }));
}

export async function awardBadge(userId: string, badgeId: string): Promise<void> {
  if (!isKvConfigured()) return;
  const earned = (await kvGet<BadgeRecord[]>(badgesKey(userId))) ?? [];
  if (earned.some((b) => b.badgeId === badgeId)) return;
  await kvSet(badgesKey(userId), [...earned, { badgeId, earnedAt: new Date().toISOString() }]);
}

export async function applyStreakFreeze(userId: string): Promise<{ ok: boolean; message: string }> {
  const prefs  = await getUserPrefs(userId);
  const nowKey = new Date().toISOString().slice(0, 7);
  if (prefs.streakFreezeUsedMonth?.slice(0, 7) === nowKey) {
    return { ok: false, message: "Freeze já usado este mês." };
  }
  await setUserPrefs(userId, { streakFreezeUsedMonth: nowKey });
  return { ok: true, message: "Sequência protegida!" };
}
