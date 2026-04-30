import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getStore, setStore } from "@/lib/kv-store";
import type { StoreData } from "@/lib/kv-store";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

async function getUserId(request: Request): Promise<string | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match  = cookie.match(/financeapp_session=([^;]+)/);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], SECRET);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const uid = await getUserId(request);
  if (!uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ data: await getStore(uid) });
}

export async function PUT(request: Request) {
  const uid = await getUserId(request);
  if (!uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => null) as StoreData | null;
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  await setStore(uid, body);
  return NextResponse.json({ ok: true });
}
