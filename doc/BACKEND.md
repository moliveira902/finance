# Backend Preparation Plan — FinanceApp

## Context

The monorepo has three empty backend packages (`packages/api`, `packages/shared-types`, `packages/worker`) and a polished frontend running entirely on mock data. The planned stack is: **Express + TypeScript + Prisma + PostgreSQL + Redis + BullMQ + Auth0 + Zod + Pino**.

---

## Phase 1 — Shared Types Package

**Goal:** Single source of truth for domain types, used by both API and frontend.

**Steps:**
1. Initialize `packages/shared-types/` with `package.json`, `tsconfig.json`, and an `index.ts` barrel export
2. Define TypeScript interfaces for every domain entity: `User`, `Account`, `Category`, `Transaction`, `Budget`, `BudgetPeriod`, `MonthlyTrend`, `CategoryBreakdown`
3. Define request/response DTOs (e.g. `CreateTransactionDto`, `TransactionResponse`) and pagination shapes (`PaginatedResponse<T>`)
4. Define shared `ApiError` type and error codes enum

**Tests:**
- No runtime tests — rely on `tsc --noEmit` as the test. Add a type-check script and run it in CI

---

## Phase 2 — Database Schema & Migrations

**Goal:** Prisma schema with RLS-ready tables.

**Steps:**
1. Initialize Prisma in `packages/api/` (`prisma/schema.prisma`)
2. Model all tables: `users`, `accounts`, `categories`, `transactions`, `budgets`, `budget_periods`
3. Add indexes for tenant queries (e.g. `@@index([userId])`) and date range queries (`@@index([userId, date])`)
4. Write seed file with the same data from `mock-data.ts` (4 accounts, 10 categories, 12 transactions, 6 budgets)
5. Add a `migrations/` folder with the initial migration and RLS SQL scripts as a raw migration

**Tests:**
- Schema validation: `prisma validate` in CI
- Seed test: run seed against a test database and assert row counts
- Use a local PostgreSQL Docker container for all DB tests (`docker-compose.test.yml`)

---

## Phase 3 — API Server Bootstrap

**Goal:** Express server with all cross-cutting concerns in place before any domain logic.

**Steps:**
1. Initialize `packages/api/` with `package.json`, `tsconfig.json`, `src/server.ts`, `src/app.ts`
2. Wire middleware stack in order: Pino request logger → CORS → body parser → request-id header
3. Add a `GET /health` endpoint returning `{ status: "ok", version, timestamp }`
4. Add global error handler middleware that maps `ZodError`, `PrismaClientKnownRequestError`, and generic errors to structured JSON responses
5. Add graceful shutdown (SIGTERM/SIGINT) with a 10-second drain window

**Tests:**
- Integration test (Vitest + Supertest): `GET /health` → 200
- Integration test: unknown route → 404 with `{ error: "NOT_FOUND" }`
- Integration test: malformed JSON body → 400 with `{ error: "INVALID_JSON" }`
- Unit test: error handler maps each error type correctly

---

## Phase 4 — Authentication

**Goal:** Replace hardcoded `user/pass` with real JWT validation. Includes **stay logged in** ("Manter conectado") functionality.

**Steps:**
1. Add `src/lib/jwt.ts`: `signToken(payload, { rememberMe })` — issues 8-hour token by default or 30-day token when `rememberMe` is true
2. Add `src/middleware/auth.ts`: validates HS256 JWT from `Authorization: Bearer` header or `financeapp_session` cookie; attaches `req.user`
3. `POST /api/v1/auth/login`: accepts `{ username, password, rememberMe }`. Sets `Max-Age: 28800` (8h) or `Max-Age: 2592000` (30d) on the session cookie based on `rememberMe`
4. `POST /api/v1/auth/logout`: clears the session cookie
5. `POST /api/v1/auth/refresh`: re-issues a short-lived token for an already-authenticated user
6. `GET /api/v1/auth/me`: returns the current user from the JWT payload
7. Next.js `/api/auth/login` route upgraded: issues a real `jose` JWT, respects `rememberMe` flag for cookie lifetime. Next.js middleware upgraded to validate the JWT signature (not just check cookie presence)
8. Login page updated: "Manter conectado por 30 dias" checkbox — when checked, `rememberMe: true` is sent in the login request

**Tests:**
- Unit test: `auth` middleware accepts a valid JWT, rejects expired/malformed/missing tokens with 401
- Integration test: `rememberMe: false` → `Max-Age=28800` cookie; `rememberMe: true` → `Max-Age=2592000` cookie
- Integration test: protected route without token → 401; with valid token → passes to next handler
- Integration test: login → token → use token on protected route → 200

---

## Phase 5 — Core Domain APIs

**Goal:** Full CRUD for all five domain resources, matching the shapes the frontend already expects.

Each resource follows the same pattern: Router → Zod validation middleware → Service → Prisma

### 5a — Categories

- `GET /api/categories` — list (system + user-defined)
- `POST /api/categories` — create user category
- `PATCH /api/categories/:id` — update name/icon/color
- `DELETE /api/categories/:id` — soft-delete (cannot delete system categories)

**Tests:** CRUD happy paths + edge cases (delete system category → 403, duplicate name → 409)

