import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHealthScore } from "@/lib/healthScoreService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const score = await getHealthScore(user.id);
    return NextResponse.json(score);
  } catch {
    return NextResponse.json({ error: "Could not compute health score." }, { status: 500 });
  }
}
