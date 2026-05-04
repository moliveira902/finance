import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHousehold } from "@/lib/householdService";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const household = await getHousehold(user.id);
  return NextResponse.json({ household: household ?? null });
}
