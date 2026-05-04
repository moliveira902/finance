import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { closeMonth, getClosedSettlement, getHousehold } from "@/lib/householdService";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null) as { month?: string } | null;
  const now  = new Date();
  const month = body?.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const household = await getHousehold(user.id);
  if (!household) return NextResponse.json({ error: "No household." }, { status: 404 });

  // Check not already closed
  const existing = await getClosedSettlement(household.id, month);
  if (existing) {
    return NextResponse.json({ error: "Month already closed.", settlement: existing }, { status: 409 });
  }

  const settlement = await closeMonth(user.id, month);
  return NextResponse.json({ ok: true, settlement });
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now   = new Date();
  const month = searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const household = await getHousehold(user.id);
  if (!household) return NextResponse.json({ settlement: null });

  const settlement = await getClosedSettlement(household.id, month);
  return NextResponse.json({ settlement: settlement ?? null });
}
