import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { SignJWT } from "jose";
import { getPending, deletePending, findByEmail, createUser } from "@/lib/users";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export async function GET(request: Request) {
  const url   = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
  }

  const pending = await getPending(token);
  if (!pending) {
    return NextResponse.redirect(new URL("/login?error=expired_token", request.url));
  }
  if (pending.expiresAt < Date.now()) {
    await deletePending(token);
    return NextResponse.redirect(new URL("/login?error=expired_token", request.url));
  }

  // Guard against double-submission
  const existing = await findByEmail(pending.email);
  if (existing) {
    await deletePending(token);
    return NextResponse.redirect(new URL("/login?verified=1", request.url));
  }

  const userId   = randomUUID();
  const tenantId = randomUUID();

  await createUser({
    id:        userId,
    username:  pending.email,
    password:  pending.password,
    email:     pending.email,
    name:      pending.name,
    tenantId,
    isAdmin:   false,
    createdAt: new Date().toISOString(),
  });
  await deletePending(token);

  // Auto-login
  const jwtToken = await new SignJWT({
    sub:      userId,
    email:    pending.email,
    name:     pending.name,
    tenantId,
    isAdmin:  false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(JWT_SECRET);

  const res = NextResponse.redirect(new URL("/dashboard", request.url));
  res.cookies.set("financeapp_session", jwtToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === "production",
  });

  return res;
}
