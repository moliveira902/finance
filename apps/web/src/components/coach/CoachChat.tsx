"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import type { ChatMessage } from "@/lib/coach";

const SUGGESTIONS = [
  "Quanto gastei esse mês?",
  "Estou economizando?",
  "Onde posso cortar gastos?",
  "Qual meu saldo atual?",
];

export function CoachChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const history  = messages.slice(-10);
    const userMsg: ChatMessage = { role: "user", content: trimmed };

    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Erro ao conectar ao consultor.");
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.text) {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + parsed.text };
                }
                return next;
              });
            }
            if (parsed.error) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: parsed.error! };
                return next;
              });
            }
          } catch {
            // ignore malformed SSE frames
          }
        }
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: error.message ?? "Desculpe, ocorreu um erro. Tente novamente.",
        };
        return next;
      });
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-12">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center">
              <Bot size={26} className="text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Meu Consultor</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                Analiso suas finanças e respondo suas dúvidas.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={13} className="text-sky-600 dark:text-sky-400" />
              </div>
            )}

            <div
              className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-sky-500 text-white rounded-br-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-sm"
              }`}
            >
              {msg.content ? (
                msg.content
              ) : loading && i === messages.length - 1 ? (
                <span className="flex gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                </span>
              ) : null}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center shrink-0 mt-0.5">
                <User size={13} className="text-white" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips — shown only before first message */}
      {messages.length === 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2 justify-center">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="text-xs px-3.5 py-1.5 rounded-full border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pb-4 shrink-0">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Pergunte sobre suas finanças..."
            disabled={loading}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-40 flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
