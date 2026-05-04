import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { createHousehold, deleteHousehold, getHousehold } from "@/lib/householdService";
import { getAllUsers } from "@/lib/users";
import { getStore } from "@/lib/kv-store";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    ownerUserId?: string;
    memberUserId?: string;
    splitRatio?: number;
  } | null;

  if (!body?.ownerUserId || !body?.memberUserId) {
    return NextResponse.json({ error: "ownerUserId and memberUserId are required." }, { status: 400 });
  }

  if (body.ownerUserId === body.memberUserId) {
    return NextResponse.json({ error: "Owner and member must be different users." }, { status: 400 });
  }

  const splitRatio = typeof body.splitRatio === "number"
    ? Math.min(0.9, Math.max(0.1, body.splitRatio))
    : 0.5;

  // Check neither is already in a household
  const [ownerHh, memberHh] = await Promise.all([
    getHousehold(body.ownerUserId),
    getHousehold(body.memberUserId),
  ]);

  if (ownerHh) return NextResponse.json({ error: "Owner already in a household." }, { status: 409 });
  if (memberHh) return NextResponse.json({ error: "Member already in a household." }, { status: 409 });

  // Get names from stores
  const [ownerStore, memberStore] = await Promise.all([
    getStore(body.ownerUserId),
    getStore(body.memberUserId),
  ]);

  const users = await getAllUsers();
  const ownerUser  = users.find((u) => u.id === body.ownerUserId);
  const memberUser = users.find((u) => u.id === body.memberUserId);

  const ownerName  = ownerStore.profile.name  || ownerUser?.name  || body.ownerUserId;
  const memberName = memberStore.profile.name || memberUser?.name || body.memberUserId;

  const household = await createHousehold(
    body.ownerUserId, ownerName,
    body.memberUserId, memberName,
    splitRatio,
  );

  return NextResponse.json({ ok: true, household });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await request.json().catch(() => null) as { userId?: string } | null;
  if (!body?.userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  await deleteHousehold(body.userId);
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user?.isAdmin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const users = await getAllUsers();
  const households = await Promise.all(
    users.map(async (u) => {
      const hh = await getHousehold(u.id);
      return hh ? { userId: u.id, household: hh } : null;
    })
  );

  const unique = new Map<string, typeof households[0]>();
  for (const h of households) {
    if (h && !unique.has(h.household.id)) unique.set(h.household.id, h);
  }

  return NextResponse.json({ households: Array.from(unique.values()).map((h) => h!.household) });
}
