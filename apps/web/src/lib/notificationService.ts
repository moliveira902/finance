import { kvGet, kvSet, isKvConfigured } from "@/lib/kv-store";
import { getUserPrefs } from "@/lib/userPrefs";
import { getHousehold } from "@/lib/householdService";
import { getStore } from "@/lib/kv-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id:               string;
  userId:           string;
  notificationType: string;
  message:          string;
  metadata:         Record<string, unknown>;
  status:           "pending" | "sent" | "failed" | "read";
  channel:          "telegram" | "in_app";
  sentAt?:          string;
  readAt?:          string;
  createdAt:        string;
}

const MAX_NOTIFICATIONS = 100;

function notifKey(userId: string) {
  return `notifications:${userId}`;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Anti-spam helpers ─────────────────────────────────────────────────────────

function isInQuietHours(quietStart: string, quietEnd: string): boolean {
  const nowBRT = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hour = nowBRT.getUTCHours();
  const qs = parseInt(quietStart.split(":")[0], 10);
  const qe = parseInt(quietEnd.split(":")[0], 10);
  return qs > qe ? hour >= qs || hour < qe : hour >= qs && hour < qe;
}

function countSentToday(notifications: AppNotification[]): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return notifications.filter(
    (n) => n.status === "sent" && n.sentAt && new Date(n.sentAt) >= todayStart,
  ).length;
}

// ── n8n dispatch ──────────────────────────────────────────────────────────────

async function sendToN8n(payload: Record<string, unknown>): Promise<void> {
  const url = process.env.N8N_NOTIFICATION_WEBHOOK_URL;
  const key = process.env.N8N_NOTIFICATION_WEBHOOK_KEY;
  if (!url || !key) return; // n8n not configured — in-app only

  await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body:    JSON.stringify(payload),
    signal:  AbortSignal.timeout(10_000),
  });
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export async function dispatch(
  userId:    string,
  type:      string,
  message:   string,
  metadata:  Record<string, unknown> = {},
  householdId?: string,
): Promise<void> {
  if (!isKvConfigured()) return;

  const [prefs, stored] = await Promise.all([
    getUserPrefs(userId),
    kvGet<AppNotification[]>(notifKey(userId)),
  ]);
  const notifications = stored ?? [];

  // Check user preference
  if (prefs.notificationPrefs.types[type] === false) return;

  const hasTelegram   = !!prefs.telegramChatId;
  const inQuiet       = isInQuietHours(
    prefs.notificationPrefs.quiet_hours_start,
    prefs.notificationPrefs.quiet_hours_end,
  );
  const overCap = countSentToday(notifications) >= prefs.notificationPrefs.max_per_day;

  const record: AppNotification = {
    id:               uid(),
    userId,
    notificationType: type,
    message,
    metadata,
    status:  "pending",
    channel: hasTelegram && prefs.notificationPrefs.telegram_enabled ? "telegram" : "in_app",
    createdAt: new Date().toISOString(),
  };

  // Persist record (always)
  const updated = [record, ...notifications].slice(0, MAX_NOTIFICATIONS);

  // Attempt n8n delivery if telegram is connected and conditions allow
  if (hasTelegram && prefs.notificationPrefs.telegram_enabled && !inQuiet && !overCap) {
    try {
      await sendToN8n({
        notification_type:      type,
        user_id:                userId,
        notification_record_id: record.id,
        telegram_chat_id:       prefs.telegramChatId,
        message,
        household_id:           householdId ?? null,
        metadata,
      });
      record.status = "sent";
      record.sentAt = new Date().toISOString();
    } catch {
      record.status = "failed";
    }
  }

  await kvSet(notifKey(userId), updated);
}

// ── Household helper ──────────────────────────────────────────────────────────

export async function dispatchToHousehold(
  userId: string,
  type:   string,
  messageBuilder: (uid: string, userName: string, partnerName: string) => string,
  metadata: Record<string, unknown>,
): Promise<void> {
  const household = await getHousehold(userId);
  if (!household) return;

  const [ownerStore, memberStore] = await Promise.all([
    getStore(household.ownerUserId),
    getStore(household.memberUserId),
  ]);

  await Promise.all([
    dispatch(
      household.ownerUserId,
      type,
      messageBuilder(household.ownerUserId, ownerStore.profile.name || household.ownerName, memberStore.profile.name || household.memberName),
      metadata,
      household.id,
    ),
    dispatch(
      household.memberUserId,
      type,
      messageBuilder(household.memberUserId, memberStore.profile.name || household.memberName, ownerStore.profile.name || household.ownerName),
      metadata,
      household.id,
    ),
  ]);
}

// ── Notification list helpers ─────────────────────────────────────────────────

export async function getNotifications(
  userId: string,
  page = 1,
  pageSize = 20,
): Promise<{ data: AppNotification[]; total: number; page: number; pageSize: number; totalPages: number }> {
  if (!isKvConfigured()) return { data: [], total: 0, page, pageSize, totalPages: 0 };
  const all = (await kvGet<AppNotification[]>(notifKey(userId))) ?? [];
  const start = (page - 1) * pageSize;
  return {
    data:       all.slice(start, start + pageSize),
    total:      all.length,
    page,
    pageSize,
    totalPages: Math.ceil(all.length / pageSize),
  };
}

export async function markNotificationRead(userId: string, notifId: string): Promise<void> {
  if (!isKvConfigured()) return;
  const all = (await kvGet<AppNotification[]>(notifKey(userId))) ?? [];
  const updated = all.map((n) =>
    n.id === notifId ? { ...n, status: "read" as const, readAt: new Date().toISOString() } : n,
  );
  await kvSet(notifKey(userId), updated);
}

export async function getUnreadCount(userId: string): Promise<number> {
  if (!isKvConfigured()) return 0;
  const all = (await kvGet<AppNotification[]>(notifKey(userId))) ?? [];
  return all.filter((n) => n.status !== "read").length;
}
