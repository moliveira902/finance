export interface Household {
  id: string;
  name: string;
  splitRatio: number;
  ownerUserId: string;
  memberUserId: string;
  ownerName: string;
  memberName: string;
  createdAt: string;
}

export interface HouseholdInvite {
  token: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  inviteeEmail: string;
  createdAt: string;
  expiresAt: string;
}

export interface SharedTransaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paidByName: string;
  paidByUserId: string;
  type: "income" | "expense";
}

export interface CategorySplit {
  category: string;
  ownerAmount: number;
  memberAmount: number;
}

export interface Settlement {
  debtorName: string;
  creditorName: string;
  amount: number;
  isEven: boolean;
}

export interface HouseholdDashboard {
  household: Household;
  ownerSharedTotal: number;
  memberSharedTotal: number;
  combinedTotal: number;
  categoryBreakdown: CategorySplit[];
  transactions: SharedTransaction[];
  settlement: Settlement;
  month: string;
}

export interface ClosedSettlement {
  householdId: string;
  month: string;
  debtorUserId: string;
  creditorUserId: string;
  amount: number;
  closedAt: string;
}
