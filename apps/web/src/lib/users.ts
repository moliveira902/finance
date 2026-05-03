import { isKvConfigured, kvGet, kvSet } from "@/lib/kv-store";

export interface AppUser {
  id: string;
  username: string;
  password: string;
  email: string;
  name: string;
  tenantId: string;
  isAdmin?: boolean;
  createdAt: string;
}

export interface PendingRegistration {
  name: string;
  email: string;
  password: string;
  expiresAt: number;
}

// ── Built-in users (always available) ────────────────────────────────────────

export const PRIMARY_USER: AppUser = {
  id:        "00000000-0000-0000-0000-000000000002",
  username:  "user",
  password:  "pass",
  email:     "user@demo.financeapp.com.br",
  name:      "Demo User",
  tenantId:  "00000000-0000-0000-0000-000000000001",
  createdAt: "2024-01-01T00:00:00.000Z",
};

export const ADMIN_USER: AppUser = {
  id:        "00000000-0000-0000-0000-000000000000",
  username:  "admin",
  password:  "pass",
  email:     "admin@demo.financeapp.com.br",
  name:      "Admin",
  tenantId:  "00000000-0000-0000-0000-000000000001",
  isAdmin:   true,
  createdAt: "2024-01-01T00:00:00.000Z",
};

const BUILTIN: AppUser[] = [PRIMARY_USER, ADMIN_USER];

// ── KV-backed dynamic user registry ──────────────────────────────────────────

const REGISTRY_KEY = "users:registry";

async function getDynamicUsers(): Promise<AppUser[]> {
  if (!isKvConfigured()) return [];
  try {
    const list = await kvGet<AppUser[]>(REGISTRY_KEY);
    return list ?? [];
  } catch { return []; }
}

async function saveDynamicUsers(users: AppUser[]): Promise<void> {
  if (!isKvConfigured()) return;
  await kvSet(REGISTRY_KEY, users);
}

export async function getAllUsers(): Promise<AppUser[]> {
  return [...BUILTIN, ...(await getDynamicUsers())];
}

export async function findByUsername(username: string): Promise<AppUser | null> {
  const lower = username.toLowerCase();
  const all   = await getAllUsers();
  return all.find((u) => u.username.toLowerCase() === lower) ?? null;
}

export async function findByEmail(email: string): Promise<AppUser | null> {
  const lower = email.toLowerCase();
  const all   = await getAllUsers();
  return all.find((u) => u.email.toLowerCase() === lower) ?? null;
}

export async function createUser(user: AppUser): Promise<void> {
  const dynamic = await getDynamicUsers();
  await saveDynamicUsers([...dynamic, user]);
}

export async function deleteUser(id: string): Promise<void> {
  const dynamic = await getDynamicUsers();
  await saveDynamicUsers(dynamic.filter((u) => u.id !== id));
}

// ── Pending email verifications ───────────────────────────────────────────────

function pendingKey(token: string) { return `pending:${token}`; }

export async function savePending(token: string, reg: PendingRegistration): Promise<void> {
  if (!isKvConfigured()) {
    // dev fallback: just log
    console.log(`[EMAIL-VERIFY DEV] token=${token}`, reg);
    return;
  }
  await kvSet(pendingKey(token), reg);
}

export async function getPending(token: string): Promise<PendingRegistration | null> {
  if (!isKvConfigured()) return null;
  try {
    return await kvGet<PendingRegistration>(pendingKey(token));
  } catch { return null; }
}

export async function deletePending(token: string): Promise<void> {
  if (!isKvConfigured()) return;
  const { kv } = await import("@vercel/kv");
  await kv.del(pendingKey(token));
}

export function storeFilePath(userId: string): string {
  return `/tmp/fa_${userId.replace(/\W/g, "_")}.json`;
}
