import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHousehold, createInvite } from "@/lib/householdService";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null) as { inviteeEmail?: string } | null;
  if (!body?.inviteeEmail || typeof body.inviteeEmail !== "string") {
    return NextResponse.json({ error: "inviteeEmail is required." }, { status: 400 });
  }

  const inviteeEmail = body.inviteeEmail.trim().toLowerCase();

  // Prevent self-invite
  if (inviteeEmail === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You cannot invite yourself." }, { status: 400 });
  }

  // Check owner doesn't already have a household
  const existing = await getHousehold(user.id);
  if (existing) {
    return NextResponse.json({ error: "You are already in a household." }, { status: 409 });
  }

  const invite = await createInvite(user.id, user.name, user.email, inviteeEmail);

  const origin = new URL(request.url).origin;
  const inviteUrl = `${origin}/household/invite/${invite.token}`;

  return NextResponse.json({ ok: true, inviteUrl, token: invite.token });
}
