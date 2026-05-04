import { kvGet, kvSet, kvDel, isKvConfigured } from "@/lib/kv-store";
import { getStore } from "@/lib/kv-store";
import type {
  Household,
  HouseholdInvite,
  HouseholdDashboard,
  SharedTransaction,
  CategorySplit,
  ClosedSettlement,
} from "@/lib/household";

// ── Key helpers ───────────────────────────────────────────────────────────────

function householdKey(id: string)   { return `household:${id}`; }
function byUserKey(userId: string)  { return `household:by-user:${userId}`; }
function inviteKey(token: string)   { return `invite:household:${token}`; }
function settlementKey(hId: string, month: string) {
  return `household:settlement:${hId}:${month}`;
}

// ── Household CRUD ────────────────────────────────────────────────────────────

export async function getHousehold(userId: string): Promise<Household | null> {
  if (!isKvConfigured()) return null;
  const householdId = await kvGet<string>(byUserKey(userId));
  if (!householdId) return null;
  return kvGet<Household>(householdKey(householdId));
}

export async function createHousehold(
  ownerUserId: string, ownerName: string,
  memberUserId: string, memberName: string,
  splitRatio = 0.5,
): Promise<Household> {
  const id: string = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const household: Household = {
    id,
    name: "Nossa Casa",
    splitRatio,
    ownerUserId,
    memberUserId,
    ownerName,
    memberName,
    createdAt: new Date().toISOString(),
  };
  await kvSet(householdKey(id), household);
  await kvSet(byUserKey(ownerUserId), id);
  await kvSet(byUserKey(memberUserId), id);
  return household;
}

export async function updateHousehold(id: string, patch: Partial<Pick<Household, "name" | "splitRatio">>): Promise<Household | null> {
  const existing = await kvGet<Household>(householdKey(id));
  if (!existing) return null;
  const updated = { ...existing, ...patch };
  await kvSet(householdKey(id), updated);
  return updated;
}

export async function deleteHousehold(userId: string): Promise<void> {
  const householdId = await kvGet<string>(byUserKey(userId));
  if (!householdId) return;
  const household = await kvGet<Household>(householdKey(householdId));
  if (!household) return;
  await kvDel(householdKey(householdId));
  await kvDel(byUserKey(household.ownerUserId));
  await kvDel(byUserKey(household.memberUserId));
}

// ── Invites ───────────────────────────────────────────────────────────────────

export async function createInvite(
  ownerUserId: string, ownerName: string, ownerEmail: string, inviteeEmail: string,
): Promise<HouseholdInvite> {
  const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const now   = new Date();
  const invite: HouseholdInvite = {
    token,
    ownerUserId, ownerName, ownerEmail, inviteeEmail,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
  };
  await kvSet(inviteKey(token), invite, 172800); // 48h TTL
  return invite;
}

export async function getInvite(token: string): Promise<HouseholdInvite | null> {
  return kvGet<HouseholdInvite>(inviteKey(token));
}

export async function deleteInvite(token: string): Promise<void> {
  await kvDel(inviteKey(token));
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export async function getHouseholdDashboard(
  userId: string,
  month: string, // "YYYY-MM"
): Promise<HouseholdDashboard | null> {
  const household = await getHousehold(userId);
  if (!household) return null;

  // Parse month boundaries
  const [year, mo] = month.split("-").map(Number);
  const monthStart = new Date(year, mo - 1, 1);
  const monthEnd   = new Date(year, mo, 0, 23, 59, 59, 999);

  // Read both stores SEPARATELY — never join across users in a single query
  const [ownerStore, memberStore] = await Promise.all([
    getStore(household.ownerUserId),
    getStore(household.memberUserId),
  ]);

  function filterShared(store: Awaited<ReturnType<typeof getStore>>, userId: string, userName: string): SharedTransaction[] {
    return store.transactions
      .filter((tx) => {
        if (!tx.isShared) return false;
        const d = new Date(tx.date);
        return d >= monthStart && d <= monthEnd;
      })
      .map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: Math.abs(tx.amount),
        date: tx.date,
        category: tx.category?.name ?? "Outros",
        paidByName: userName,
        paidByUserId: userId,
        type: tx.type,
      }));
  }

  const ownerTxns  = filterShared(ownerStore,  household.ownerUserId,  household.ownerName);
  const memberTxns = filterShared(memberStore, household.memberUserId, household.memberName);

  // Only sum expenses for settlement (income is not shared debt)
  const ownerSharedTotal  = ownerTxns .filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const memberSharedTotal = memberTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const combinedTotal     = ownerSharedTotal + memberSharedTotal;

  // Category breakdown
  const catMap = new Map<string, CategorySplit>();
  for (const tx of ownerTxns.filter((t) => t.type === "expense")) {
    const entry = catMap.get(tx.category) ?? { category: tx.category, ownerAmount: 0, memberAmount: 0 };
    catMap.set(tx.category, { ...entry, ownerAmount: entry.ownerAmount + tx.amount });
  }
  for (const tx of memberTxns.filter((t) => t.type === "expense")) {
    const entry = catMap.get(tx.category) ?? { category: tx.category, ownerAmount: 0, memberAmount: 0 };
    catMap.set(tx.category, { ...entry, memberAmount: entry.memberAmount + tx.amount });
  }
  const categoryBreakdown = Array.from(catMap.values()).sort(
    (a, b) => (b.ownerAmount + b.memberAmount) - (a.ownerAmount + a.memberAmount)
  );

  // All shared transactions sorted by date
  const transactions: SharedTransaction[] = [...ownerTxns, ...memberTxns].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Settlement calculation
  const ownerFairShare  = combinedTotal * household.splitRatio;
  const memberFairShare = combinedTotal * (1 - household.splitRatio);
  const ownerBalance    = ownerSharedTotal - ownerFairShare; // positive = member owes owner

  const isEven = Math.abs(ownerBalance) < 0.01;
  const settlement = {
    isEven,
    debtorName:   ownerBalance > 0 ? household.memberName : household.ownerName,
    creditorName: ownerBalance > 0 ? household.ownerName  : household.memberName,
    amount: Math.abs(ownerBalance),
    // Keep both fair share references for display
    ownerFairShare,
    memberFairShare,
  };

  return {
    household,
    ownerSharedTotal,
    memberSharedTotal,
    combinedTotal,
    categoryBreakdown,
    transactions,
    settlement,
    month,
  };
}

// ── Month close ───────────────────────────────────────────────────────────────

export async function closeMonth(userId: string, month: string): Promise<ClosedSettlement | null> {
  const dashboard = await getHouseholdDashboard(userId, month);
  if (!dashboard) return null;

  const { household, settlement } = dashboard;
  const debtorUserId   = settlement.debtorName   === household.ownerName  ? household.ownerUserId  : household.memberUserId;
  const creditorUserId = settlement.creditorName  === household.ownerName  ? household.ownerUserId  : household.memberUserId;

  const record: ClosedSettlement = {
    householdId: household.id,
    month,
    debtorUserId,
    creditorUserId,
    amount: settlement.amount,
    closedAt: new Date().toISOString(),
  };

  await kvSet(settlementKey(household.id, month), record, 3600 * 24 * 90); // keep 90 days
  return record;
}

export async function getClosedSettlement(householdId: string, month: string): Promise<ClosedSettlement | null> {
  return kvGet<ClosedSettlement>(settlementKey(householdId, month));
}
