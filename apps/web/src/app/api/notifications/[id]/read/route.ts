import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { markNotificationRead } from "@/lib/notificationService";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  await markNotificationRead(user.id, params.id);
  return NextResponse.json({ ok: true });
}
