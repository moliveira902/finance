import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getInvite, deleteInvite, createHousehold, getHousehold } from "@/lib/householdService";
import { findByEmail } from "@/lib/users";
import { getStore } from "@/lib/kv-store";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const invite = await getInvite(params.token);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired." }, { status: 404 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }

  // Check if invitee email is a registered user
  const registeredUser = await findByEmail(invite.inviteeEmail);

  return NextResponse.json({
    invite: {
      ownerName: invite.ownerName,
      inviteeEmail: invite.inviteeEmail,
      expiresAt: invite.expiresAt,
    },
    isRegisteredUser: !!registeredUser,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const invite = await getInvite(params.token);
  if (!invite) {
    return NextResponse.json({ error: "Invite not found or expired." }, { status: 404 });
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }

  // Verify the logged-in user's email matches the invite
  if (user.email.toLowerCase() !== invite.inviteeEmail.toLowerCase()) {
    return NextResponse.json({
      error: `This invite was sent to ${invite.inviteeEmail}. You are logged in as ${user.email}.`,
    }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { mode?: string } | null;
  const mode = body?.mode === "merge" ? "merge" : "join";

  // Check neither user is already in a household
  const [ownerHousehold, memberHousehold] = await Promise.all([
    getHousehold(invite.ownerUserId),
    getHousehold(user.id),
  ]);

  if (ownerHousehold) {
    return NextResponse.json({ error: "The owner is already in a household." }, { status: 409 });
  }
  if (memberHousehold) {
    return NextResponse.json({ error: "You are already in a household." }, { status: 409 });
  }

  // Get owner's name from their store
  const ownerStore  = await getStore(invite.ownerUserId);
  const ownerName   = ownerStore.profile.name || invite.ownerName;
  const memberName  = user.name;

  if (mode === "merge") {
    const household = await createHousehold(
      invite.ownerUserId, ownerName,
      user.id, memberName,
    );
    await deleteInvite(params.token);
    return NextResponse.json({ ok: true, mode: "merge", householdId: household.id });
  }

  // Join mode: just record membership (no household object needed)
  await deleteInvite(params.token);
  return NextResponse.json({ ok: true, mode: "join" });
}