### 5b — Accounts

- `GET /api/accounts` — list with current balance
- `POST /api/accounts` — create
- `PATCH /api/accounts/:id` — update name/type
- `DELETE /api/accounts/:id` — soft-delete (blocked if account has transactions)

**Tests:** CRUD + balance calculation test + deletion guard

### 5c — Transactions

- `GET /api/transactions` — paginated list, filterable by `type`, `categoryId`, `accountId`, `startDate`, `endDate`, `search`
- `POST /api/transactions` — create (amount stored as centavos integer)
- `PATCH /api/transactions/:id` — update
- `DELETE /api/transactions/:id` — hard delete

**Tests:** pagination, each filter param, amount stored as integer, RLS isolation (user A cannot read user B's transactions)

### 5d — Budgets

- `GET /api/budgets` — list with computed `spent` and `utilization` for current period
- `POST /api/budgets` — create (one per category per period)
- `PATCH /api/budgets/:id` — update limit
- `DELETE /api/budgets/:id` — delete

**Tests:** `spent` computed correctly from transactions, duplicate category+period → 409

---

## Phase 6 — Dashboard & Reports Endpoints

**Goal:** Aggregated query endpoints that power the dashboard and reports pages.

**Steps:**
1. `GET /api/dashboard` — returns KPIs (net worth, monthly income, monthly expenses, free balance) + recent 5 transactions + account list
2. `GET /api/reports/monthly-trend?months=6` — income vs. expense per month (SQL `date_trunc('month', date)` group-by)
3. `GET /api/reports/category-breakdown?startDate&endDate` — expense totals per category + % of total + delta vs. previous period

**Tests:**
- Dashboard KPIs match sum of transactions in test seed
- Monthly trend has correct month labels and values
- Category breakdown percentages sum to 100%
- Empty state (no transactions) → zeroes, not errors

---

## Phase 7 — AI Categorization Worker

**Goal:** Async Claude API integration that enriches transactions with `aiCategory` and `aiConfidence`.

**Steps:**
1. Initialize `packages/worker/` with BullMQ and `src/workers/categorize.ts`
2. On `POST /api/transactions`, enqueue a `categorize` job with `{ transactionId, description, amount }`
3. Worker calls Claude API (`claude-haiku-4-5-20251001` for cost efficiency) with a structured prompt; parses the response into `{ category: string, confidence: number }`
4. Worker updates the transaction row with `aiCategory` and `aiConfidence`
5. Add `GET /api/transactions/:id` so the frontend can poll for the AI result

**Tests:**
- Unit test: Claude API response parsed correctly → correct category + confidence
- Unit test: malformed Claude response → falls back to `null` (no crash)
- Integration test: create transaction → job enqueued → worker processes → `aiCategory` set in DB
- Use a mock Claude client in tests (stub `anthropic.messages.create`)

---

## Phase 8 — Settings & User Management

**Goal:** Persist profile, notification preferences, and LGPD operations.

**Steps:**
1. `GET /api/users/me` — current user profile
2. `PATCH /api/users/me` — update name, timezone, currency
3. `GET/PATCH /api/users/me/notifications` — notification toggles
4. `GET /api/users/me/export` — LGPD data export (generates JSON archive of all user data)
5. `DELETE /api/users/me` — LGPD delete (cascades all user data, revokes Auth0 tokens)

**Tests:**
- Profile update validates timezone (against `Intl` timezone list) and currency (ISO 4217)
- Data export contains all expected entities
- Account delete is irreversible — confirm the cascade removes all rows across all tables

---

## Phase 9 — Frontend Integration

**Goal:** Replace all `mock-data.ts` imports with React Query hooks backed by the real API.

**Steps:**
1. Create `apps/web/src/lib/api-client.ts` — typed fetch wrapper with auth header injection and error normalization
2. Create React Query hooks per resource: `useAccounts`, `useTransactions`, `useBudgets`, `useDashboard`, etc.
3. Swap each page component from static mock imports to the new hooks (loading state → skeleton, error state → error boundary)
4. Replace the hardcoded `/api/auth/login` Next.js route with a proxy to the real backend

**Tests:**
- Vitest + React Testing Library for each page: mock the API client, assert loading/success/error states render correctly
- MSW (Mock Service Worker) for integration-level frontend tests that simulate the full request cycle

---

## Phase 10 — CI Pipeline

**Goal:** Automated quality gate on every pull request.

**Steps:**
1. `.github/workflows/ci.yml` with jobs: `type-check`, `lint`, `test-api` (Vitest + Docker Postgres), `test-web` (Vitest + jsdom), `build`
2. Add `docker-compose.ci.yml` with Postgres 15 + Redis 7 services
3. Test coverage thresholds: 80% lines for `packages/api/src/`, 70% for `apps/web/src/`
4. Cache `node_modules` and Prisma client generation between runs

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4
                                    ↓
              Phase 5a → 5b → 5c → 5d
                                    ↓
              Phase 6 → Phase 7 → Phase 8
                                    ↓
              Phase 9 → Phase 10
```

Phases 1–4 are strict prerequisites. Within Phase 5, the four resources can be developed in parallel. Phase 7 (AI worker) can start in parallel with Phase 6.
