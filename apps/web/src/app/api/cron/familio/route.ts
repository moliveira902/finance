import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/users";
import { getUserPrefs, setUserPrefs } from "@/lib/userPrefs";
import { getStore, type Transaction } from "@/lib/kv-store";
import { buildFamilioPayload } from "@/app/api/familio/send/route";

const FAMILIO_ENDPOINT = process.env.FAMILIO_ENDPOINT ?? "https://familio-git-master-moliveira902-5664s-projects.vercel.app/api/finance";
const FAMILIO_API_KEY  = process.env.FAMILIO_API_KEY  ?? "fam_d3e87d2f030713433d95c7025cd768b989b9c2baa98f8d2c";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  // day-of-week in BRT (UTC-3)
  const nowUtc  = new Date();
  const nowBrt  = new Date(nowUtc.getTime() - 3 * 60 * 60 * 1000);
  const todayDow = nowBrt.getDay(); // 0=Sun … 6=Sat

  const users   = await getAllUsers();
  const results: { userId: string; action: string; error?: string }[] = [];

  for (const u of users) {
    try {
      const prefs  = await getUserPrefs(u.id);
      const cfg    = prefs.familioConfig;

      if (!cfg?.enabled) {
        results.push({ userId: u.id, action: "skipped:disabled" });
        continue;
      }

      if (cfg.sendDay !== todayDow) {
        results.push({ userId: u.id, action: `skipped:wrong_day(${todayDow}≠${cfg.sendDay})` });
        continue;
      }

      const store  = await getStore(u.id);
      const txs    = (store as { transactions: Transaction[] }).transactions ?? [];
      const payload = await buildFamilioPayload(txs, cfg.assignedTo);

      const res = await fetch(FAMILIO_ENDPOINT, {
        method:  "POST",
        headers: {
          "Content-Type":               "application/json",
          "x-api-key":                  FAMILIO_API_KEY,
          "Authorization":              `Bearer ${FAMILIO_API_KEY}`,
          "x-vercel-protection-bypass": FAMILIO_API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const ok = res.ok;
      const body = await res.text().catch(() => "");

      await setUserPrefs(u.id, {
        familioConfig: {
          ...cfg,
          lastPayload: JSON.stringify(payload, null, 2),
          ...(ok ? { lastSentAt: new Date().toISOString() } : {}),
        },
      });

      results.push({ userId: u.id, action: ok ? "sent" : `failed:${res.status}:${body.slice(0, 100)}` });
    } catch (e) {
      results.push({ userId: u.id, action: "error", error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, todayDow, processed: results.length, results });
}
