import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { setUserPrefs } from "@/lib/userPrefs";
import { awardBadge } from "@/lib/healthScoreService";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "financeapp-local-dev-secret-change-in-prod",
);

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  const n8nKey = process.env.N8N_NOTIFICATION_WEBHOOK_KEY;
  if (n8nKey && apiKey !== n8nKey) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await request.json() as { token?: string; telegram_chat_id?: string };
  if (!body.token || !body.telegram_chat_id) {
    return NextResponse.json({ error: "token and telegram_chat_id are required" }, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(body.token, SECRET);
    const userId = payload.userId as string;
    if (!userId) throw new Error("No userId in token");

    await setUserPrefs(userId, {
      telegramChatId:      body.telegram_chat_id,
      telegramConnectedAt: new Date().toISOString(),
    });

    await awardBadge(userId, "telegram_connected");

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
