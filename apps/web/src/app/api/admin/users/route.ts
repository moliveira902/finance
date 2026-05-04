import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { getAllUsers, createUser, deleteUser, findByEmail, findByUsername } from "@/lib/users";
import type { AppUser } from "@/lib/users";
import { isKvConfigured, kvGet, kvSet } from "@/lib/kv-store";

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
      id: u.id, username: u.username, email: u.email, password: u.password,
      name: u.name, tenantId: u.tenantId, isAdmin: u.isAdmin, createdAt: u.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, email, username, password, isAdmin = false } = body as {
    name?: string; email?: string; username?: string; password?: string; isAdmin?: boolean;
  };

  if (!name || !email || !username || !password) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios" }, { status: 400 });
  }

  const emailLower    = email.toLowerCase().trim();
  const usernameLower = username.toLowerCase().trim();

  if (await findByEmail(emailLower)) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }
  if (await findByUsername(usernameLower)) {
    return NextResponse.json({ error: "Nome de usuário já está em uso" }, { status: 409 });
  }

  const userId = randomUUID();
  await createUser({
    id:        userId,
    username:  usernameLower,
    password,
    email:     emailLower,
    name:      name.trim(),
    tenantId:  randomUUID(),
    isAdmin,
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, id: userId }, { status: 201 });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { id, name, email, username, password } = body as {
    id?: string; name?: string; email?: string; username?: string; password?: string;
  };

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  if (!isKvConfigured()) {
    return NextResponse.json({ error: "KV não configurado" }, { status: 500 });
  }

  const REGISTRY_KEY = "users:registry";
  const list = await kvGet<AppUser[]>(REGISTRY_KEY) ?? [];

  const BUILTIN_IDS = [
    "00000000-0000-0000-0000-000000000000",
    "00000000-0000-0000-0000-000000000002",
  ];

  const idx = list.findIndex((u) => u.id === id);

  // Built-in users: allow password change only (they live outside KV)
  if (BUILTIN_IDS.includes(id)) {
    if (!password) return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    // Built-ins are not in KV registry — return a note (client handles the display)
    return NextResponse.json({ ok: false, builtIn: true }, { status: 400 });
  }

  if (idx === -1) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const user = list[idx];

  // Validate uniqueness for fields being changed
  const emailLower    = email    ? email.toLowerCase().trim()    : user.email;
  const usernameLower = username ? username.toLowerCase().trim() : user.username;

  if (email && emailLower !== user.email) {
    const conflict = await findByEmail(emailLower);
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
  }
  if (username && usernameLower !== user.username) {
    const conflict = await findByUsername(usernameLower);
    if (conflict && conflict.id !== id) {
      return NextResponse.json({ error: "Nome de usuário já está em uso" }, { status: 409 });
    }
  }

  list[idx] = {
    ...user,
    name:     name?.trim()  || user.name,
    email:    emailLower,
    username: usernameLower,
    password: password      || user.password,
  };

  await kvSet(REGISTRY_KEY, list);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { id } = await request.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

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
