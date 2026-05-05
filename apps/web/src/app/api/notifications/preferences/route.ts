import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getUserPrefs, setUserPrefs } from "@/lib/userPrefs";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const prefs = await getUserPrefs(user.id);
  return NextResponse.json({
    prefs:                prefs.notificationPrefs,
    telegramConnected:    !!prefs.telegramChatId,
    telegramConnectedAt:  prefs.telegramConnectedAt ?? null,
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json() as {
    telegram_enabled?:  boolean;
    quiet_hours_start?: string;
    quiet_hours_end?:   string;
    max_per_day?:       number;
    types?:             Record<string, boolean>;
  };

  // Only include fields that were actually sent — setUserPrefs will deep-merge
  const patch: Record<string, unknown> = {};
  if (body.telegram_enabled  !== undefined) patch.telegram_enabled  = body.telegram_enabled;
  if (body.quiet_hours_start !== undefined) patch.quiet_hours_start = body.quiet_hours_start;
  if (body.quiet_hours_end   !== undefined) patch.quiet_hours_end   = body.quiet_hours_end;
  if (body.max_per_day       !== undefined) patch.max_per_day       = body.max_per_day;
  if (body.types             !== undefined) patch.types             = body.types;

  const updated = await setUserPrefs(user.id, { notificationPrefs: patch as never });

  return NextResponse.json({ ok: true, prefs: updated.notificationPrefs });
}
