import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getStore, setStore, kvDel, isKvConfigured } from "@/lib/kv-store";
import type { StoreData } from "@/lib/kv-store";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

interface SessionUser {
  id: string;
  name: string;
  email: string;
}

async function getSessionUser(request: Request): Promise<SessionUser | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match  = cookie.match(/financeapp_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    const id = payload.sub as string;
    if (!id) return null;
    return { id, name: (payload.name as string) ?? "", email: (payload.email as string) ?? "" };
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const data = await getStore(user.id);

  // Seed profile from JWT on first load (when profile was never saved)
  if (!data.profile.name && user.name) {
    data.profile = { name: user.name, email: user.email };
    await setStore(user.id, data);
  }

  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => null) as StoreData | null;
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await setStore(user.id, body);
  if (isKvConfigured()) {
    await kvDel(`coach:context:${user.id}`);
  }
  return NextResponse.json({ ok: true });
}
