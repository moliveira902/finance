import { jwtVerify } from "jose";
import type { ChatMessage } from "@/lib/coach";
import { chatStream } from "@/lib/CoachService";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

async function getUserId(request: Request): Promise<string | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match  = cookie.match(/financeapp_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }

  const body = await request.json().catch(() => null) as {
    message?: unknown;
    history?: unknown;
  } | null;

  if (!body?.message || typeof body.message !== "string") {
    return new Response(JSON.stringify({ error: "BAD_REQUEST" }), { status: 400 });
  }

  const message: string = body.message.slice(0, 500);
  const history: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as ChatMessage[]).slice(-20)
    : [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = await chatStream(userId, message, history);
        for await (const chunk of aiStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: unknown) {
        const error = err as { message?: string };
        const msg = error.message ?? "Desculpe, não consegui processar sua pergunta agora.";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
