import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { drainQueue, queueLength } from "@/lib/ingest-queue";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export async function GET(request: Request) {
  // Require valid session
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/financeapp_session=([^;]+)/);
  const token = match?.[1];

  if (!token) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    await jwtVerify(token, JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const items = drainQueue();
  return NextResponse.json({ items, count: items.length });
}

export async function HEAD() {
  return NextResponse.json({ pending: queueLength() });
}
