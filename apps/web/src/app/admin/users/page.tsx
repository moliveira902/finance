"use client";
import { useEffect, useState } from "react";
import { Trash2, UserPlus, Shield, User, Loader2, Pencil, X, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

interface UserRow {
  id: string;
  username: string;
  email: string;
  password: string;
  name: string;
  isAdmin?: boolean;
  createdAt: string;
}

const INPUT_CLS = "w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 transition-colors";

const BUILTIN_IDS = [
  "00000000-0000-0000-0000-000000000000",
  "00000000-0000-0000-0000-000000000002",
];

interface EditState {
  name: string;
  email: string;
  username: string;
  password: string;
}

export default function AdminUsersPage() {
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  // Create form
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin,  setIsAdmin]  = useState(false);

  // Inline edit
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editState,    setEditState]    = useState<EditState>({ name: "", email: "", username: "", password: "" });
  const [editSaving,   setEditSaving]   = useState(false);
  const [editError,    setEditError]    = useState("");

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
        body: JSON.stringify({ name, email, username, password, isAdmin }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Usuário criado com sucesso.");
        setName(""); setEmail(""); setUsername(""); setPassword(""); setIsAdmin(false);
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

  function startEdit(u: UserRow) {
    setEditingId(u.id);
    setEditState({ name: u.name, email: u.email, username: u.username, password: u.password });
    setEditError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditError("");
  }

  async function handleSaveEdit(id: string) {
    setEditError("");
    setEditSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...editState }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setSuccess("Usuário atualizado.");
        fetchUsers();
      } else {
        setEditError(data.error ?? "Erro ao atualizar");
      }
    } catch {
      setEditError("Erro de conexão.");
    } finally {
      setEditSaving(false);
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

  return (
    <div className="space-y-6">
      <PageHeader title="Gerenciar Usuários" subtitle="Crie, edite e exclua usuários do sistema." />

      {/* Create form */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
          <UserPlus size={15} className="text-sky-500" /> Novo usuário
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nome completo</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="Nome completo" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              placeholder="email@exemplo.com" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Nome de usuário</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required
              placeholder="Ex: joao.silva" autoComplete="off" className={INPUT_CLS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Senha</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} placeholder="Mínimo 6 caracteres" className={INPUT_CLS} />
          </div>

          {/* Profile selector */}
          <div className="@xl:col-span-2">
            <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-2">Perfil</label>
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsAdmin(false)}
                className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  !isAdmin
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}>
                <User size={15} />
                <div className="text-left">
                  <p className="font-semibold">Usuário</p>
                  <p className="text-[11px] opacity-70">Acesso padrão — sem gestão de usuários</p>
                </div>
              </button>
              <button type="button" onClick={() => setIsAdmin(true)}
                className={`flex-1 flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  isAdmin
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                    : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}>
                <Shield size={15} />
                <div className="text-left">
                  <p className="font-semibold">Administrador</p>
                  <p className="text-[11px] opacity-70">Acesso total — pode gerenciar usuários</p>
                </div>
              </button>
            </div>
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
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
              Criar usuário
            </button>
          </div>
        </form>
      </Card>

      {/* User list */}
      <Card>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
          Usuários cadastrados ({users.length})
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" /> Carregando…
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {users.map((u) => (
              <div key={u.id}>
                {/* Normal row */}
                {editingId !== u.id ? (
                  <div className="flex items-center justify-between py-3 gap-4 group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.name}</p>
                          {u.isAdmin
                            ? <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded-full shrink-0"><Shield size={9} /> Admin</span>
                            : <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 px-1.5 py-0.5 rounded-full shrink-0"><User size={9} /> Usuário</span>
                          }
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          @{u.username} · {u.email}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          Senha: <code className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded text-[11px]">{u.password}</code>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                        title="Editar usuário">
                        <Pencil size={14} />
                      </button>
                      {!BUILTIN_IDS.includes(u.id) && (
                        <button onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Excluir usuário">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Inline edit row */
                  <div className="py-4 space-y-3">
                    <p className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wide">
                      Editando: {u.name}
                    </p>
                    <div className="grid grid-cols-1 @xl:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nome</label>
                        <input value={editState.name}
                          onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value }))}
                          className={INPUT_CLS} placeholder="Nome completo" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">E-mail</label>
                        <input type="email" value={editState.email}
                          onChange={(e) => setEditState((s) => ({ ...s, email: e.target.value }))}
                          className={INPUT_CLS} disabled={BUILTIN_IDS.includes(u.id)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nome de usuário</label>
                        <input value={editState.username}
                          onChange={(e) => setEditState((s) => ({ ...s, username: e.target.value }))}
                          className={INPUT_CLS} disabled={BUILTIN_IDS.includes(u.id)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Nova senha</label>
                        <input type="text" value={editState.password}
                          onChange={(e) => setEditState((s) => ({ ...s, password: e.target.value }))}
                          className={INPUT_CLS} placeholder="Nova senha" />
                      </div>
                    </div>
                    {editError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <span>⚠</span> {editError}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSaveEdit(u.id)} disabled={editSaving}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60">
                        {editSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Salvar
                      </button>
                      <button onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                        <X size={12} /> Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
