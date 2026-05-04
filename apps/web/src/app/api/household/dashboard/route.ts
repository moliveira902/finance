import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHouseholdDashboard } from "@/lib/householdService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now   = new Date();
  const month = searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month format. Use YYYY-MM." }, { status: 400 });
  }

  const dashboard = await getHouseholdDashboard(user.id, month);
  if (!dashboard) {
    return NextResponse.json({ error: "No household found." }, { status: 404 });
  }

  return NextResponse.json({ dashboard });
}
