/**
 * User registry shared by auth and ingest routes.
 *
 * To add users, set the INGEST_USERS env var in Vercel as a JSON string:
 *   '{"alice":"uuid-for-alice","bob":"uuid-for-bob"}'
 *
 * Usernames are matched case-insensitively.
 */

export interface AppUser {
  id: string;
  username: string;
  password: string; // plain-text for demo; replace with hash in production
  email: string;
  name: string;
  tenantId: string;
}

// Primary demo user — always present
export const PRIMARY_USER: AppUser = {
  id:       "00000000-0000-0000-0000-000000000002",
  username: "user",
  password: "pass",
  email:    "user@demo.financeapp.com.br",
  name:     "Demo User",
  tenantId: "00000000-0000-0000-0000-000000000001",
};

// Additional users can be injected via USERS_JSON env var:
// '[{"id":"...","username":"bob","password":"pass2","email":"bob@...","name":"Bob","tenantId":"..."}]'
function loadExtraUsers(): AppUser[] {
  const raw = process.env.USERS_JSON;
  if (!raw) return [];
  try { return JSON.parse(raw) as AppUser[]; } catch { return []; }
}

export const ALL_USERS: AppUser[] = [PRIMARY_USER, ...loadExtraUsers()];

/** Find a user by username (case-insensitive). Returns undefined if not found. */
export function findByUsername(username: string): AppUser | undefined {
  const lower = username.toLowerCase();
  return ALL_USERS.find((u) => u.username.toLowerCase() === lower);
}

/** Resolve a username to a user ID. Falls back to the primary user if username is omitted. */
export function resolveUserId(username?: string): string | null {
  if (!username) return PRIMARY_USER.id;
  return findByUsername(username)?.id ?? null;
}

/** Absolute path to a user's /tmp store file. */
export function storeFilePath(userId: string): string {
  return `/tmp/fa_${userId.replace(/\W/g, "_")}.json`;
}
