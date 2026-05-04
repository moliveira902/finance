import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { deleteHousehold } from "@/lib/householdService";

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  await deleteHousehold(user.id);
  return NextResponse.json({ ok: true });
}
