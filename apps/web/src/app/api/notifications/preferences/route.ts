import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getUserPrefs, setUserPrefs, type UserPrefs } from "@/lib/userPrefs";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const prefs = await getUserPrefs(user.id);
  return NextResponse.json({
    prefs:               prefs.notificationPrefs,
    telegramConnected:   !!prefs.telegramChatId && !!prefs.telegramBotToken,
    telegramConnectedAt: prefs.telegramConnectedAt ?? null,
    telegramChatId:      prefs.telegramChatId      ?? "",
    telegramBotTokenSet: !!prefs.telegramBotToken,
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json() as {
    // Telegram credentials (top-level prefs)
    telegramBotToken?: string;
    telegramChatId?:   string;
    // Notification settings (inside notificationPrefs)
    telegram_enabled?:  boolean;
    email_enabled?:     boolean;
    quiet_hours_start?: string;
    quiet_hours_end?:   string;
    max_per_day?:       number;
    types?:             Record<string, boolean>;
  };

  const userPatch: Partial<UserPrefs> = {};

  // Top-level credential fields
  if (body.telegramBotToken !== undefined) userPatch.telegramBotToken = body.telegramBotToken || undefined;
  if (body.telegramChatId   !== undefined) {
    userPatch.telegramChatId      = body.telegramChatId || undefined;
    userPatch.telegramConnectedAt = body.telegramChatId ? new Date().toISOString() : undefined;
  }

  // notificationPrefs sub-fields
  const notifPatch: Record<string, unknown> = {};
  if (body.telegram_enabled  !== undefined) notifPatch.telegram_enabled  = body.telegram_enabled;
  if (body.email_enabled     !== undefined) notifPatch.email_enabled     = body.email_enabled;
  if (body.quiet_hours_start !== undefined) notifPatch.quiet_hours_start = body.quiet_hours_start;
  if (body.quiet_hours_end   !== undefined) notifPatch.quiet_hours_end   = body.quiet_hours_end;
  if (body.max_per_day       !== undefined) notifPatch.max_per_day       = body.max_per_day;
  if (body.types             !== undefined) notifPatch.types             = body.types;
  if (Object.keys(notifPatch).length > 0)  userPatch.notificationPrefs   = notifPatch as never;

  const updated = await setUserPrefs(user.id, userPatch);

  return NextResponse.json({ ok: true, prefs: updated.notificationPrefs });
}
