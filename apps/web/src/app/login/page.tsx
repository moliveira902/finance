"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Wallet, TrendingUp, Sparkles, Shield, CheckCircle } from "lucide-react";

const FEATURES = [
  { icon: TrendingUp, title: "Análise inteligente", desc: "Relatórios automáticos de receitas, despesas e tendências mensais." },
  { icon: Sparkles,   title: "IA integrada",         desc: "Categorização de transações em tempo real com Claude Sonnet." },
  { icon: Shield,     title: "Segurança total",       desc: "Dados criptografados e conformidade com LGPD." },
];

type Tab = "login" | "register";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const verified     = searchParams.get("verified") === "1";
  const tokenError   = searchParams.get("error");

  const [tab, setTab]                   = useState<Tab>("login");
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  // Register fields
  const [regName,     setRegName]     = useState("");
  const [regEmail,    setRegEmail]    = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm,  setRegConfirm]  = useState("");
  const [showReg,     setShowReg]     = useState(false);
  const [regSuccess,  setRegSuccess]  = useState(false);

  function switchTab(t: Tab) {
    setTab(t);
    setError("");
    setRegSuccess(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      });
      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Erro ao fazer login");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (regPassword !== regConfirm) {
      setError("As senhas não coincidem");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegSuccess(true);
      } else {
        setError(data.error ?? "Erro ao criar conta");
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const errorFromUrl =
    tokenError === "expired_token" ? "O link de verificação expirou. Crie a conta novamente." :
    tokenError === "invalid_token" ? "Link inválido. Tente criar a conta novamente." : "";

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left branding panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-slate-900 to-sky-950 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Wallet size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">FinanceApp</span>
        </div>

        <div className="space-y-10">
          <div>
            <h1 className="text-[2.5rem] font-bold leading-[1.15] text-white">
              Gerencie suas finanças{" "}
              <span className="text-sky-400">com inteligência</span>
            </h1>
            <p className="text-slate-400 mt-4 text-base leading-relaxed">
              Plataforma completa para controle financeiro pessoal — transações recorrentes, relatórios e IA para categorização automática.
            </p>
          </div>
          <div className="space-y-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                  <Icon size={17} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-600">© 2026 FinanceApp · Brasil</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white">FinanceApp</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl shadow-black/20 p-8">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-7">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchTab(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    tab === t
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            {/* URL-based alerts */}
            {verified && tab === "login" && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700 mb-4">
                <CheckCircle size={15} className="shrink-0 mt-0.5" />
                E-mail confirmado! Faça login para acessar sua conta.
              </div>
            )}
            {errorFromUrl && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 mb-4">
                <span className="shrink-0 mt-0.5">⚠</span>
                {errorFromUrl}
              </div>
            )}

            {/* ── Login form ── */}
            {tab === "login" && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Usuário ou e-mail</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Seu usuário"
                    autoComplete="username"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-slate-300 bg-white peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-colors flex items-center justify-center">
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-slate-600">Manter conectado por 30 dias</span>
                </label>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-2.5 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Entrando…
                    </>
                  ) : "Entrar"}
                </button>
              </form>
            )}

            {/* ── Register form ── */}
            {tab === "register" && !regSuccess && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Nome completo</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome"
                    autoComplete="name"
                    autoFocus
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">E-mail</label>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  <div className="relative">
                    <input
                      type={showReg ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReg((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                    >
                      {showReg ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">Confirmar senha</label>
                  <input
                    type={showReg ? "text" : "password"}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-1 py-2.5 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Criando conta…
                    </>
                  ) : "Criar conta"}
                </button>
              </form>
            )}

            {/* ── Register success state ── */}
            {tab === "register" && regSuccess && (
              <div className="text-center space-y-4 py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Verifique seu e-mail</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Enviamos um link de confirmação para <strong>{regEmail}</strong>.<br />
                    Clique no link para ativar sua conta.
                  </p>
                </div>
                <button
                  onClick={() => switchTab("login")}
                  className="text-sm text-sky-500 hover:text-sky-600 font-medium transition-colors"
                >
                  Voltar para o login
                </button>
              </div>
            )}

            {/* Demo hint — only on login tab */}
            {tab === "login" && (
              <div className="mt-6 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
                  Acesso demonstração
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>
                    Usuário{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">user</code>
                  </span>
                  <span>
                    Senha{" "}
                    <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">pass</code>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
