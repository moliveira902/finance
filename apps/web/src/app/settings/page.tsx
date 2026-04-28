"use client";
import { useState } from "react";
import { User, Bell, CreditCard, Download, Shield, Sparkles, Wallet, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { accounts, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Tab = "profile" | "notifications" | "accounts" | "ai" | "data";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Perfil",                icon: User       },
  { id: "notifications", label: "Notificações",          icon: Bell       },
  { id: "accounts",      label: "Contas",                icon: CreditCard },
  { id: "ai",            label: "Inteligência Artificial",icon: Sparkles  },
  { id: "data",          label: "Dados e Privacidade",   icon: Shield     },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        "relative rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900 shrink-0",
        enabled ? "bg-sky-500" : "bg-slate-200 dark:bg-slate-700"
      )}
      style={{ width: 40, height: 22 }}
    >
      <span className={cn(
        "absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200",
        enabled ? "left-[22px]" : "left-[3px]"
      )} />
    </button>
  );
}

function SettingRow({ label, description, enabled, onChange }: {
  label: string; description: string; enabled: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
      <div className="pr-6 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
      </div>
      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

function FormField({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      <input defaultValue={defaultValue}
        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors" />
    </div>
  );
}

const ACCOUNT_LABELS: Record<string, string> = {
  checking: "Conta Corrente", savings: "Poupança",
  credit: "Crédito",         investment: "Investimentos",
};

export default function SettingsPage() {
  const [tab,           setTab]           = useState<Tab>("profile");
  const [saved,         setSaved]         = useState(false);
  const [emailAlerts,   setEmailAlerts]   = useState(true);
  const [pushAlerts,    setPushAlerts]    = useState(true);
  const [weeklyDigest,  setWeeklyDigest]  = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(true);
  const [aiEnabled,     setAiEnabled]     = useState(true);
  const [autoSuggest,   setAutoSuggest]   = useState(true);
  const [learnOverrides,setLearnOverrides]= useState(true);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="flex gap-6 items-start">
        {/* Tab sidebar */}
        <nav className="w-52 shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-3 w-full h-9 px-3 rounded-lg text-sm font-medium transition-colors",
                tab === id
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              )}>
              <Icon size={15} className={cn("shrink-0", tab === id ? "text-sky-500" : "text-slate-400 dark:text-slate-500")} />
              {label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === "profile" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Informações do Perfil</h2>
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-100 dark:border-slate-700">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  MO
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Matheus Oliveira</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">moliveira902@gmail.com</p>
                  <button className="text-xs text-sky-500 hover:text-sky-600 mt-1 font-medium transition-colors">Alterar foto</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <FormField label="Nome completo"  defaultValue="Matheus Oliveira"       />
                <FormField label="Email"          defaultValue="moliveira902@gmail.com" />
                <FormField label="Fuso horário"   defaultValue="America/Sao_Paulo"      />
                <FormField label="Moeda padrão"   defaultValue="BRL — Real Brasileiro"  />
              </div>
              <div className="flex items-center justify-end gap-3">
                {saved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check size={13} /> Alterações salvas
                  </span>
                )}
                <Button size="sm" onClick={handleSave}>Salvar Alterações</Button>
              </div>
            </Card>
          )}

          {tab === "notifications" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Preferências de Notificação</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Escolha como e quando deseja ser notificado.</p>
              <SettingRow label="Alertas de orçamento por email"
                description="Receba emails ao atingir 80% e 100% de cada orçamento."
                enabled={emailAlerts}   onChange={setEmailAlerts} />
              <SettingRow label="Push notifications"
                description="Alertas instantâneos no dispositivo para eventos importantes."
                enabled={pushAlerts}    onChange={setPushAlerts} />
              <SettingRow label="Resumo semanal"
                description="Email toda segunda-feira com o resumo da semana anterior."
                enabled={weeklyDigest}  onChange={setWeeklyDigest} />
              <SettingRow label="Relatório mensal"
                description="Receba o relatório completo no início de cada mês."
                enabled={monthlyReport} onChange={setMonthlyReport} />
            </Card>
          )}

          {tab === "accounts" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contas Vinculadas</h2>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{accounts.length} contas cadastradas</p>
                </div>
                <Button size="sm"><Wallet size={13} /> Nova Conta</Button>
              </div>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id}
                    className="flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{acc.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {acc.institution} · {ACCOUNT_LABELS[acc.type] ?? acc.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-sm font-semibold tabular-nums",
                        acc.balance < 0 ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white")}>
                        {formatBRL(acc.balance)}
                      </span>
                      <button className="text-xs text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium">
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {tab === "ai" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Inteligência Artificial</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Configure como a IA categoriza e analisa suas finanças.</p>
              <div className="mb-5 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-start gap-3">
                <Sparkles size={15} className="text-sky-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Powered by Claude claude-sonnet-4-6</p>
                  <p className="text-xs text-sky-600 dark:text-sky-500 mt-0.5">Precisão de 95%+ em categorização de transações brasileiras.</p>
                </div>
              </div>
              <SettingRow label="Categorização automática"
                description="Categoriza novas transações automaticamente ao serem adicionadas."
                enabled={aiEnabled}      onChange={setAiEnabled} />
              <SettingRow label="Sugestões durante cadastro"
                description="Exibe sugestões de categoria enquanto você digita a descrição."
                enabled={autoSuggest}    onChange={setAutoSuggest} />
              <SettingRow label="Aprender com correções"
                description="A IA melhora com cada correção de categoria que você fizer."
                enabled={learnOverrides} onChange={setLearnOverrides} />
            </Card>
          )}

          {tab === "data" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Dados e Privacidade</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Controle seus dados em conformidade com a LGPD.</p>
              <div className="space-y-3">
                <div className="flex items-start justify-between px-4 py-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Exportar meus dados</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Baixe todos os seus dados em formato JSON/CSV (Art. 18 LGPD).</p>
                  </div>
                  <Button variant="secondary" size="sm"><Download size={13} /> Exportar</Button>
                </div>
                <div className="flex items-start justify-between px-4 py-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Histórico de consentimentos</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Veja todos os termos aceitos e suas datas.</p>
                  </div>
                  <Button variant="secondary" size="sm">Ver histórico</Button>
                </div>
                <div className="flex items-start justify-between px-4 py-4 rounded-xl border border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30">
                  <div>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-400">Excluir conta</p>
                    <p className="text-xs text-red-400 dark:text-red-500 mt-0.5">Remove permanentemente todos os seus dados. Esta ação é irreversível.</p>
                  </div>
                  <Button variant="danger" size="sm">Excluir conta</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
