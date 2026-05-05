import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { sendTelegramMessage } from "@/lib/notificationService";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json() as { botToken?: string; chatId?: string };
  if (!body.botToken || !body.chatId) {
    return NextResponse.json({ ok: false, error: "Bot Token e Chat ID são obrigatórios." }, { status: 400 });
  }

  try {
    await sendTelegramMessage(
      body.botToken,
      body.chatId,
      "✅ *FinanceApp*\n\nConexão com Telegram configurada com sucesso! Você receberá notificações financeiras por aqui.",
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
