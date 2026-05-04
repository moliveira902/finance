# FEATURE — Shared & Household Finances

## Context and existing foundation

The app already has a **members** system where the account owner can add members
who can add transactions and see the same expense view as the main user.

This feature extends that system in two directions:

**Option A — Join mode (existing, enhanced)**
A member joins the owner's account and shares the same view. The existing
behaviour is preserved. Enhancement: members can now also add transactions
under their own name so expenses are attributed correctly.

**Option B — Merge mode (new)**
Two independent FinanceApp users link their accounts into a household.
Each user keeps their own private dashboard unchanged. In addition, both
users get a second "consolidated" view that merges both users' shared
expenses into one household dashboard — with settle-up calculation at
month-end.

The member invitation UI is already built. Reuse it — add a step that
asks the member to choose Join or Merge mode when accepting the invite.

---

## Scope for this feature

### In scope
- Member mode selection: Join vs Merge at invite-accept time
- Attribution of transactions to the member who created them (Join mode)
- Household consolidated dashboard (Merge mode)
- Privacy controls: each user's private transactions stay private in Merge mode
- Shared expense tagging: mark any transaction as "shared with household"
- Settle-up calculation: who owes who at month-end
- New navigation entry: "Casa" / "Household" tab visible only when in Merge mode

### Out of scope (future)
- PIX direct payment integration
- Family mode (3+ members)
- Per-category visibility rules
- AI coach for the household consolidated view (separate feature)

---

## Member mode: Join vs Merge

### Join mode (Option A) — existing behaviour + attribution

Current behaviour: member sees and adds to the owner's account as if they
were the owner. Keep this exactly as-is.

Enhancement: every transaction now stores a `created_by_member_id` field.
In the transaction list, show a small avatar/initial badge next to each row
indicating who added it. The owner sees attributions; the member sees their
own transactions highlighted.

No new dashboard. No privacy separation. Same single shared view.

### Merge mode (Option B) — new

Two independent accounts. Each user's personal dashboard is untouched.
A new "Casa" tab appears for both users showing the consolidated view.

Privacy rule: in Merge mode, a transaction is visible to the partner
**only if** it has been explicitly tagged as shared (`is_shared = true`).
All other transactions remain private to the owner.

The consolidated view shows:
- Total household spend this month (sum of all shared transactions from both users)
- Breakdown by category across both users, colour-coded by who spent
- Shared transaction list with attribution
- Balance: who paid more vs their fair share, and the amount owed
- ADMIN account should be able to merge users as well.
---

## Database changes

### 1. Add `member_mode` to existing members table

```sql
ALTER TABLE household_members
  ADD COLUMN mode TEXT NOT NULL DEFAULT 'join'
    CHECK (mode IN ('join', 'merge'));
```

### 2. Add `created_by_member_id` to transactions

```sql
ALTER TABLE transactions
  ADD COLUMN created_by_member_id UUID REFERENCES household_members(id);
```

This is nullable. NULL means the account owner created it.
When a member (Join mode) creates a transaction, store their member ID here.

### 3. Add `is_shared` flag to transactions

```sql
ALTER TABLE transactions
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT FALSE;
```

Used only in Merge mode. When TRUE, this transaction is included in the
household consolidated view.

### 4. New table: `households`

```sql
CREATE TABLE households (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL DEFAULT 'Nossa Casa',
  split_ratio     NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  owner_id        UUID NOT NULL REFERENCES users(id),
  member_id       UUID NOT NULL REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(owner_id, member_id)
);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY households_access ON households
  USING (
    owner_id  = (SELECT id FROM users WHERE auth0_id = current_setting('app.current_user_id'))
    OR
    member_id = (SELECT id FROM users WHERE auth0_id = current_setting('app.current_user_id'))
  );
```

### 5. New table: `settlements`

```sql
CREATE TABLE settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id),
  period_month    DATE NOT NULL,
  debtor_id       UUID NOT NULL REFERENCES users(id),
  creditor_id     UUID NOT NULL REFERENCES users(id),
  amount_cents    INTEGER NOT NULL,
  settled_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(household_id, period_month)
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY settlements_access ON settlements
  USING (
    household_id IN (
      SELECT id FROM households WHERE
        owner_id  = (SELECT id FROM users WHERE auth0_id = current_setting('app.current_user_id'))
        OR
        member_id = (SELECT id FROM users WHERE auth0_id = current_setting('app.current_user_id'))
    )
  );
```

