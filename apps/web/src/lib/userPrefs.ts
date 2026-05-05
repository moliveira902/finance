import { kvGet, kvSet, isKvConfigured } from "@/lib/kv-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_TYPES: Record<string, boolean> = {
  SCORE_WEEKLY_SUMMARY:        true,
  SCORE_LEVEL_UP:              true,
  STREAK_MILESTONE:            true,
  STREAK_BROKEN:               true,
  BADGE_EARNED:                true,
  BUDGET_ALERT_80:             true,
  BUDGET_ALERT_EXCEEDED:       true,
  BUDGET_MONTHLY_REVIEW:       true,
  MONTHLY_REPORT_READY:        true,
  SAVINGS_POSITIVE:            true,
  LOW_BALANCE_WARNING:         true,
  SUBSCRIPTION_DETECTED:       true,
  HOUSEHOLD_EXPENSE_SHARED:    true,
  HOUSEHOLD_BUDGET_ALERT:      true,
  HOUSEHOLD_SETTLEMENT_DUE:    true,
  HOUSEHOLD_SETTLEMENT_CLOSED: true,
  HOUSEHOLD_MONTHLY_SUMMARY:   true,
  COACH_WEEKLY_INSIGHT:        true,
};

export interface NotificationPrefs {
  telegram_enabled:   boolean;
  email_enabled:      boolean;
  quiet_hours_start:  string;
  quiet_hours_end:    string;
  max_per_day:        number;
  types:              Record<string, boolean>;
}

export interface UserPrefs {
  telegramChatId?:        string;
  telegramBotToken?:      string;
  telegramConnectedAt?:   string;
  streakFreezeUsedMonth?: string; // YYYY-MM
  notificationPrefs:      NotificationPrefs;
}

const DEFAULT_PREFS: UserPrefs = {
  notificationPrefs: {
    telegram_enabled:  true,
    email_enabled:     false,
    quiet_hours_start: "22:00",
    quiet_hours_end:   "08:00",
    max_per_day:       3,
    types:             DEFAULT_NOTIFICATION_TYPES,
  },
};

// ── Storage ───────────────────────────────────────────────────────────────────

function prefsKey(userId: string) {
  return `user_prefs:${userId}`;
}

export async function getUserPrefs(userId: string): Promise<UserPrefs> {
  if (!isKvConfigured()) return structuredClone(DEFAULT_PREFS);
  const raw = await kvGet<UserPrefs>(prefsKey(userId));
  if (!raw) return structuredClone(DEFAULT_PREFS);
  return {
    ...DEFAULT_PREFS,
    ...raw,
    notificationPrefs: {
      ...DEFAULT_PREFS.notificationPrefs,
      ...raw.notificationPrefs,
      types: { ...DEFAULT_NOTIFICATION_TYPES, ...raw.notificationPrefs?.types },
    },
  };
}

export async function setUserPrefs(userId: string, update: Partial<UserPrefs>): Promise<UserPrefs> {
  const current = await getUserPrefs(userId);
  const merged: UserPrefs = {
    ...current,
    ...update,
    notificationPrefs: update.notificationPrefs
      ? {
          ...current.notificationPrefs,
          ...update.notificationPrefs,
          types: { ...current.notificationPrefs.types, ...update.notificationPrefs.types },
        }
      : current.notificationPrefs,
  };
  if (isKvConfigured()) {
    await kvSet(prefsKey(userId), merged);
  }
  return merged;
}
