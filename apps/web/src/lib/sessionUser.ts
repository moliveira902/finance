import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isAdmin?: boolean;
}

export async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match  = cookie.match(/financeapp_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    const id = payload.sub as string;
    if (!id) return null;
    return {
      id,
      name:    (payload.name    as string)   ?? "",
      email:   (payload.email   as string)   ?? "",
      isAdmin: (payload.isAdmin as boolean)  ?? false,
    };
  } catch {
    return null;
  }
}
