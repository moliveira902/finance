# ARCHITECTURE.md — Technical Architecture Reference

---

## Overview

FinanceApp is a multi-tenant SaaS personal finance platform for Brazilian users. It runs on AWS (sa-east-1) and serves web users via a Next.js frontend and iOS users via a native SwiftUI app.

---

## System diagram

```
┌─────────────────────────────────────────────────────┐
│                    Clients                          │
│  Next.js SaaS (Vercel)    iOS (App Store)           │
│  PWA (Service Worker)                               │
└───────────────┬─────────────────────┬───────────────┘
                │ HTTPS               │ HTTPS
┌───────────────▼─────────────────────▼───────────────┐
│           AWS API Gateway (sa-east-1)               │
│        Rate limiting · SSL · routing                │
└───────────────────────────┬─────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────┐
│              Auth layer                             │
│     Auth0 (OAuth 2.0 · JWT · MFA)                  │
└───────────────────────────┬─────────────────────────┘
                            │ Validated JWT
┌───────────────────────────▼─────────────────────────┐
│              ECS Fargate services                   │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────┐  │
│  │  Core API   │  │  Transaction  │  │Portfolio │  │
│  │  Express    │  │  Engine       │  │Service   │  │
│  └─────────────┘  └───────────────┘  └──────────┘  │
│  ┌─────────────────────────────────────────────┐    │
│  │              Worker (BullMQ)                │    │
│  │  Sync jobs · AI categorisation · Alerts     │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
        ┌──────────────┼────────────────┐
        ▼              ▼                ▼
   PostgreSQL       Redis           S3
   (RDS)        (ElastiCache)   (CloudFront)
```

---

## Component breakdown

### Web frontend — Next.js 14

- App Router with React Server Components for fast initial load
- Auth0 Next.js SDK for session management
- Zustand for client-side UI state
- React Query (`@tanstack/react-query`) for server state, caching, and optimistic updates
- Tailwind CSS with custom design tokens
- Recharts for financial charts
- Multi-tenant routing: `{tenant}.financeapp.com.br`
- Deployed to Vercel (global CDN, automatic preview deployments)

### iOS app — Swift + SwiftUI

- SwiftUI for all screens (iOS 16+)
- Auth0 iOS SDK with Keychain token storage
- Face ID / Touch ID via `LocalAuthentication` framework
- `URLSession` with `async/await` for all API calls
- `Combine` for reactive state management
- APNs for push notifications
- Minimum deployment: iOS 16.0

### Core API — Node.js + Express

- TypeScript strict mode
- Express with modular route files
- Prisma ORM for all database access
- Zod for request/response validation
- Pino for structured JSON logging
- `express-oauth2-jwt-bearer` for Auth0 JWT validation
- OpenAPI/Swagger docs via `swagger-jsdoc`
- BullMQ for job queues (backed by Redis)

### Worker service

Separate ECS service running the same Node.js codebase but entrypoint is the worker:

- **BradescoSyncJob** — runs every 6 hours per active consent, syncs transactions
- **CategorisationJob** — processes uncategorised transactions via Claude API
- **BudgetAlertJob** — checks budget utilisation every hour, sends alerts
- **ReportExportJob** — generates PDF/CSV on demand
- **MarketDataJob** — fetches live quotes every minute for active portfolios (R2)

### Auth — Auth0

- Single Auth0 tenant per environment (dev, staging, prod)
- Applications: SPA (web), Native (iOS)
- API: audience `https://api.financeapp.com.br`
- Actions: enrich JWT with `tenant_id` on login
- MFA: TOTP (Google Authenticator) + SMS backup
- Password policy: 12 chars minimum, breach detection enabled

### Database — PostgreSQL 15 (RDS)

- Multi-AZ deployment for high availability
- Read replica for reporting queries
- Row Level Security (RLS) enforces per-user data isolation at DB level
- `current_setting('app.current_user_id')` set by API on each connection
- Prisma migrations manage schema changes
- Automated backups: 7-day retention, point-in-time recovery

### Cache — Redis 7 (ElastiCache)

- Auth tokens and session data (TTL: token expiry)
- AI categorisation cache (TTL: 24 hours)
- Open Finance access tokens (TTL: 15 minutes)
- Market quote cache (TTL: 60 seconds)
- BullMQ job queues

---

## Data flow — transaction creation

```
1. User submits form (web or iOS)
2. Frontend → POST /v1/transactions with JWT
3. API Gateway validates SSL, routes to Core API
4. Auth middleware validates JWT with Auth0 JWKS
5. Zod validates request body
6. Prisma writes transaction to PostgreSQL
7. BullMQ enqueues CategorisationJob
8. Worker picks up job → calls Claude API
9. Claude returns category + confidence score
10. Worker updates transaction with ai_category_id
11. If budget threshold crossed → NotificationJob enqueued
12. WebSocket pushes update to connected web/iOS client
```

---

## Security posture

- JWT validation on every API route (Auth0 JWKS)
- Row Level Security at database level (defence in depth)
- mTLS for all Open Finance API calls (R2)
- Secrets in AWS Secrets Manager (never in code or environment files)
- WAF rules: SQL injection, XSS, rate limiting by IP
- All data encrypted at rest (RDS, ElastiCache, S3)
- All data encrypted in transit (TLS 1.3 minimum)
- LGPD compliance: consent tracking, data export, right to deletion
- Dependency scanning via GitHub Dependabot
- SAST scanning via CodeQL in CI pipeline

---

## Scalability

- ECS Fargate auto-scales API service: 2–20 tasks based on CPU/memory
- RDS read replica offloads reporting queries
- Redis cluster mode for cache horizontal scaling
- CloudFront serves static assets globally with edge caching
- BullMQ workers scale independently from the API

---

## Monorepo structure

```
financeapp/
├── apps/
│   ├── web/                   # Next.js 14
│   │   ├── app/               # App Router pages
│   │   ├── components/        # Shared UI components
│   │   ├── lib/               # API client, auth helpers
│   │   └── stores/            # Zustand stores
│   └── ios/                   # Xcode project
│       └── FinanceApp/
│           ├── Views/         # SwiftUI screens
│           ├── ViewModels/    # ObservableObject VMs
│           ├── Services/      # API client, auth, keychain
│           └── Models/        # Codable data models
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/        # Express route handlers
│   │   │   ├── services/      # Business logic
│   │   │   ├── adapters/      # External API adapters (Bradesco, B3)
│   │   │   ├── middleware/    # Auth, validation, errors
│   │   │   └── jobs/          # BullMQ job definitions
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   ├── worker/
│   │   └── src/
│   │       └── jobs/          # Job processor implementations
│   └── shared-types/
│       └── src/               # TypeScript interfaces shared by web+api
├── infra/                     # Terraform
├── .claude/                   # Claude Code config
├── .github/workflows/         # CI/CD
└── docs/                      # This documentation
```
