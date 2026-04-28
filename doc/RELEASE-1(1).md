# RELEASE-1.md — Release 1 Scope and Task Checklist

Target: ~6 months · MVP · No bank integration

---

## Scope summary

Release 1 delivers a fully functional personal finance manager with manual data entry, AI-powered categorisation, budgets, reports, and notifications — available on web (SaaS) and iOS.

**Explicitly out of scope for R1:**
- Open Finance Brasil / Bradesco integration (→ R2)
- B3 / stock portfolio tracking (→ R2)
- Multi-currency support
- Shared/family accounts

---

## Phase 1 — Foundation (weeks 1–4)

### Infrastructure setup

- [ ] GitHub repository already created: https://github.com/moliveira902/finance
- [ ] Set up monorepo structure (Turborepo)
- [ ] Configure `pnpm` workspaces
- [ ] Set up ESLint + Prettier + TypeScript strict mode
- [ ] Create `docker-compose.yml` with PostgreSQL 15 and Redis 7
- [ ] Initialise Terraform project for AWS (see `infra/`)
- [ ] Create AWS account, configure IAM roles and policies
- [ ] Set up GitHub Actions CI pipeline (lint → test → build)
- [ ] Configure GitHub branch protection rules (`main`, `develop`)

### VSCode workspace

- [ ] Create `.vscode/settings.json` (see [SETUP.md](./SETUP.md))
- [ ] Create `.vscode/extensions.json`
- [ ] Create `.vscode/tasks.json` for one-command dev startup
- [ ] Install all required extensions (see [SETUP.md](./SETUP.md) Step 1)
- [ ] Install and configure Claude Code (see [CLAUDE-CODE.md](./CLAUDE-CODE.md))
- [ ] Configure MCP servers in `.claude/mcp.json`
- [ ] Create `.claude/CLAUDE.md` with project context

### Database — initial schema

- [ ] Initialise Prisma with PostgreSQL provider
- [ ] Create migration: `users` table
- [ ] Create migration: `accounts` table (bank accounts — manual for R1)
- [ ] Create migration: `transactions` table
- [ ] Create migration: `categories` table (system + user-defined)
- [ ] Create migration: `budgets` table
- [ ] Create migration: `budget_periods` table
- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Write seed script with demo data

See [DATABASE.md](./DATABASE.md) for full schema.

---

## Phase 2 — Auth + API foundation (weeks 5–8)

### Auth0 setup

- [ ] Create Auth0 tenant
- [ ] Configure Auth0 application (SPA for web, Native for iOS)
- [ ] Configure Auth0 API (audience: `https://api.financeapp.com.br`)
- [ ] Enable MFA (TOTP + SMS)
- [ ] Configure social login (Google optional)
- [ ] Test JWT issuance and validation

### Core API

- [ ] Scaffold Express app with TypeScript
- [ ] Implement JWT validation middleware (Auth0 JWKS)
- [ ] Implement request validation middleware (Zod)
- [ ] Implement error handling middleware (structured JSON errors)
- [ ] Implement rate limiting middleware (100 req/min per user)
- [ ] Set up Swagger/OpenAPI docs at `/docs`
- [ ] Implement health check endpoint `GET /health`
- [ ] Set up structured logging (Pino)

### User routes

- [ ] `GET /v1/me` — fetch authenticated user profile
- [ ] `PUT /v1/me` — update profile (name, timezone, currency display)
- [ ] `DELETE /v1/me` — account deletion (LGPD compliance)

### Account routes

- [ ] `GET /v1/accounts` — list user's accounts
- [ ] `POST /v1/accounts` — create manual account
- [ ] `PUT /v1/accounts/:id` — update account
- [ ] `DELETE /v1/accounts/:id` — delete account

---

## Phase 3 — Transactions + AI (weeks 9–14)

### Transaction routes

- [ ] `GET /v1/transactions` — list with filters (date, category, account, search)
- [ ] `POST /v1/transactions` — create manual transaction
- [ ] `PUT /v1/transactions/:id` — edit transaction
- [ ] `DELETE /v1/transactions/:id` — delete transaction
- [ ] `POST /v1/transactions/import` — CSV import

### AI categorisation service

- [ ] Create `CategorisationService` in `packages/api/src/services/`
- [ ] Integrate Claude API (`claude-sonnet-4-6`)
- [ ] Implement prompt: given transaction description + amount, return category
- [ ] Cache categorisation results in Redis (avoid duplicate API calls)
- [ ] Implement user override (user can re-categorise; store override in DB)
- [ ] Write unit tests for categorisation service

### Categories

