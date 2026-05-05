import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { closeMonth, getClosedSettlement, getHousehold } from "@/lib/householdService";
import { dispatch } from "@/lib/notificationService";
import { Templates } from "@/lib/notificationTemplates";

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await request.json().catch(() => null) as { month?: string } | null;
  const now  = new Date();
  const month = body?.month ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const household = await getHousehold(user.id);
  if (!household) return NextResponse.json({ error: "No household." }, { status: 404 });

  // Check not already closed
  const existing = await getClosedSettlement(household.id, month);
  if (existing) {
    return NextResponse.json({ error: "Month already closed.", settlement: existing }, { status: 409 });
  }

  const settlement = await closeMonth(user.id, month);

  // Notify both household members about the closed month
  if (settlement) {
    const hh = await getHousehold(user.id);
    if (hh) {
      const notifyUser = async (userId: string, myName: string, partnerName: string, myPct: number, partnerPct: number) => {
        const myAmount      = settlement.amount * (myPct / 100);
        const partnerAmount = settlement.amount * (partnerPct / 100);
        await dispatch(
          userId,
          "HOUSEHOLD_SETTLEMENT_CLOSED",
          Templates.HOUSEHOLD_SETTLEMENT_CLOSED(
            myName, hh.name, month,
            settlement.amount, myAmount, myPct,
            partnerName, partnerAmount, partnerPct,
          ),
          { householdId: hh.id, month },
          hh.id,
        );
      };

      const ownerPct  = Math.round(hh.splitRatio * 100);
      const memberPct = 100 - ownerPct;

      Promise.all([
        notifyUser(hh.ownerUserId,  hh.ownerName,  hh.memberName, ownerPct,  memberPct),
        notifyUser(hh.memberUserId, hh.memberName, hh.ownerName,  memberPct, ownerPct),
      ]).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, settlement });
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const now   = new Date();
  const month = searchParams.get("month") ??
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const household = await getHousehold(user.id);
  if (!household) return NextResponse.json({ settlement: null });

  const settlement = await getClosedSettlement(household.id, month);
  return NextResponse.json({ settlement: settlement ?? null });
}
