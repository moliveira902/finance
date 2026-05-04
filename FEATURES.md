# FinanceApp — Release Notes

## v1.7.0 — 2026-05-04

### Shared Household Finances — "Casa Compartilhada"
- **Merge mode**: two independent FinanceApp users link their accounts into a household; each user's private dashboard is untouched
- New **"Casa"** tab in the sidebar — visible only when the user belongs to an active household
- **Household dashboard** with three summary KPIs (combined total, owner share, partner share), stacked horizontal bar chart by category (Recharts), shared transaction list with colour-coded attribution dots, and a settle-up banner at the bottom
- **Settle-up calculation**: configurable split ratio (default 50/50); banner shows who owes whom and how much; "Fechar mês" records the settlement and locks the period
- **Month navigation**: chevron selector allows reviewing historical household data month by month
- **Share toggle** on the transaction modal (shown only when user is in a household) — marks a transaction as shared with the household consolidated view
- **Invite flow**: owner enters partner's email in Settings → Membros → Casa Compartilhada; a 48-hour invite link is generated; partner visits the link and chooses Join or Merge mode
- **Invite accept page** (`/household/invite/[token]`): publicly accessible; detects if invitee is a registered user — Merge mode only offered to registered accounts; Join mode always available
- **Admin: Unir contas** — admin can directly merge two user accounts into a household from the Admin panel without an invite flow
- Privacy enforcement: partner never sees private transactions — the household dashboard issues two separate store reads and merges in application code, never in a single cross-user query
- All household data stored in Upstash Redis (`household:{id}`, `household:by-user:{userId}`, `invite:household:{token}`, `household:settlement:{id}:{month}`)

---

## v1.6.0 — 2026-05-04

### AI Financial Coach — "Meu Consultor"
- New **Meu Consultor** page accessible from the sidebar (Bot icon)
- Conversational AI coach powered by **GPT-4.1** that analyses the user's real financial data (transactions, accounts, recurring items, 6-month history)
- Responses streamed in real time using Server-Sent Events (SSE) — text appears word by word
- Four quick-suggestion chips for the most common questions
- Full conversation history maintained within the session (last 10 turns sent to the model)
- Context cached in Upstash Redis for 5 minutes; cache invalidated automatically whenever the store is updated
- **Telegram channel via n8n**: `POST /api/coach/webhook` (x-api-key auth, synchronous JSON reply) — same coach logic, same data, no streaming needed
- Setup instructions for the n8n Telegram workflow in `doc/N8N-COACH-SETUP.md`
- All responses in Portuguese (BR); monetary values formatted as R$ X.XXX,XX
- API key never logged or exposed to the client

---

## v1.5.0 — 2026-05-04

### Admin & Recurring Improvements
- Recurring transactions now support a **period count** (e.g. 12 months, 3 years); the modal shows a live total-commitment preview
- Recorrentes page cards display per-period amount, monthly equivalent and total commitment when a count is set
- Admin panel: inline **edit user** — hover any row, click the pencil, update name / username / email / password
- Admin create form: password field shown in plain text for easier testing
- Admin panel now renders inside the full app layout (sidebar, topbar, theme toggle)
- Visual profile picker replaces the plain Admin checkbox (Usuário / Administrador cards with descriptions)

---

## v1.4.0 — 2026-05-04

### Bug Fixes & Cleanup
- Account balances now update automatically when a transaction is added, edited or deleted
- Profile name and email auto-populated from JWT on first login — no longer required to fill in Settings
- All remaining Orçamento/Budget references removed from codebase
- Recurring page: removed "Em aberto / Em dia" status tracking; added monthly and annual total summary KPIs
- Dashboard: Patrimônio Líquido sub-line now shows net monthly fixed recurring costs
- Admin panel integrated into the app GUI layout

---

## v1.3.0 — 2026-05-03

### User Management System
- Self-registration flow on the login page ("Criar conta" tab) with email verification via Resend
- Two user profiles: **Administrador** (full access, can manage users) and **Usuário** (standard access)
- Admin panel at `/admin/users` — create, view and delete users (name, email, username, password)
- Admin link visible in sidebar only for users with `isAdmin = true`
- Built-in accounts: `admin / pass` (admin) and `user / pass` (demo user)
- Login accepts both username and email address
- Migrated persistence layer from Vercel KV to **Upstash Redis** (free tier, serverless-safe)

### Recurring Transactions
- Mark any transaction as recurring (monthly or yearly) with a toggle in the transaction modal
- Recorrentes page lists all recurring templates with edit / delete actions
- Dashboard shows "Recorrentes em aberto este mês" card with pending items
- Transactions list includes a Recorrentes filter tab and recurring badge

### Feature Removal
- Orçamentos (Budgets) feature fully removed — replaced by Recorrentes in the sidebar

---

## v1.2.0 — 2026-04-30

### Ingest API & Data Persistence
- Public REST ingest endpoint `POST /api/ingest/transactions` secured by `x-api-key`
- Accepts single object `{…}` or array `[{…}]` bodies (compatible with n8n default output)
- Portuguese type aliases: `"despesa"` → `"expense"`, `"receita"` → `"income"`
- Rate limiting (10 req / 60 s per IP) and structured logging on ingest
- Shared Vercel KV store replaces per-instance `/tmp` — data persists across serverless invocations
- Test page `/test-ingest` for manual API validation
- Middleware dual-layer exclusion: matcher regex + function-level fallback for edge runtimes

---

## v1.1.0 — 2026-04-29

### Core Application
- Dashboard with KPI cards (net worth, income, expenses, free balance), 6-month cash-flow chart and category breakdown pie
- Transactions page: list, filter by type/category, add/edit/delete, AI-category badge
- Accounts management: add/edit/delete accounts with live balance tracking
- Reports page: charts and summaries
- Settings: profile editing, members, notifications, clear data
- Cross-device data sync via server KV store (GET / PUT `/api/store`)
- Real-phone mobile layout + desktop "Mobile preview" simulator
- JWT authentication (`jose`), `financeapp_session` cookie, Remember Me (30-day token)
- n8n ingest route foundation

---

## v1.0.0 — 2026-04-28

### Initial Release
- Next.js 14 App Router scaffold in pnpm monorepo
- Tailwind CSS + dark mode, `@container` queries
- Zustand store with `persist` middleware (localStorage)
- Recharts for data visualisation
- Login page with branding panel
- Sidebar navigation + Topbar with viewport/theme toggles
- Mobile frame simulator for desktop preview