### 6. Prisma migration

```bash
cd packages/api
pnpm prisma migrate dev --name add_shared_finances
```

Update `prisma/schema.prisma` to reflect all new columns and tables above.
Run `pnpm prisma generate` after migration.

---

## Invite flow changes

### Existing flow (keep)
Owner invites member by email → member receives link → member accepts →
member is added with `mode = 'join'` (default, preserves existing behaviour).

### New step for Merge mode
When the invite email recipient is a **registered FinanceApp user**,
the accept screen shows an additional step:

```
┌─────────────────────────────────────┐
│  Marcio te convidou para o FinanceApp│
│                                     │
│  Como você quer participar?         │
│                                     │
│  ○ Entrar na conta (Join)           │
│    Visualize e adicione transações  │
│    na conta do Marcio.              │
│                                     │
│  ○ Unir contas (Merge)              │
│    Mantenha sua conta separada e    │
│    veja um painel consolidado do    │
│    casal.                           │
│                                     │
│  [Continuar]                        │
└─────────────────────────────────────┘
```

If the invite recipient is NOT a registered user, only Join mode is offered
(they don't have a separate account to merge).

### API changes for invite accept

```
POST /v1/invites/:token/accept
Body: { mode: 'join' | 'merge' }
```

When `mode = 'merge'`:
1. Create `household_members` record with `mode = 'merge'`
2. Create `households` record linking owner `user_id` and acceptor `user_id`
3. Return `{ householdId, mode: 'merge' }` — frontend redirects to `/household`

When `mode = 'join'`:
1. Create `household_members` record with `mode = 'join'` (existing behaviour)
2. Return `{ mode: 'join' }` — frontend redirects to existing member dashboard

---

## Backend — new and changed services

### HouseholdService

**File:** `packages/api/src/services/HouseholdService.ts`

#### `getHousehold(userId)`
Returns the household record where `owner_id = userId` OR `member_id = userId`.
Returns `null` if the user has no Merge-mode household.

#### `getHouseholdDashboard(householdId, month)`

Runs in parallel:

```typescript
const [ownerShared, memberShared, ownerUser, memberUser] = await Promise.all([
  // All is_shared = true transactions from owner for this month
  prisma.transaction.findMany({
    where: { userId: household.ownerId, isShared: true,
             transactionDate: { gte: startOfMonth(month), lte: endOfMonth(month) },
             deletedAt: null }
  }),
  // All is_shared = true transactions from member for this month
  prisma.transaction.findMany({
    where: { userId: household.memberId, isShared: true,
             transactionDate: { gte: startOfMonth(month), lte: endOfMonth(month) },
             deletedAt: null }
  }),
  prisma.user.findUnique({ where: { id: household.ownerId }, select: { name: true } }),
  prisma.user.findUnique({ where: { id: household.memberId }, select: { name: true } }),
]);
```

Returns:
```typescript
{
  household,
  ownerName: string,
  memberName: string,
  ownerSharedTotalCents: number,
  memberSharedTotalCents: number,
  combinedTotalCents: number,
  categoryBreakdown: { category: string, ownerCents: number, memberCents: number }[],
  transactions: (Transaction & { paidByName: string })[],
  settlement: { debtorName: string, creditorName: string, amountCents: number }
}
```

#### `calculateSettlement(householdId, month)`

```typescript
const ownerPaid  = ownerShared.reduce((s, t) => s + Math.abs(t.amountCents), 0);
const memberPaid = memberShared.reduce((s, t) => s + Math.abs(t.amountCents), 0);
const total      = ownerPaid + memberPaid;
const ownerFairShare  = Math.round(total * household.splitRatio);
const memberFairShare = total - ownerFairShare;
const ownerBalance    = ownerPaid - ownerFairShare;   // positive = member owes owner

const amountCents = Math.abs(ownerBalance);
const debtorId   = ownerBalance > 0 ? household.memberId : household.ownerId;
const creditorId = ownerBalance > 0 ? household.ownerId  : household.memberId;
return { debtorId, creditorId, amountCents };
```

#### `closeMonth(householdId, month)`
Runs `calculateSettlement`, upserts a `settlements` record for the period,
and caches the result in Redis under `household:settlement:{householdId}:{month}`.

### TransactionService — changes

#### `createTransaction` — add `createdByMemberId` support

When a member (Join mode) calls `POST /v1/transactions`, extract their
`member_id` from the JWT claims or a lookup and store it in
`created_by_member_id`.

#### `shareTransaction(transactionId, userId)` — new method

Validates that `transactionId` belongs to `userId`, then sets `is_shared = true`.
Also busts the household dashboard Redis cache.

#### `unshareTransaction(transactionId, userId)` — new method

Sets `is_shared = false`. Busts cache.

---

## API routes

### New routes

```
GET    /v1/household                         Get current user's household (null if none)
GET    /v1/household/dashboard?month=YYYY-MM  Consolidated dashboard data
GET    /v1/household/transactions            Shared transactions from both users
GET    /v1/household/settlement              Current month settlement
POST   /v1/household/settlement/close        Close month and record settlement

PATCH  /v1/transactions/:id/share            Set is_shared = true
PATCH  /v1/transactions/:id/unshare          Set is_shared = false
```

### Changed routes

```
POST   /v1/invites/:token/accept             Add { mode } to request body
POST   /v1/transactions                      Accept createdByMemberId from member sessions
```

### Route details

#### `GET /v1/household`
- Auth: Auth0 JWT
- Calls `HouseholdService.getHousehold(userId)`
- Returns `null` with 200 if no household (not a 404 — frontend checks for null to hide the tab)

#### `GET /v1/household/dashboard`
- Auth: Auth0 JWT
- Query param: `month` (YYYY-MM format, defaults to current month)
- Calls `HouseholdService.getHouseholdDashboard(householdId, month)`
- Cache key: `household:dashboard:{householdId}:{month}` — TTL 300s
- Bust cache when any shared transaction is created/updated/deleted

#### `PATCH /v1/transactions/:id/share`
- Auth: Auth0 JWT
- Validates ownership (transaction.userId must equal requesting userId)
- Sets `is_shared = true`
- Busts `household:dashboard:*` cache for this user's household
- Returns updated transaction

---

## Privacy enforcement

### Critical: what a Merge-mode partner can and cannot see

A user in Merge mode must NEVER be able to query their partner's private transactions.

Enforce this at two levels:

**Level 1 — RLS (database)**
The `transactions` table RLS policy remains unchanged:
```sql
USING (user_id = current_setting('app.current_user_id'))
```
Private transactions are physically inaccessible to the partner at the DB level.

**Level 2 — Service layer**
`getHouseholdDashboard` issues two separate Prisma queries with separate
`userId` filters. It never issues a single query that joins across both users'
transactions. The results are merged in application code after both queries
return — never in SQL.

**Test cases to verify (write these in Jest):**
```typescript
it('partner cannot read private transactions via household endpoint')
it('only is_shared=true transactions appear in consolidated view')
it('unsharing a transaction removes it from household dashboard immediately')
it('settlement calculation uses only shared transactions')
```

---

## Frontend — web (Next.js)

### Navigation change

In `apps/web/components/layout/Sidebar.tsx`, add a conditional nav item:

```tsx
{household && (
  <NavItem href="/household" label="Casa" icon={<HouseIcon />} />
)}
```

`household` comes from a React Query call to `GET /v1/household` that runs
on app load and is cached for the session. If the response is `null`, the
tab is hidden.

### New pages

#### `/household` — consolidated dashboard

**File:** `apps/web/app/household/page.tsx`

Sections (top to bottom):

1. **Header** — household name, both member avatars (initials), current month selector
2. **Summary cards** (3 cards in a row):
   - Total household spend
   - Owner's shared spend
   - Partner's shared spend
3. **Category breakdown chart** — horizontal stacked bar chart, one bar per category,
   split by colour (owner vs partner). Use Recharts `BarChart` with two `Bar` components.
4. **Transaction list** — combined list of shared transactions from both users,
   sorted by date DESC. Each row shows: date, description, category, amount,
   and a coloured dot indicating who paid.
5. **Settle-up banner** — at the bottom, shows "Ana deve R$ 390,00 a Marcio este mês"
   with a "Fechar mês" button that calls `POST /v1/household/settlement/close`.

#### `/household/transactions` — full shared transaction list

Filterable list with: date range, category, who paid (owner / partner / both).
Each transaction row has an "Descompartilhar" button to unshare it.

### Transaction list changes (personal dashboard)

In `apps/web/components/transactions/TransactionRow.tsx`, add:

- A share/unshare toggle icon button on each row (only visible if the user is in a Merge household)
- When `is_shared = true`, show a small household badge on the row
- In Join mode, show the member's initials badge when `created_by_member_id` is set

### Invite accept page changes

**File:** `apps/web/app/invites/[token]/page.tsx`

Add a step between "invitation details" and "accept button":

```tsx
{isRegisteredUser && (
  <div>
    <p>Como você quer participar?</p>
    <RadioGroup value={mode} onValueChange={setMode}>
      <RadioItem value="join">
        <strong>Entrar na conta</strong>
        <span>Veja e adicione transações na conta de {ownerName}.</span>
      </RadioItem>
      <RadioItem value="merge">
        <strong>Unir contas</strong>
        <span>Mantenha sua conta separada e veja um painel consolidado do casal.</span>
      </RadioItem>
    </RadioGroup>
  </div>
)}
```

`isRegisteredUser` is determined by calling `GET /v1/invites/:token/info`
which returns whether the email is already a registered user.

---

## Frontend — iOS (SwiftUI)

### Navigation

Add a `HouseholdTab` to the main `TabView`, conditionally shown:

```swift
if viewModel.household != nil {
    HouseholdDashboardView()
        .tabItem { Label("Casa", systemImage: "house") }
}
```

Load `GET /v1/household` in the root `AppViewModel` on login.

### New screens

#### `HouseholdDashboardView`

- `HouseholdSummaryCards` — 3 metric cards in `HStack`
- `HouseholdCategoryChart` — horizontal bar chart using Swift Charts
  (`Chart { BarMark(...) }` with two `BarMark` per category, coloured by user)
- `SharedTransactionsList` — `List` of shared transactions with attribution dot
- `SettleUpBanner` — pinned to bottom, shows settlement and close-month button

#### `ShareTransactionSheet`

A bottom sheet (`sheet` modifier) that appears when user long-presses a
transaction row on the personal dashboard. Shows:

```
Compartilhar com a Casa?
Esta transação aparecerá no painel do casal.

[Compartilhar]  [Cancelar]
```

Calls `PATCH /v1/transactions/:id/share` on confirm.

---

## Shared types

**File:** `packages/shared-types/src/household.ts`

```typescript
export type MemberMode = 'join' | 'merge';

export interface Household {
  id: string;
  name: string;
  splitRatio: number;
  ownerId: string;
  memberId: string;
  ownerName: string;
  memberName: string;
  createdAt: string;
}

export interface HouseholdDashboard {
  household: Household;
  ownerSharedTotalCents: number;
  memberSharedTotalCents: number;
  combinedTotalCents: number;
  categoryBreakdown: {
    category: string;
    ownerCents: number;
    memberCents: number;
  }[];
  transactions: SharedTransaction[];
  settlement: {
    debtorName: string;
    creditorName: string;
    amountCents: number;
  };
}

export interface SharedTransaction {
  id: string;
  description: string;
  amountCents: number;
  transactionDate: string;
  categoryName: string;
  paidByName: string;
  paidByUserId: string;
}

export interface Settlement {
  id: string;
  householdId: string;
  periodMonth: string;
  debtorId: string;
  creditorId: string;
  amountCents: number;
  settledAt: string | null;
}
```

---

## Redis cache keys

| Key pattern | TTL | Busted when |
|---|---|---|
| `household:dashboard:{householdId}:{YYYY-MM}` | 300s | Any shared tx created/updated/deleted |
| `household:settlement:{householdId}:{YYYY-MM}` | 3600s | Month closed |
| `household:meta:{userId}` | 600s | Household created or member leaves |

Add bust calls in:
- `TransactionService.shareTransaction()`
- `TransactionService.unshareTransaction()`
- `TransactionService.createTransaction()` (if `is_shared = true` on creation)
- `TransactionService.deleteTransaction()` (if the tx was shared)

---

## Prisma schema additions

Add to `packages/api/prisma/schema.prisma`:

```prisma
model Household {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name        String   @default("Nossa Casa")
  splitRatio  Decimal  @default(0.500) @db.Decimal(4,3)
  ownerId     String   @db.Uuid
  memberId    String   @db.Uuid
  createdAt   DateTime @default(now())
  owner       User     @relation("HouseholdOwner",  fields: [ownerId],  references: [id])
  member      User     @relation("HouseholdMember", fields: [memberId], references: [id])
  settlements Settlement[]
  @@unique([ownerId, memberId])
}

model Settlement {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  householdId  String    @db.Uuid
  periodMonth  DateTime  @db.Date
  debtorId     String    @db.Uuid
  creditorId   String    @db.Uuid
  amountCents  Int
  settledAt    DateTime?
  createdAt    DateTime  @default(now())
  household    Household @relation(fields: [householdId], references: [id])
  debtor       User      @relation("Debtor",   fields: [debtorId],   references: [id])
  creditor     User      @relation("Creditor", fields: [creditorId], references: [id])
  @@unique([householdId, periodMonth])
}
```

Also update the `Transaction` model:
```prisma
model Transaction {
  ...existing fields...
  isShared            Boolean  @default(false)
  createdByMemberId   String?  @db.Uuid
}
```

And update `HouseholdMember`:
```prisma
model HouseholdMember {
  ...existing fields...
  mode  String  @default("join")
}
```

---

## Implementation order

Follow this sequence to avoid breaking existing functionality:

### Phase 1 — Database (no UI changes)
1. Write and run Prisma migration (all schema changes above)
2. Verify existing members tests still pass

### Phase 2 — Backend core
3. Add `HouseholdService` with `getHousehold` and `getHouseholdDashboard`
4. Add `shareTransaction` / `unshareTransaction` to `TransactionService`
5. Add new routes to `packages/api/src/routes/household.ts`
6. Add `PATCH /v1/transactions/:id/share` and `/unshare`
7. Update `POST /v1/invites/:token/accept` to accept `mode` field
8. Write Jest tests for privacy enforcement (see test cases above)

### Phase 3 — Invite flow UI
9. Update invite accept page — add mode selection step
10. Add `GET /v1/invites/:token/info` endpoint (returns whether email is registered)
11. Test full invite flow: Join path and Merge path

### Phase 4 — Household dashboard (web)
12. Add conditional "Casa" nav item
13. Build `/household` page with all sections
14. Build `ShareTransactionSheet` component
15. Add share/unshare toggle to `TransactionRow`

### Phase 5 — iOS
16. Add `HouseholdDashboardView`
17. Add conditional tab in `TabView`
18. Add `ShareTransactionSheet` bottom sheet on long-press

### Phase 6 — Polish and edge cases
19. Handle: user leaves household (DELETE endpoint, hide Casa tab)
20. Handle: household member's account deleted (cascade cleanup)
21. Handle: month has no shared transactions (empty state on dashboard)
22. Handle: both users sharing the same transaction is not possible (enforce at API)

---

## Edge cases and constraints

**A user can only be in one household at a time.**
Enforce with `UNIQUE(owner_id, member_id)` and a service-layer check before
creating a new household.

**Join-mode members cannot trigger Merge features.**
`PATCH /v1/transactions/:id/share` must check that the requesting user's
household member record has `mode = 'merge'`. If not, return 403.

**Month closing is irreversible.**
Once a settlement is created for a period, do not allow it to be deleted
or recalculated. If the user needs to correct it, that is a manual adjustment
in a future period.

**Transaction sharing does not copy the transaction.**
`is_shared = true` is just a flag on the owner's own transaction. The partner
never has direct access to the transaction row — they only see it via the
`getHouseholdDashboard` service method which queries both sides separately.

**Split ratio defaults to 50/50.**
Allow the household admin to update it via `PATCH /v1/household` with body
`{ splitRatio: 0.6 }`. Validate: must be between 0.1 and 0.9.

---

## Definition of done

The feature is complete when:

1. Existing Join-mode members can add transactions with their name attributed
2. A registered user can accept an invite in Merge mode
3. Merge-mode users see a "Casa" tab on web and iOS that does not appear for Join-mode or solo users
4. The consolidated dashboard correctly sums only `is_shared = true` transactions from both users
5. A partner cannot access private transactions via any API endpoint (verified by test suite)
6. The settle-up banner shows the correct debtor, creditor, and amount
7. Sharing and unsharing a transaction updates the household dashboard within 5 minutes (cache TTL)
8. Closing a month creates a `settlements` record and marks the period as closed on the UI
9. All new TypeScript code passes strict mode with zero `any` types
10. RLS tests confirm cross-user data leakage is impossible
