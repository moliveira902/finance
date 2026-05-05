import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { applyStreakFreeze } from "@/lib/healthScoreService";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const result = await applyStreakFreeze(user.id);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
