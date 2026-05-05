import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getBadges } from "@/lib/healthScoreService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const badges = await getBadges(user.id);
  return NextResponse.json(badges);
}
