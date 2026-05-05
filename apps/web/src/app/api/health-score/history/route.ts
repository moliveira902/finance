import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHealthScoreHistory } from "@/lib/healthScoreService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const months = Math.min(24, Math.max(1, parseInt(searchParams.get("months") ?? "12")));

  const history = await getHealthScoreHistory(user.id, months);
  return NextResponse.json(history);
}