- [ ] Seed system categories (Alimentação, Transporte, Moradia, Lazer, Saúde, etc.)
- [ ] `GET /v1/categories` — list categories
- [ ] `POST /v1/categories` — create custom category
- [ ] `PUT /v1/categories/:id` — edit custom category
- [ ] `DELETE /v1/categories/:id` — delete custom category

---

## Phase 4 — Budgets + Reports (weeks 15–18)

### Budget routes

- [ ] `GET /v1/budgets` — list budgets with current period progress
- [ ] `POST /v1/budgets` — create budget (category, amount, period)
- [ ] `PUT /v1/budgets/:id` — update budget
- [ ] `DELETE /v1/budgets/:id` — delete budget
- [ ] Background job: compute budget utilisation every hour
- [ ] Alert logic: trigger notification at 80% and 100% of budget

### Reports routes

- [ ] `GET /v1/reports/summary` — monthly income vs expenses
- [ ] `GET /v1/reports/by-category` — spending breakdown by category
- [ ] `GET /v1/reports/trend` — monthly trend (12 months rolling)
- [ ] `GET /v1/reports/export` — generate PDF/CSV report (BullMQ job)

---

## Phase 5 — Notifications (weeks 19–20)

- [ ] Set up Amazon SES for email notifications
- [ ] Set up APNs credentials for iOS push
- [ ] Set up Firebase Cloud Messaging (FCM) for web push
- [ ] Implement `NotificationService`
- [ ] Notification types: budget alert, weekly summary, monthly report ready
- [ ] `GET /v1/notifications/preferences` — fetch user prefs
- [ ] `PUT /v1/notifications/preferences` — update prefs (email, push, SMS toggles)

---

## Phase 6 — Web frontend (weeks 10–22, parallel)

### Next.js app structure

- [ ] Scaffold Next.js 14 with App Router
- [ ] Configure Tailwind CSS
- [ ] Install and configure Auth0 Next.js SDK
- [ ] Set up Zustand stores (auth, UI state)
- [ ] Set up React Query for API data fetching
- [ ] Create design system: colours, typography, spacing tokens
- [ ] Create shared components: Button, Input, Modal, Toast, Table, Card

### Pages

- [ ] `/` — Landing page (SaaS marketing, sign-up CTA)
- [ ] `/login` — Auth0 redirect
- [ ] `/callback` — Auth0 callback handler
- [ ] `/dashboard` — Net worth, cash flow summary, recent transactions
- [ ] `/transactions` — Full transaction list + filters + CSV import
- [ ] `/budgets` — Budget list, progress, create/edit
- [ ] `/reports` — Charts, export
- [ ] `/settings` — Profile, notifications, accounts, data export
- [ ] `/onboarding` — First-run wizard (connect account → set budgets)

### Multi-tenant SaaS

- [ ] Subdomain routing: `{tenant}.financeapp.com.br`
- [ ] Tenant isolation via `tenant_id` on all API calls
- [ ] Tenant provisioning on first Auth0 login

---

## Phase 7 — iOS app (weeks 12–22, parallel)

- [ ] Scaffold Swift + SwiftUI project in Xcode
- [ ] Integrate Auth0 iOS SDK
- [ ] Implement Keychain wrapper for token storage
- [ ] Enable Face ID / Touch ID via LocalAuthentication
- [ ] Implement API client (`URLSession` + `async/await`)
- [ ] Dashboard screen
- [ ] Transactions list + search
- [ ] Add transaction screen
- [ ] Budget overview screen
- [ ] Settings screen
- [ ] APNs push notification registration
- [ ] Register app in Apple Developer Portal

---

## Phase 8 — Hardening + Launch (weeks 23–26)

- [ ] Load testing (k6) — target: 1000 concurrent users
- [ ] LGPD compliance review (data deletion, export, consent logging)
- [ ] Security audit (OWASP Top 10 checklist)
- [ ] Penetration test (JWT, SQL injection, rate limiting)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Set up CloudWatch dashboards and alarms
- [ ] Configure AWS WAF
- [ ] App Store submission (iOS)
- [ ] DNS configuration and SSL certificates
- [ ] Runbook: incident response procedure
- [ ] Staging environment smoke tests
- [ ] Production deployment (see [DEPLOYMENT.md](./DEPLOYMENT.md))

---

## Definition of Done — R1

R1 is complete when:

1. A new user can sign up, create an account, and add transactions manually
2. Transactions are auto-categorised by the AI service
3. Budgets alert the user when approaching limits
4. Monthly reports can be exported as PDF
5. The iOS app is live on the App Store
6. All RLS policies are verified to prevent cross-user data access
7. P95 API latency < 200ms under load test
8. Zero critical/high severity findings in security audit
