import { kvGet, kvSet, isKvConfigured, getStore } from "@/lib/kv-store";
import { getUserPrefs } from "@/lib/userPrefs";
import { getHousehold } from "@/lib/householdService";
import { sendNotificationEmail } from "@/lib/emailService";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppNotification {
  id:               string;
  userId:           string;
  notificationType: string;
  message:          string;
  metadata:         Record<string, unknown>;
  status:           "pending" | "sent" | "failed" | "read";
  channel:          "telegram" | "email" | "multi" | "in_app";
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

// ── Telegram direct dispatch ──────────────────────────────────────────────────

export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    signal:  AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Telegram error ${res.status}: ${body}`);
  }
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export async function dispatch(
  userId:   string,
  type:     string,
  message:  string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!isKvConfigured()) return;

  const [prefs, stored, store] = await Promise.all([
    getUserPrefs(userId),
    kvGet<AppNotification[]>(notifKey(userId)),
    getStore(userId),
  ]);
  const notifications = stored ?? [];

  // Check per-type preference
  if (prefs.notificationPrefs.types[type] === false) return;

  const hasTelegram = !!prefs.telegramChatId && !!prefs.telegramBotToken;
  const hasEmail    = prefs.notificationPrefs.email_enabled && !!store.profile.email;
  const inQuiet     = isInQuietHours(
    prefs.notificationPrefs.quiet_hours_start,
    prefs.notificationPrefs.quiet_hours_end,
  );
  const overCap = countSentToday(notifications) >= prefs.notificationPrefs.max_per_day;

  // Determine primary channel label for the record
  const canSendTelegram = hasTelegram && prefs.notificationPrefs.telegram_enabled;
  const canSendEmail    = hasEmail;
  const primaryChannel: AppNotification["channel"] =
    canSendTelegram && canSendEmail ? "multi"
    : canSendTelegram               ? "telegram"
    : canSendEmail                  ? "email"
    : "in_app";

  const record: AppNotification = {
    id:               uid(),
    userId,
    notificationType: type,
    message,
    metadata,
    status:    "pending",
    channel:   primaryChannel,
    createdAt: new Date().toISOString(),
  };

  // Persist record first (always visible in-app)
  const updated = [record, ...notifications].slice(0, MAX_NOTIFICATIONS);
  await kvSet(notifKey(userId), updated);

  if (inQuiet || overCap) return; // respect anti-spam — record is saved, just not delivered

  let telegramOk = false;
  let emailOk    = false;

  // Telegram — direct Bot API
  if (canSendTelegram) {
    try {
      await sendTelegramMessage(prefs.telegramBotToken!, prefs.telegramChatId!, message);
      telegramOk = true;
    } catch {
      // fall through — try email next
    }
  }

  // Email via Resend
  if (canSendEmail) {
    try {
      await sendNotificationEmail(store.profile.email, type, message);
      emailOk = true;
    } catch {
      // fall through
    }
  }

  // Update record status
  if (telegramOk || emailOk) {
    record.status = "sent";
    record.sentAt = new Date().toISOString();
  } else if (canSendTelegram || canSendEmail) {
    record.status = "failed";
  }

  // Re-persist with updated status
  const finalList = [record, ...notifications].slice(0, MAX_NOTIFICATIONS);
  await kvSet(notifKey(userId), finalList);
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
    ),
    dispatch(
      household.memberUserId,
      type,
      messageBuilder(household.memberUserId, memberStore.profile.name || household.memberName, ownerStore.profile.name || household.ownerName),
      metadata,
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
