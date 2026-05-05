import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getStore, setStore } from "@/lib/kv-store";
import { getHousehold } from "@/lib/householdService";
import { dispatchToHousehold } from "@/lib/notificationService";
import { Templates } from "@/lib/notificationTemplates";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const household = await getHousehold(user.id);
  if (!household) {
    return NextResponse.json({ error: "You must be in a Merge household to share transactions." }, { status: 403 });
  }

  const store = await getStore(user.id);
  const txIndex = store.transactions.findIndex((t) => t.id === params.id);
  if (txIndex === -1) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  const tx = { ...store.transactions[txIndex], isShared: true };
  store.transactions[txIndex] = tx;
  await setStore(user.id, store);

  // Notify both household members
  const sharedTotal = store.transactions
    .filter((t) => t.isShared && t.type === "expense")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  dispatchToHousehold(
    user.id,
    "HOUSEHOLD_EXPENSE_SHARED",
    (_uid, _myName, partnerName) =>
      Templates.HOUSEHOLD_EXPENSE_SHARED(
        partnerName,
        tx.description,
        Math.abs(tx.amount),
        tx.category?.name ?? "",
        sharedTotal,
      ),
    { transactionId: tx.id },
  ).catch(() => {});

  return NextResponse.json({ ok: true, transaction: tx });
}
