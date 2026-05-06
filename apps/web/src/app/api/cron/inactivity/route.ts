import { NextResponse } from "next/server";
import { getAllUsers } from "@/lib/users";
import { getUserPrefs } from "@/lib/userPrefs";
import { dispatch } from "@/lib/notificationService";
import { Templates } from "@/lib/notificationTemplates";
import { getStore } from "@/lib/kv-store";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const users = await getAllUsers();
  const results: { userId: string; action: string; error?: string }[] = [];
  const now = Date.now();
  const dayOfMonth = new Date().getDate();

  for (const u of users) {
    try {
      const prefs = await getUserPrefs(u.id);

      // Skip if type is explicitly disabled
      if (prefs.notificationPrefs.types["INACTIVITY_NUDGE"] === false) {
        results.push({ userId: u.id, action: "skipped:disabled" });
        continue;
      }

      const inactivity = prefs.notificationPrefs.inactivityNudge;
      if (!inactivity.enabled) {
        results.push({ userId: u.id, action: "skipped:nudge_disabled" });
        continue;
      }

      // Check last active timestamp
      if (!prefs.lastActiveAt) {
        results.push({ userId: u.id, action: "skipped:no_activity_record" });
        continue;
      }

      const lastActive = new Date(prefs.lastActiveAt).getTime();
      const daysSince = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));

      if (daysSince < inactivity.thresholdDays) {
        results.push({ userId: u.id, action: `skipped:active_${daysSince}d` });
        continue;
      }

      const store = await getStore(u.id);
      const name = store.profile.name || u.name || u.username;

      const message = Templates.INACTIVITY_NUDGE(name, dayOfMonth, daysSince);
      await dispatch(u.id, "INACTIVITY_NUDGE", message, { daysSince, dayOfMonth });
      results.push({ userId: u.id, action: `nudged:${daysSince}d` });
    } catch (e) {
      results.push({ userId: u.id, action: "error", error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
