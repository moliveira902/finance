import OpenAI from "openai";
import type { ChatMessage } from "@/lib/coach";
import { buildFinancialContext, buildSystemPrompt } from "@/lib/coachContext";
import { getStore } from "@/lib/kv-store";

const RATE_LIMIT_MSG =
  "Estamos com muitas solicitações no momento. Tente novamente em alguns instantes.";
const GENERIC_ERROR_MSG =
  "Desculpe, não consegui processar sua pergunta agora. Tente novamente.";

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildMessages(
  systemPrompt: string,
  history: ChatMessage[],
  message: string
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return [
    { role: "system", content: systemPrompt },
    ...history.slice(-10).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];
}

interface OpenAIError {
  status?: number;
  message?: string;
}

export async function chatStream(
  userId: string,
  message: string,
  history: ChatMessage[]
): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  const [ctx, store] = await Promise.all([
    buildFinancialContext(userId),
    getStore(userId),
  ]);
  const userName = store.profile.name || "Usuário";
  const systemPrompt = buildSystemPrompt(ctx, userName);

  try {
    const openai = getOpenAI();
    return await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 600,
      stream: true,
      messages: buildMessages(systemPrompt, history, message),
    });
  } catch (err: unknown) {
    const error = err as OpenAIError;
    if (error.status === 429) throw new Error(RATE_LIMIT_MSG);
    if (error.status === 401) {
      console.error("[CoachService] OpenAI authentication error — check OPENAI_API_KEY");
      throw err;
    }
    console.error("[CoachService] OpenAI error:", error.message);
    throw new Error(GENERIC_ERROR_MSG);
  }
}

export async function chatSync(
  userId: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const [ctx, store] = await Promise.all([
    buildFinancialContext(userId),
    getStore(userId),
  ]);
  const userName = store.profile.name || "Usuário";
  const systemPrompt = buildSystemPrompt(ctx, userName);

  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_tokens: 600,
      stream: false,
      messages: buildMessages(systemPrompt, history, message),
    });
    return response.choices[0].message.content ?? GENERIC_ERROR_MSG;
  } catch (err: unknown) {
    const error = err as OpenAIError;
    if (error.status === 429) return RATE_LIMIT_MSG;
    if (error.status === 401) {
      console.error("[CoachService] OpenAI authentication error — check OPENAI_API_KEY");
      throw err;
    }
    console.error("[CoachService] OpenAI error:", error.message);
    return GENERIC_ERROR_MSG;
  }
}
