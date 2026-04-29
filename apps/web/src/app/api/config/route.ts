import { NextResponse } from "next/server";
import { INGEST_API_KEY } from "@/lib/ingest-queue";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-key-change-in-production-32+"
);

export async function GET(request: Request) {
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

  return NextResponse.json({
    ingestApiKey: INGEST_API_KEY,
    ingestUrl: "/api/ingest/transactions",
    aiEnabled: true,
  });
}
