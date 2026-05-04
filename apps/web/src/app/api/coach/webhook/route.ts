import { NextResponse } from "next/server";
import type { ChatMessage } from "@/lib/coach";
import { chatSync } from "@/lib/CoachService";

export async function POST(request: Request) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.N8N_COACH_WEBHOOK_KEY) {
    return NextResponse.json({ ok: false, reply: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    userId?: unknown;
    message?: unknown;
    history?: unknown;
  } | null;

  if (!body?.userId || typeof body.userId !== "string" ||
      !body?.message || typeof body.message !== "string") {
    return NextResponse.json({ ok: false, reply: "Parâmetros inválidos" }, { status: 400 });
  }

  const userId: string  = body.userId;
  const message: string = body.message.slice(0, 500);
  const history: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as ChatMessage[])
    : [];

  try {
    const reply = await chatSync(userId, message, history);
    return NextResponse.json({ ok: true, reply });
  } catch {
    return NextResponse.json({ ok: false, reply: "Desculpe, não consegui processar agora." });
  }
}
