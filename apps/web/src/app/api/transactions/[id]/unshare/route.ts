import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/sessionUser";
import { getStore, setStore } from "@/lib/kv-store";
import { getHousehold } from "@/lib/householdService";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const household = await getHousehold(user.id);
  if (!household) {
    return NextResponse.json({ error: "No household found." }, { status: 403 });
  }

  const store = await getStore(user.id);
  const txIndex = store.transactions.findIndex((t) => t.id === params.id);
  if (txIndex === -1) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  store.transactions[txIndex] = { ...store.transactions[txIndex], isShared: false };
  await setStore(user.id, store);

  return NextResponse.json({ ok: true, transaction: store.transactions[txIndex] });
}
