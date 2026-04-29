import { NextResponse } from "next/server";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

const DEMO_USER = {
  id: "00000000-0000-0000-0000-000000000002",
  tenantId: "00000000-0000-0000-0000-000000000001",
  email: "user@demo.financeapp.com.br",
  name: "Demo User",
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { username, password, rememberMe = false } = body as {
    username?: string;
    password?: string;
    rememberMe?: boolean;
  };

  if (username !== "user" || password !== "pass") {
    return NextResponse.json(
      { error: "Usuário ou senha incorretos" },
      { status: 401 }
    );
  }

  const expirationTime = rememberMe ? "30d" : "8h";
  const maxAgeSec = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 8;

  const token = await new SignJWT({
    sub: DEMO_USER.id,
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    tenantId: DEMO_USER.tenantId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(JWT_SECRET);

  const res = NextResponse.json({
    ok: true,
    user: { id: DEMO_USER.id, email: DEMO_USER.email, name: DEMO_USER.name },
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
