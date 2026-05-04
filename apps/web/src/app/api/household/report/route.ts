import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getHousehold } from "@/lib/householdService";
import { getStore } from "@/lib/kv-store";

export interface CombinedTransaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: { id: string; name: string; color: string; icon: string };
  account: { id: string; name: string; type: string; balance: number; institution: string };
  date: string;
  paidByUserId: string;
  paidByName: string;
  isShared?: boolean;
  isRecurring?: boolean;
  recurringPeriod?: "monthly" | "yearly";
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const household = await getHousehold(user.id);
  if (!household) {
    return NextResponse.json({ error: "No household found." }, { status: 404 });
  }

  // Read both stores SEPARATELY — privacy preserved, no cross-user DB join
  const [ownerStore, memberStore] = await Promise.all([
    getStore(household.ownerUserId),
    getStore(household.memberUserId),
  ]);

  const ownerTxns: CombinedTransaction[] = ownerStore.transactions.map((tx) => ({
    ...tx,
    paidByUserId: household.ownerUserId,
    paidByName: household.ownerName,
  }));

  const memberTxns: CombinedTransaction[] = memberStore.transactions.map((tx) => ({
    ...tx,
    paidByUserId: household.memberUserId,
    paidByName: household.memberName,
  }));

  const transactions: CombinedTransaction[] = [...ownerTxns, ...memberTxns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return NextResponse.json({
    household: {
      id: household.id,
      name: household.name,
      ownerUserId: household.ownerUserId,
      memberUserId: household.memberUserId,
      ownerName: household.ownerName,
      memberName: household.memberName,
      splitRatio: household.splitRatio,
    },
    transactions,
  });
}
