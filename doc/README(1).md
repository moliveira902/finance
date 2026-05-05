# FinanceApp — Project Documentation

Personal finance platform with web (SaaS) and iOS clients.

**Current version:** v1.9.0  
**GitHub repository:** https://github.com/moliveira902/finance

## Quick links

| Document | Purpose |
|---|---|
| [SETUP.md](./SETUP.md) | VSCode environment setup — start here |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full technical architecture reference |
| [RELEASE-1.md](./RELEASE-1.md) | Release 1 scope, tasks, and checklist |
| [FEATURE-SHARED-FINANCES.md](./FEATURE-SHARED-FINANCES.md) | Casa Compartilhada feature spec |
| [CLAUDE-CODE.md](./CLAUDE-CODE.md) | Claude Code + MCP configuration guide |
| [BACKEND.md](./BACKEND.md) | API routes and server-side services reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment and environment variables |
| [N8N-COACH-SETUP.md](./N8N-COACH-SETUP.md) | n8n automation flows (ingest, coach, Telegram) |

## Repository structure

```
finance/
├── apps/
│   ├── web/              # Next.js 14 App Router — SaaS web frontend
│   │   ├── src/app/      # Pages and API routes
│   │   ├── src/lib/      # Shared services (score, notifications, household…)
│   │   ├── src/components/
│   │   ├── src/hooks/
│   │   └── src/stores/   # Zustand client store
│   └── ios/              # Swift + SwiftUI iOS app (in progress)
├── doc/                  # This documentation folder
└── n8n/                  # n8n flow exports
```

## Tech stack

| Layer | Technology |
|---|---|
| **Web framework** | Next.js 14 (App Router, server components + route handlers) |
| **Styling** | Tailwind CSS + dark mode + container queries |
| **Client state** | Zustand (synced with server via `/api/store`) |
| **Charts** | Recharts |
| **Auth** | Custom JWT (jose) — `financeapp_session` cookie, HS256 |
| **Persistence** | Upstash Redis (KV) — falls back to `/tmp` in local dev |
| **AI / Chat** | OpenAI GPT-4.1 via `/api/coach/chat` (streaming) |
| **Automations** | n8n — transaction ingest, AI coach Telegram bot, notifications |
| **Hosting** | Vercel (Next.js, Fluid Compute, cron jobs) |
| **iOS** | Swift 5.9, SwiftUI |

## Feature summary (v1.9.0)

### Core (v1.0–1.2)
- Dashboard with KPIs, cash-flow chart, category breakdown
- Transaction management with add / edit / delete
- Account management with real-time balance updates
- REST ingest API (`POST /api/ingest/transactions`) secured by `x-api-key`
- n8n integration for automated transaction entry
- JWT authentication with persistent sessions

### User management (v1.3)
- Multi-user with email verification at sign-up
- Admin and regular user roles
- Upstash Redis for cross-instance data persistence

### Recurring transactions & admin (v1.4–1.5)
- Monthly and yearly recurring transactions with commitment preview
- Admin panel: inline user editing (name, username, email, password)

### AI Financial Coach (v1.6)
- GPT-4.1 chat with real user data context
- Streaming responses (server-sent events)
- Telegram channel via n8n webhook

### Casa Compartilhada / Shared Household (v1.7)
- Link two user accounts into a shared household
- Combined dashboard with stacked category chart
- Auto-calculated monthly settlement (who owes whom)
- Month-close with historical navigation
- Invite flow via shareable link

### Multi-user n8n routing & mobile (v1.8)
- Transaction `source` field: `telegram` vs `manual`
- Telegram badge on transaction list
- Mobile logout button
- n8n payload `user_email` / `username` field for multi-user routing

### Financial Health Score & Notifications (v1.9)
- **Score engine** — 5 dimensions, 0–100 total:
  - Taxa de poupança (0–25 pts)
  - Controle de gastos (0–25 pts)
  - Reserva de emergência (0–20 pts)
  - Saúde financeira / debt ratio (0–20 pts)
  - Consistência semanal / streak (0–10 pts)
- **5 tiers**: Iniciante → Básico → Bom → Ótimo → Excelente
- **14 unlockable badges** (savings rate, emergency fund, streaks, score thresholds, household, Telegram)
- **12-month score history** stored in Redis
- **Streak protection**: one freeze per month
- `/score` page: animated SVG ring, dimension bars, history chart, badge grid
- Score widget on Dashboard
- **Notification system**: in-app + Telegram (anti-spam: quiet hours, daily cap, per-type toggles)
- Notification bell in topbar with unread count and dropdown
- Settings → Notificações: Telegram connect via deep link + per-type toggle controls
- Vercel cron: `/api/cron/health-score` — runs every Monday 07:00 UTC

## API routes (web)

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | Issue session cookie |
| POST | `/api/auth/logout` | public | Clear session cookie |
| GET | `/api/auth/me` | session | Current user info |
| GET/PUT | `/api/store` | session | Read/write full user data store |
| POST | `/api/ingest/transactions` | x-api-key | Receive transactions from n8n |
| POST | `/api/coach/chat` | session | AI coach streaming chat |
| GET | `/api/household` | session | Current household info |
| POST | `/api/household/invite` | session | Generate invite link |
| POST/GET | `/api/household/settlement` | session | Close/get monthly settlement |
| GET | `/api/health-score` | session | Compute or return cached score |
| GET | `/api/health-score/history` | session | Up to 12 months of score history |
| POST | `/api/health-score/streak-freeze` | session | Use monthly streak protection |
| GET | `/api/badges` | session | All 14 badges with earned status |
| GET | `/api/notifications` | session | Paginated notification list |
| PUT | `/api/notifications/:id/read` | session | Mark notification read |
| GET/PUT | `/api/notifications/preferences` | session | Read/update notification prefs |
| POST | `/api/notifications/telegram-connect` | x-api-key | Link Telegram chat ID (called by n8n) |
| GET | `/api/users/telegram-link` | session | Generate Telegram bot deep link |
| GET | `/api/cron/health-score` | CRON_SECRET | Recompute score for all users |

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | yes | HS256 signing key for session tokens |
| `UPSTASH_REDIS_REST_URL` | yes (prod) | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | yes (prod) | Upstash Redis auth token |
| `OPENAI_API_KEY` | yes | GPT-4.1 for AI coach |
| `TELEGRAM_BOT_USERNAME` | no | Telegram bot username for deep links |
| `N8N_NOTIFICATION_WEBHOOK_URL` | no | n8n webhook for outbound notifications |
| `N8N_NOTIFICATION_WEBHOOK_KEY` | no | Shared secret for notification webhook |
| `CRON_SECRET` | no | Bearer token protecting the cron route |
| `INGEST_API_KEY` | yes | x-api-key for transaction ingest |
