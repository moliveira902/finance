import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { findByEmail, findByUsername, savePending } from "@/lib/users";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { name, email, password } = body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailLower)) {
    return NextResponse.json({ error: "E-mail inválido" }, { status: 400 });
  }

  // Check duplicates
  const existingByEmail    = await findByEmail(emailLower);
  const existingByUsername = await findByUsername(emailLower);
  if (existingByEmail || existingByUsername) {
    return NextResponse.json({ error: "Este e-mail já está cadastrado" }, { status: 409 });
  }

  const token = randomUUID();
  await savePending(token, {
    name:      name.trim(),
    email:     emailLower,
    password,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });

  try {
    await sendVerificationEmail(emailLower, name.trim(), token);
  } catch (err) {
    console.error("[register] email send failed:", err);
    // Don't fail registration — dev mode will log the link
  }

  return NextResponse.json({ ok: true });
}
