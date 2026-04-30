import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

// Warm-invocation in-memory cache so repeated requests skip disk I/O
const memCache = new Map<string, unknown>();

function storeFile(userId: string) {
  return join("/tmp", `fa_${userId.replace(/\W/g, "_")}.json`);
}

function readStore(userId: string): unknown | null {
  if (memCache.has(userId)) return memCache.get(userId) ?? null;
  const fp = storeFile(userId);
  if (existsSync(fp)) {
    try {
      const data = JSON.parse(readFileSync(fp, "utf-8"));
      memCache.set(userId, data);
      return data;
    } catch {
      // corrupt file — ignore
    }
  }
  return null;
}

function writeStore(userId: string, data: unknown): void {
  memCache.set(userId, data);
  try {
    writeFileSync(storeFile(userId), JSON.stringify(data), "utf-8");
  } catch {
    // /tmp write failed — mem cache still serves warm invocations
  }
}

async function getUserId(request: Request): Promise<string | null> {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/financeapp_session=([^;]+)/);
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
  return NextResponse.json({ data: readStore(uid) });
}

export async function PUT(request: Request) {
  const uid = await getUserId(request);
  if (!uid) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  writeStore(uid, body);
  return NextResponse.json({ ok: true });
}
