import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { findByUsername } from "@/lib/users";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { username, password, rememberMe = false } = body as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (!username || !password) {
    return NextResponse.json({ error: "Usuário e senha são obrigatórios" }, { status: 400 });
  }

  const user = await findByUsername(username);
  if (!user || user.password !== password) {
    return NextResponse.json({ error: "Usuário ou senha incorretos" }, { status: 401 });
  }

  const expirationTime = rememberMe ? "30d" : "8h";
  const maxAgeSec      = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

  const token = await new SignJWT({
    sub:      user.id,
    email:    user.email,
    name:     user.name,
    tenantId: user.tenantId,
    isAdmin:  user.isAdmin ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin ?? false },
  });

  res.cookies.set("financeapp_session", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
