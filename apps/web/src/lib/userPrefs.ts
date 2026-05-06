import { kvGet, kvSet, isKvConfigured } from "@/lib/kv-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export const DEFAULT_NOTIFICATION_TYPES: Record<string, boolean> = {
  BADGE_EARNED:             true,
  BUDGET_ALERT_80:          true,
  BUDGET_ALERT_EXCEEDED:    true,
  BUDGET_MONTHLY_REVIEW:    true,
  MONTHLY_REPORT_READY:     true,
  SAVINGS_POSITIVE:         true,
  LOW_BALANCE_WARNING:      true,
  SUBSCRIPTION_DETECTED:    true,
  SUBSCRIPTION_UNUSED:      true,
  HOUSEHOLD_EXPENSE_SHARED: true,
  HOUSEHOLD_BUDGET_ALERT:   true,
  COACH_WEEKLY_INSIGHT:     true,
  INACTIVITY_NUDGE:         true,
};

export const DEFAULT_TYPE_CHANNELS: Record<string, { telegram: boolean; email: boolean }> = {
  BADGE_EARNED:             { telegram: true,  email: false },
  BUDGET_ALERT_80:          { telegram: true,  email: false },
  BUDGET_ALERT_EXCEEDED:    { telegram: true,  email: true  },
  BUDGET_MONTHLY_REVIEW:    { telegram: true,  email: false },
  MONTHLY_REPORT_READY:     { telegram: true,  email: true  },
  SAVINGS_POSITIVE:         { telegram: true,  email: false },
  LOW_BALANCE_WARNING:      { telegram: true,  email: false },
  SUBSCRIPTION_DETECTED:    { telegram: true,  email: false },
  SUBSCRIPTION_UNUSED:      { telegram: true,  email: false },
  HOUSEHOLD_EXPENSE_SHARED: { telegram: true,  email: false },
  HOUSEHOLD_BUDGET_ALERT:   { telegram: true,  email: false },
  COACH_WEEKLY_INSIGHT:     { telegram: false, email: true  },
  INACTIVITY_NUDGE:         { telegram: true,  email: true  },
};

export interface NotificationPrefs {
  telegram_enabled:   boolean;
  email_enabled:      boolean;
  quiet_hours_start:  string;
  quiet_hours_end:    string;
  max_per_day:        number;
  types:              Record<string, boolean>;
  typeChannels:       Record<string, { telegram: boolean; email: boolean }>;
  inactivityNudge:    { enabled: boolean; thresholdDays: number };
}

export interface UserPrefs {
  telegramChatId?:        string;
  telegramBotToken?:      string;
  telegramConnectedAt?:   string;
  streakFreezeUsedMonth?: string; // YYYY-MM
  lastActiveAt?:          string; // ISO timestamp of last app open
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
    typeChannels:      DEFAULT_TYPE_CHANNELS,
    inactivityNudge:   { enabled: true, thresholdDays: 2 },
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
      types:          { ...DEFAULT_NOTIFICATION_TYPES, ...raw.notificationPrefs?.types },
      typeChannels:   { ...DEFAULT_TYPE_CHANNELS,      ...raw.notificationPrefs?.typeChannels },
      inactivityNudge: raw.notificationPrefs?.inactivityNudge ?? DEFAULT_PREFS.notificationPrefs.inactivityNudge,
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
          types:           { ...current.notificationPrefs.types,        ...update.notificationPrefs.types },
          typeChannels:    { ...current.notificationPrefs.typeChannels, ...update.notificationPrefs.typeChannels },
          inactivityNudge: update.notificationPrefs.inactivityNudge ?? current.notificationPrefs.inactivityNudge,
        }
      : current.notificationPrefs,
  };
  if (isKvConfigured()) {
    await kvSet(prefsKey(userId), merged);
  }
  return merged;
}
