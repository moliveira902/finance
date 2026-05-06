import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { sendTelegramMessage } from "@/lib/notificationService";
import { getUserPrefs } from "@/lib/userPrefs";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json() as { botToken?: string; chatId?: string };

  // If no token in request, use the one already stored for this user
  let botToken = body.botToken?.trim();
  if (!botToken) {
    const prefs = await getUserPrefs(user.id);
    botToken = prefs.telegramBotToken;
  }

  const chatId = body.chatId?.trim();

  if (!botToken) return NextResponse.json({ ok: false, error: "Bot Token não configurado." }, { status: 400 });
  if (!chatId)   return NextResponse.json({ ok: false, error: "Chat ID é obrigatório."     }, { status: 400 });

  try {
    await sendTelegramMessage(
      botToken,
      chatId,
      "✅ *FinanceApp*\n\nConexão com Telegram configurada com sucesso! Você receberá notificações financeiras por aqui.",
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
