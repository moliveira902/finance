import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getUserPrefs, setUserPrefs, type FamilioConfig } from "@/lib/userPrefs";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const prefs = await getUserPrefs(user.id);
  return NextResponse.json({
    familioConfig: prefs.familioConfig ?? {
      enabled:    false,
      sendDay:    0,
      assignedTo: "",
    },
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: Partial<FamilioConfig>;
  try {
    body = await request.json() as Partial<FamilioConfig>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const prefs   = await getUserPrefs(user.id);
  const current = prefs.familioConfig ?? { enabled: false, sendDay: 0, assignedTo: "" };

  const updated: FamilioConfig = {
    ...current,
    ...(body.enabled    !== undefined ? { enabled:    body.enabled    } : {}),
    ...(body.sendDay    !== undefined ? { sendDay:    body.sendDay    } : {}),
    ...(body.assignedTo !== undefined ? { assignedTo: body.assignedTo } : {}),
  };

  await setUserPrefs(user.id, { familioConfig: updated });
  return NextResponse.json({ ok: true, familioConfig: updated });
}
