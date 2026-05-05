"use client";
import { useState, useEffect } from "react";
import {
  User, Bell, CreditCard, Download, Shield, Sparkles, Wallet, Check, Tag,
  Plus, Pencil, Trash2, Users, Link2, Copy, RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountModal } from "@/components/modals/AccountModal";
import { CategoryModal } from "@/components/modals/CategoryModal";
import { useFinanceStore } from "@/stores/financeStore";
import { formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { Account, Category, Member } from "@/lib/mock-data";
import type { Household } from "@/lib/household";
import { useNotificationPrefs } from "@/hooks/useHealthScore";

type Tab = "profile" | "members" | "accounts" | "categories" | "notifications" | "ai" | "integrations" | "data";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Perfil",            icon: User       },
  { id: "members",       label: "Membros",            icon: Users      },
  { id: "accounts",      label: "Contas",             icon: CreditCard },
  { id: "categories",    label: "Categorias",         icon: Tag        },
  { id: "notifications", label: "Notificações",       icon: Bell       },
  { id: "ai",            label: "Inteligência Artificial", icon: Sparkles },
  { id: "integrations",  label: "Integrações",        icon: Link2      },
  { id: "data",          label: "Dados e Privacidade", icon: Shield    },
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

function nameInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ACCOUNT_LABELS: Record<string, string> = {
  checking: "Conta Corrente", savings: "Poupança",
  credit: "Crédito",         investment: "Investimentos",
};
const SYSTEM_IDS = new Set(["1","2","3","4","5","6","7","8","9","10"]);

const NOTIF_TYPE_LABELS: Record<string, string> = {
  SCORE_WEEKLY_SUMMARY:        "Resumo semanal de pontuação",
  SCORE_LEVEL_UP:              "Subida de nível",
  STREAK_MILESTONE:            "Marco de sequência",
  STREAK_BROKEN:               "Sequência interrompida",
  BADGE_EARNED:                "Nova conquista",
  BUDGET_ALERT_80:             "Orçamento 80% atingido",
  BUDGET_ALERT_EXCEEDED:       "Orçamento estourado",
  BUDGET_MONTHLY_REVIEW:       "Fechamento mensal de orçamentos",
  MONTHLY_REPORT_READY:        "Relatório mensal pronto",
  SAVINGS_POSITIVE:            "Economia positiva (dia 25)",
  LOW_BALANCE_WARNING:         "Saldo baixo",
  SUBSCRIPTION_DETECTED:       "Nova assinatura detectada",
  SUBSCRIPTION_UNUSED:         "Assinatura não utilizada",
  HOUSEHOLD_EXPENSE_SHARED:    "Gasto compartilhado na Casa",
  HOUSEHOLD_BUDGET_ALERT:      "Orçamento da Casa atingido",
  HOUSEHOLD_SETTLEMENT_DUE:    "Acerto mensal da Casa",
  HOUSEHOLD_SETTLEMENT_CLOSED: "Mês fechado na Casa",
  HOUSEHOLD_MONTHLY_SUMMARY:   "Resumo mensal da Casa",
  COACH_WEEKLY_INSIGHT:        "Insight semanal do consultor",
};

export default function SettingsPage() {
  const {
    accounts, categories, deleteAccount, deleteCategory,
    profile, updateProfile,
    members, addMember, removeMember,
  } = useFinanceStore();

  const [tab, setTab] = useState<Tab>("profile");

  // Profile form state (controlled, synced from store)
  const [profileName,  setProfileName]  = useState(profile.name);
  const [profileEmail, setProfileEmail] = useState(profile.email);
  const [profileSaved, setProfileSaved] = useState(false);

  // Keep local form in sync when switching tabs
  useEffect(() => {
    setProfileName(profile.name);
    setProfileEmail(profile.email);
  }, [profile.name, profile.email]);

  function handleProfileSave() {
    updateProfile({ name: profileName.trim(), email: profileEmail.trim() });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  // Notification toggles (legacy local)
  const [emailAlerts,    setEmailAlerts]    = useState(true);
  const [pushAlerts,     setPushAlerts]     = useState(true);
  const [weeklyDigest,   setWeeklyDigest]   = useState(false);
  const [monthlyReport,  setMonthlyReport]  = useState(true);

  // Notification prefs (persisted) + Telegram connect
  const notifPrefs = useNotificationPrefs();
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLinkLoading, setTelegramLinkLoading] = useState(false);

  function loadTelegramLink() {
    setTelegramLinkLoading(true);
    fetch("/api/users/telegram-link")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { deepLink?: string } | null) => { if (d?.deepLink) setTelegramLink(d.deepLink); })
      .catch(() => {})
      .finally(() => setTelegramLinkLoading(false));
  }
  const [aiEnabled,      setAiEnabled]      = useState(true);
  const [autoSuggest,    setAutoSuggest]    = useState(true);
  const [learnOverrides, setLearnOverrides] = useState(true);

  // Modals
  const [showNewAccount,  setShowNewAccount]  = useState(false);
  const [editingAccount,  setEditingAccount]  = useState<Account | null>(null);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Members
  const [newMemberName,  setNewMemberName]  = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole,  setNewMemberRole]  = useState<"owner" | "member">("member");
  const [memberAdded,    setMemberAdded]    = useState(false);

  function handleAddMember() {
    if (!newMemberName.trim() || !newMemberEmail.trim()) return;
    addMember({ name: newMemberName.trim(), email: newMemberEmail.trim(), role: newMemberRole });
    setNewMemberName(""); setNewMemberEmail(""); setNewMemberRole("member");
    setMemberAdded(true);
    setTimeout(() => setMemberAdded(false), 2000);
  }

  // Household (merge mode)
  const [household,       setHousehold]       = useState<Household | null | undefined>(undefined);
  const [inviteEmail,     setInviteEmail]     = useState("");
  const [inviteUrl,       setInviteUrl]       = useState<string | null>(null);
  const [inviteCopied,    setInviteCopied]    = useState(false);
  const [inviteLoading,   setInviteLoading]   = useState(false);
  const [inviteError,     setInviteError]     = useState("");
  const [leavingHousehold, setLeavingHousehold] = useState(false);

  useEffect(() => {
    if (tab !== "members") return;
    fetch("/api/household")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { household?: Household | null } | null) => {
        setHousehold(d?.household ?? null);
      })
      .catch(() => setHousehold(null));
  }, [tab]);

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true); setInviteError("");
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteeEmail: inviteEmail.trim() }),
      });
      const data = await res.json() as { inviteUrl?: string; error?: string };
      if (!res.ok) { setInviteError(data.error ?? "Erro ao gerar convite."); return; }
      setInviteUrl(data.inviteUrl ?? null);
    } catch {
      setInviteError("Erro de rede.");
    } finally {
      setInviteLoading(false);
    }
  }

  function handleCopyInvite() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    });
  }

  async function handleLeaveHousehold() {
    if (!confirm("Tem certeza que deseja sair da casa compartilhada?")) return;
    setLeavingHousehold(true);
    try {
      await fetch("/api/household/leave", { method: "DELETE" });
      setHousehold(null);
    } finally {
      setLeavingHousehold(false);
    }
  }

  // System config (API key)
  const [sysConfig, setSysConfig] = useState<{ ingestApiKey: string; ingestUrl: string } | null>(null);
  const [keyCopied,  setKeyCopied]  = useState(false);

  useEffect(() => {
    if (tab === "integrations" && !sysConfig) {
      fetch("/api/config", { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setSysConfig(d); })
        .catch(() => {});
    }
  }, [tab, sysConfig]);

  function copyKey() {
    if (!sysConfig?.ingestApiKey) return;
    navigator.clipboard.writeText(sysConfig.ingestApiKey).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  }

  const initials = nameInitials(profile.name || "?");

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências" />

      <div className="flex flex-col @3xl:flex-row gap-6 items-start">
        {/* Tab sidebar */}
        <nav className="w-full @3xl:w-52 shrink-0 flex @3xl:flex-col gap-1 overflow-x-auto pb-1 @3xl:pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 shrink-0 @3xl:w-full h-9 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                tab === id
                  ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
              )}>
              <Icon size={15} className={cn("shrink-0", tab === id ? "text-sky-500" : "text-slate-400 dark:text-slate-500")} />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Profile ── */}
          {tab === "profile" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-6">Informações do Perfil</h2>
              <div className="flex items-center gap-4 pb-5 mb-5 border-b border-slate-100 dark:border-slate-700">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white font-bold text-lg shrink-0 select-none">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {profile.name || <span className="text-slate-400 italic">Nome não definido</span>}
                  </p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    {profile.email || <span className="italic">Email não definido</span>}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 @sm:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nome completo</label>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Fuso horário</label>
                  <input defaultValue="America/Sao_Paulo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Moeda padrão</label>
                  <input defaultValue="BRL — Real Brasileiro"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 dark:focus:border-sky-500 transition-colors" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3">
                {profileSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <Check size={13} /> Alterações salvas
                  </span>
                )}
                <Button size="sm" onClick={handleProfileSave}>Salvar Alterações</Button>
              </div>
            </Card>
          )}

          {/* ── Members ── */}
          {tab === "members" && (
            <>
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Membros da Conta</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Adicione pessoas que compartilham esta conta financeira.
              </p>

              {/* Current members */}
              {members.length > 0 && (
                <div className="space-y-2 mb-6">
                  {members.map((m: Member) => (
                    <div key={m.id}
                      className="group flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {nameInitials(m.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{m.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[11px] font-medium px-2 py-0.5 rounded-full",
                          m.role === "owner"
                            ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                        )}>
                          {m.role === "owner" ? "Dono" : "Membro"}
                        </span>
                        <button onClick={() => removeMember(m.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {members.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6 mb-4">Nenhum membro adicionado ainda.</p>
              )}

              {/* Add member form */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Adicionar novo membro</p>
                <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
                  <input
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 transition-colors"
                  />
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as "owner" | "member")}
                    className="h-9 pl-3 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="member">Membro</option>
                    <option value="owner">Dono</option>
                  </select>
                  <Button size="sm" onClick={handleAddMember} disabled={!newMemberName.trim() || !newMemberEmail.trim()}>
                    <Plus size={13} /> Adicionar
                  </Button>
                  {memberAdded && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Check size={12} /> Membro adicionado
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* ── Casa Compartilhada (Merge mode) ── */}
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Casa Compartilhada</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Una sua conta com a de um parceiro(a) para visualizar as finanças do casal.
              </p>

              {household === undefined && (
                <p className="text-sm text-slate-400 text-center py-4">Carregando...</p>
              )}

              {household !== undefined && household !== null && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50">
                    <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {nameInitials(household.memberName || household.ownerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">{household.name}</p>
                      <p className="text-xs text-sky-600 dark:text-sky-500">
                        {household.ownerName} & {household.memberName} · {Math.round(household.splitRatio * 100)}/{Math.round((1 - household.splitRatio) * 100)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLeaveHousehold}
                    disabled={leavingHousehold}
                    className="text-sm text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                  >
                    {leavingHousehold ? "Saindo…" : "Sair da casa compartilhada"}
                  </button>
                </div>
              )}

              {household !== undefined && household === null && (
                <div className="space-y-4">
                  {!inviteUrl ? (
                    <>
                      <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3">
                        <input
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="Email do(a) parceiro(a)"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/50 focus:border-sky-400 transition-colors"
                        />
                        <Button size="sm" onClick={handleSendInvite} disabled={inviteLoading || !inviteEmail.trim()}>
                          {inviteLoading ? "Gerando…" : "Gerar convite"}
                        </Button>
                      </div>
                      {inviteError && <p className="text-xs text-red-500">{inviteError}</p>}
                    </>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        Envie este link para {inviteEmail}:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                          {inviteUrl}
                        </code>
                        <button
                          onClick={handleCopyInvite}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          {inviteCopied ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                        </button>
                      </div>
                      <button
                        onClick={() => { setInviteUrl(null); setInviteEmail(""); }}
                        className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        Gerar novo convite
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Card>
            </>
          )}

          {/* ── Accounts ── */}
          {tab === "accounts" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Contas Vinculadas</h2>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                    {accounts.length} conta{accounts.length !== 1 ? "s" : ""} cadastrada{accounts.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowNewAccount(true)}>
                  <Plus size={13} /> Nova Conta
                </Button>
              </div>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id}
                    className="group flex items-center justify-between px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0">
                        {acc.type === "credit" ? <CreditCard size={13} className="text-slate-400" /> : <Wallet size={13} className="text-slate-400" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{acc.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {acc.institution}{acc.institution ? " · " : ""}{ACCOUNT_LABELS[acc.type] ?? acc.type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("text-sm font-semibold tabular-nums",
                        acc.balance < 0 ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white")}>
                        {formatBRL(acc.balance)}
                      </span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingAccount(acc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => deleteAccount(acc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {accounts.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Nenhuma conta cadastrada.</p>
                )}
              </div>
            </Card>
          )}

          {/* ── Categories ── */}
          {tab === "categories" && (
            <Card>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">Categorias</h2>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                    {categories.length} categorias · {categories.filter((c) => !SYSTEM_IDS.has(c.id)).length} personalizadas
                  </p>
                </div>
                <Button size="sm" onClick={() => setShowNewCategory(true)}>
                  <Plus size={13} /> Nova Categoria
                </Button>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mb-2">
                  Categorias do sistema
                </p>
                {categories.filter((c) => SYSTEM_IDS.has(c.id)).map((cat) => (
                  <div key={cat.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: cat.color + "20" }}>
                      {cat.icon}
                    </span>
                    <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                    <span className="text-[11px] text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded-full">
                      Sistema
                    </span>
                  </div>
                ))}
                {categories.filter((c) => !SYSTEM_IDS.has(c.id)).length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1 mt-4 mb-2">
                      Suas categorias
                    </p>
                    {categories.filter((c) => !SYSTEM_IDS.has(c.id)).map((cat) => (
                      <div key={cat.id}
                        className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: cat.color + "20" }}>
                          {cat.icon}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-200">{cat.name}</span>
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: cat.color }} />
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingCategory(cat)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => deleteCategory(cat.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          )}

          {/* ── Notifications ── */}
          {tab === "notifications" && (
            <>
              {/* Telegram Connect */}
              <Card>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Telegram</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Conecte seu Telegram para receber alertas de orçamento, pontuação e resumos da Casa.
                </p>
                {notifPrefs.loading ? (
                  <p className="text-sm text-slate-400">Carregando...</p>
                ) : notifPrefs.data?.telegramConnected ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <Check size={15} />
                    Telegram conectado — você receberá notificações via bot.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {!telegramLink ? (
                      <Button size="sm" onClick={loadTelegramLink} disabled={telegramLinkLoading}>
                        {telegramLinkLoading ? "Gerando link…" : "Conectar Telegram"}
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Clique no link abaixo para abrir o bot e concluir a conexão:
                        </p>
                        <a
                          href={telegramLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-sky-500 hover:text-sky-600 underline transition-colors"
                        >
                          Abrir bot no Telegram →
                        </a>
                        <p className="text-xs text-slate-400">O link expira em 1 hora.</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Notification type toggles */}
              {notifPrefs.data && (
                <Card>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Tipos de notificação</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    Controle quais eventos geram notificações.
                  </p>
                  {Object.entries(notifPrefs.data.prefs.types).map(([type, enabled]) => (
                    <SettingRow
                      key={type}
                      label={NOTIF_TYPE_LABELS[type] ?? type}
                      description=""
                      enabled={enabled}
                      onChange={(v) => notifPrefs.update({ types: { [type]: v } })}
                    />
                  ))}
                </Card>
              )}

              {/* Legacy local toggles */}
              <Card>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Preferências de Notificação</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Escolha como e quando deseja ser notificado.</p>
                <SettingRow label="Alertas de gastos por email"
                  description="Receba emails quando suas despesas mensais ultrapassarem sua receita."
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
            </>
          )}

          {/* ── AI ── */}
          {tab === "ai" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Inteligência Artificial</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Configure como a IA categoriza e analisa suas finanças.</p>
              <div className="mb-5 px-4 py-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-start gap-3">
                <Sparkles size={15} className="text-sky-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-sky-800 dark:text-sky-300">Powered by Claude Sonnet 4.6</p>
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

          {/* ── Integrations ── */}
          {tab === "integrations" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Integrações</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                Conecte ferramentas externas como n8n para importar transações automaticamente.
              </p>

              {/* n8n section */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 flex items-center gap-3">
                  <RefreshCw size={15} className="text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Ingestão via n8n</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      Envie transações de qualquer automação usando uma chave de API estática.
                    </p>
                  </div>
                </div>

                <div className="px-5 py-4 space-y-4">
                  {/* Endpoint */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Endpoint</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                        POST {typeof window !== "undefined" ? window.location.origin : ""}/api/ingest/transactions
                      </code>
                    </div>
                  </div>

                  {/* API key */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chave de API</p>
                    {sysConfig ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                          {sysConfig.ingestApiKey}
                        </code>
                        <button onClick={copyKey}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                          {keyCopied ? <><Check size={11} className="text-emerald-500" /> Copiado</> : <><Copy size={11} /> Copiar</>}
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-400 italic">
                        Carregando…
                      </div>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Envie no header: <code className="text-slate-600 dark:text-slate-400">x-api-key: &lt;chave&gt;</code>
                    </p>
                  </div>

                  {/* Payload example */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Exemplo de payload (JSON)</p>
                    <pre className="px-3 py-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto">{`[
  {
    "user_email": "usuario@email.com",
    "description": "Supermercado Extra",
    "amount": 387.50,
    "type": "expense",
    "date": "2026-04-28",
    "category": "Alimentação",
    "account": "Conta Corrente"
  }
]`}</pre>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      <code className="text-slate-500">user_email</code> ou <code className="text-slate-500">username</code> identifica o usuário destino. Omita para usar o usuário padrão.
                    </p>
                  </div>

                  <div className="pt-1 text-xs text-slate-400 dark:text-slate-500">
                    Para alterar a chave, defina a variável de ambiente <code className="text-slate-500">INGEST_API_KEY</code> e reinicie o servidor.
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Data & Privacy ── */}
          {tab === "data" && (
            <Card>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-1">Dados e Privacidade</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Controle seus dados em conformidade com a LGPD.</p>
              <div className="space-y-3">
                <div className="flex items-start justify-between px-4 py-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Exportar meus dados</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Baixe todos os seus dados em formato JSON (Art. 18 LGPD).</p>
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

      <AccountModal  open={showNewAccount}   onClose={() => setShowNewAccount(false)} />
      <AccountModal  open={!!editingAccount}  onClose={() => setEditingAccount(null)}  initial={editingAccount ?? undefined} />
      <CategoryModal open={showNewCategory}  onClose={() => setShowNewCategory(false)} />
      <CategoryModal open={!!editingCategory} onClose={() => setEditingCategory(null)} initial={editingCategory ?? undefined} />
    </div>
  );
}
