"use client";
import { useEffect, useState } from "react";
import { Trash2, UserPlus, Shield, User, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface UserRow {
  id: string;
  username: string;
  email: string;
  name: string;
  isAdmin?: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin,  setIsAdmin]  = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) setUsers((await res.json()).users);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, isAdmin }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Usuário criado com sucesso.");
        setName(""); setEmail(""); setPassword(""); setIsAdmin(false);
        fetchUsers();
      } else {
        setError(data.error ?? "Erro ao criar usuário");
      }
    } catch {
      setError("Erro de conexão.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este usuário?")) return;
    setError(""); setSuccess("");
    const res = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (res.ok) { setSuccess("Usuário excluído."); fetchUsers(); }
    else setError(data.error ?? "Erro ao excluir");
  }

  const BUILTIN_IDS = [
    "00000000-0000-0000-0000-000000000000",
    "00000000-0000-0000-0000-000000000002",
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Gerenciar Usuários" subtitle="Crie, visualize e exclua usuários do sistema." />

      {/* Create user form */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <UserPlus size={15} className="text-sky-500" /> Novo usuário
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nome</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Nome completo"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">E-mail</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="email@exemplo.com"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Senha</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div className="relative">
                <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="sr-only peer" />
                <div className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-colors flex items-center justify-center">
                  {isAdmin && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-slate-700 dark:text-slate-300">Administrador</span>
            </label>
          </div>

          {error && (
            <div className="@xl:col-span-2 flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-sm text-red-600 dark:text-red-400">
              <span className="shrink-0 mt-0.5">⚠</span> {error}
            </div>
          )}
          {success && (
            <div className="@xl:col-span-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-sm text-emerald-700 dark:text-emerald-400">
              {success}
            </div>
          )}

          <div className="@xl:col-span-2">
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Criar usuário
            </button>
          </div>
        </form>
      </Card>

      {/* User list */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Usuários cadastrados
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.name}</p>
                      {u.isAdmin
                        ? <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full"><Shield size={9} /> Admin</span>
                        : <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full"><User size={9} /> Usuário</span>
                      }
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{u.email}</p>
                  </div>
                </div>
                {!BUILTIN_IDS.includes(u.id) && (
                  <button
                    onClick={() => handleDelete(u.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Excluir usuário"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
