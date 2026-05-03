import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getAllUsers, createUser, deleteUser, findByEmail } from "@/lib/users";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get("financeapp_session")?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
    return payload.isAdmin === true;
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }
  const users = await getAllUsers();
  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id, username: u.username, email: u.email,
      name: u.name, tenantId: u.tenantId, isAdmin: u.isAdmin, createdAt: u.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, email, password, isAdmin = false } = body as {
    name?: string; email?: string; password?: string; isAdmin?: boolean;
  };

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  if (await findByEmail(emailLower)) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const userId = randomUUID();
  await createUser({
    id:        userId,
    username:  emailLower,
    password,
    email:     emailLower,
    name:      name.trim(),
    tenantId:  randomUUID(),
    isAdmin,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: userId }, { status: 201 });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  // Prevent deleting built-in users
  const BUILTIN_IDS = [
    "00000000-0000-0000-0000-000000000000",
    "00000000-0000-0000-0000-000000000002",
  ];
  if (BUILTIN_IDS.includes(id)) {
    return NextResponse.json({ error: "Não é possível excluir usuários padrão" }, { status: 400 });
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
