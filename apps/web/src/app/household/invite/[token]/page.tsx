"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Home, Check, Loader2 } from "lucide-react";

interface InviteInfo {
  ownerName: string;
  inviteeEmail: string;
  expiresAt: string;
}

type Mode = "join" | "merge";

export default function HouseholdInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router    = useRouter();

  const [info,    setInfo]    = useState<InviteInfo | null>(null);
  const [isReg,   setIsReg]   = useState(false);
  const [mode,    setMode]    = useState<Mode>("merge");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done,    setDone]    = useState(false);

  useEffect(() => {
    fetch(`/api/household/invite/${token}`)
      .then((r) => r.json())
      .then((d: { invite?: InviteInfo; isRegisteredUser?: boolean; error?: string }) => {
        if (d.error) { setError(d.error); return; }
        setInfo(d.invite!);
        setIsReg(d.isRegisteredUser ?? false);
        if (!d.isRegisteredUser) setMode("join");
      })
      .catch(() => setError("Erro ao carregar o convite."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/household/invite/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json() as { ok?: boolean; mode?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Erro ao aceitar convite.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push(data.mode === "merge" ? "/household" : "/dashboard");
      }, 2000);
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 size={24} className="animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-red-500 font-semibold mb-2">Convite inválido</p>
          <p className="text-sm text-slate-500">{error}</p>
          <button onClick={() => router.push("/dashboard")}
            className="mt-6 text-sm text-sky-500 hover:underline">
            Ir para o dashboard
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
            <Check size={22} className="text-emerald-500" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200">Convite aceito!</p>
          <p className="text-sm text-slate-400 mt-1">Redirecionando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-500 to-violet-500 px-6 py-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
            <Home size={22} className="text-white" />
          </div>
          <p className="text-white font-bold text-lg">{info!.ownerName} te convidou</p>
          <p className="text-white/70 text-sm mt-1">para o FinanceApp</p>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            Como você quer participar?
          </p>

          <div className="space-y-3">
            {/* Merge mode — only for registered users */}
            {isReg && (
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                mode === "merge"
                  ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              }`}>
                <input type="radio" name="mode" value="merge"
                  checked={mode === "merge"} onChange={() => setMode("merge")}
                  className="mt-0.5 accent-sky-500" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Unir contas <span className="text-xs font-normal text-sky-500">Recomendado</span>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mantenha sua conta separada e veja um painel consolidado do casal com divisão de gastos.
                  </p>
                </div>
              </label>
            )}

            {/* Join mode */}
            <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
              mode === "join"
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
            }`}>
              <input type="radio" name="mode" value="join"
                checked={mode === "join"} onChange={() => setMode("join")}
                className="mt-0.5 accent-sky-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Entrar na conta</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Visualize e adicione transações na conta de {info!.ownerName}.
                </p>
              </div>
            </label>
          </div>

          <button
            onClick={handleAccept}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {submitting ? "Aceitando…" : "Continuar"}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Convite válido até {new Date(info!.expiresAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      </div>
    </div>
  );
}
