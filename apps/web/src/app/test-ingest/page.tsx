"use client";
import { useState, useEffect, useRef } from "react";

const EXAMPLE = JSON.stringify(
  {
    description: "Teste n8n",
    amount: 99.9,
    type: "expense",
    date: "2026-04-30",
    category: "Outros",
  },
  null,
  2
);

type Result = {
  status: number;
  ok: boolean;
  data: unknown;
};

export default function TestIngestPage() {
  const [endpoint, setEndpoint] = useState("");
  const [apiKey,   setApiKey]   = useState("");
  const [body,     setBody]     = useState(EXAMPLE);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<Result | null>(null);
  const [netError, setNetError] = useState<string | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEndpoint(`${window.location.origin}/api/ingest/transactions`);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setNetError(null);

    // Validate JSON before sending
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      setNetError("JSON inválido — corrija a sintaxe antes de enviar.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify(parsed),
      });

      let data: unknown;
      try {
        data = await res.json();
      } catch {
        data = { raw: await res.text().catch(() => "(sem corpo)") };
      }

      setResult({ status: res.status, ok: res.ok, data });
    } catch (err) {
      setNetError(
        err instanceof Error ? err.message : "Falha na requisição de rede."
      );
    } finally {
      setLoading(false);
    }
  }

  const statusColor =
    result === null       ? ""
    : result.ok           ? "text-emerald-700"
    : result.status === 401 ? "text-amber-700"
    : "text-red-700";

  const resultBorder =
    result === null       ? ""
    : result.ok           ? "border-emerald-200 bg-emerald-50"
    : result.status === 401 ? "border-amber-200 bg-amber-50"
    : "border-red-200 bg-red-50";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Teste de Ingestão — n8n
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Envie uma requisição de teste para{" "}
            <code className="font-mono text-sky-600 bg-sky-50 px-1 py-0.5 rounded">
              POST /api/ingest/transactions
            </code>
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100"
        >
          {/* Endpoint */}
          <div className="px-6 py-4 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
              Endpoint
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              required
              spellCheck={false}
            />
          </div>

          {/* API Key */}
          <div className="px-6 py-4 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
              x-api-key
            </label>
            <input
              ref={keyRef}
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="fa-ingest-dev-key-change-in-prod"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          {/* JSON body */}
          <div className="px-6 py-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Corpo (JSON)
              </label>
              <button
                type="button"
                onClick={() => setBody(EXAMPLE)}
                className="text-xs text-sky-500 hover:text-sky-600 font-medium transition-colors"
              >
                Restaurar exemplo
              </button>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent resize-y"
              spellCheck={false}
            />
          </div>

          {/* Submit */}
          <div className="px-6 py-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando…
                </>
              ) : (
                "Testar Requisição"
              )}
            </button>
          </div>
        </form>

        {/* Network error */}
        {netError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-700 mb-0.5">Erro de rede</p>
            <p className="text-sm font-mono text-red-600">{netError}</p>
          </div>
        )}

        {/* Response */}
        {result && (
          <div className={`rounded-xl border px-5 py-4 space-y-3 ${resultBorder}`}>
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-14 h-6 rounded-full text-xs font-bold ${
                  result.ok
                    ? "bg-emerald-100 text-emerald-700"
                    : result.status === 401
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {result.status}
              </span>
              <span className={`text-sm font-semibold ${statusColor}`}>
                {result.ok
                  ? "Sucesso — transação na fila"
                  : result.status === 401
                  ? "Não autorizado — verifique a API key"
                  : "Erro — veja a resposta abaixo"}
              </span>
            </div>

            {/* Response JSON */}
            <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-all bg-white/80 rounded-lg border border-slate-100 px-4 py-3 overflow-auto max-h-64">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Docs reference */}
        <p className="text-xs text-slate-400 text-center pb-4">
          Campos aceitos:{" "}
          <code className="font-mono">description · amount · type · date · category · account</code>
          {" "}— tipo inferido pelo sinal do amount se omitido.
        </p>
      </div>
    </div>
  );
}
