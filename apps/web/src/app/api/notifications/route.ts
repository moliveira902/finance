import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getNotifications } from "@/lib/notificationService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page")     ?? "1"));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") ?? "20"));

  const result = await getNotifications(user.id, page, pageSize);
  return NextResponse.json(result);
}
