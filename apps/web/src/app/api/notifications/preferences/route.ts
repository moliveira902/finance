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

  const updated = await setUserPrefs(user.id, {
    notificationPrefs: {
      telegram_enabled:  body.telegram_enabled  ?? true,
      quiet_hours_start: body.quiet_hours_start ?? "22:00",
      quiet_hours_end:   body.quiet_hours_end   ?? "08:00",
      max_per_day:       body.max_per_day        ?? 3,
      types:             body.types ?? {},
    },
  });

  return NextResponse.json({ ok: true, prefs: updated.notificationPrefs });
}
