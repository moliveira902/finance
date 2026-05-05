import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/users";
import { computeHealthScore } from "@/lib/healthScoreService";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const users = await getAllUsers();
  const results: { userId: string; score?: number; error?: string }[] = [];

  for (const u of users) {
    try {
      const score = await computeHealthScore(u.id);
      results.push({ userId: u.id, score: score.total });
    } catch (e) {
      results.push({ userId: u.id, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, computed: results.length, results });
}
