# FinanceApp — AI Financial Coach Feature

## Project context

You are working on **FinanceApp**, a personal finance SaaS platform for Brazilian users.
Repository: https://github.com/moliveira902/finance
Stack: Node.js 20 + Express + TypeScript + Prisma + PostgreSQL + Redis + Next.js 14 + SwiftUI

The existing codebase already has:
- Auth0 JWT authentication on all routes
- Prisma ORM with tables: `users`, `accounts`, `transactions`, `categories`, `budgets`, `budget_periods`
- Redis (Upstash) for caching
- A working categorisation service that calls an AI API
- Route structure under `packages/api/src/`
- Background worker under `packages/worker/src/`

---

## Feature to build: AI Financial Coach ("Meu Consultor")

Build a conversational AI financial coach that gives the user personalised analysis
of their spending, income, budgets, and financial goals.

**The AI model is GPT-4.1** (OpenAI). Use the model string `gpt-4.1`.
Do NOT use Claude or Anthropic API for this feature.

The coach must support **two interaction channels**:

### Channel 1 — In-app (browser and iOS)
A chat UI embedded in the web app and iOS app. The user types a message,
the API streams a response, and the conversation history is maintained
within the session.

### Channel 2 — Telegram via n8n
The user sends a message to a Telegram bot. n8n calls a webhook endpoint
on the FinanceApp API. The API processes it identically to the in-app channel
and returns a plain-text response (no streaming — n8n expects a synchronous JSON reply).

---

## Tasks

### Task 1 — Install OpenAI SDK

```bash
cd packages/api
pnpm add openai
```

---

### Task 2 — Environment variable

Add to `packages/api/.env` and `packages/api/.env.example`:

```
OPENAI_API_KEY=sk-...
```

Add to `.claude/CLAUDE.md`:
```
AI model for coach: GPT-4.1 (OpenAI) — model string: gpt-4.1
OpenAI SDK import: import OpenAI from 'openai'
```

---

### Task 3 — Create `buildFinancialContext(userId)`

**File:** `packages/api/src/services/coachContext.ts`

Run these 5 Prisma queries in parallel using `Promise.all`:

1. **Monthly totals** — last 6 months, group by month, sum income_cents and expense_cents
   - income: rows where `amount_cents > 0`
   - expense: rows where `amount_cents < 0` (use ABS)
   - filter: `user_id = userId`, `deleted_at IS NULL`, `transaction_date >= 6 months ago`

2. **Category breakdown** — current month only, expenses only, grouped by category name, top 8 by total, include category name via join

3. **Active budgets with utilisation** — `isActive: true`, include the current `budget_period` (where `periodStart <= now <= periodEnd`), include `category.name`

4. **Recent transactions** — last 20, ordered by `transactionDate DESC`, include `category.name`

5. **Account balances** — all non-archived accounts, select `name`, `type`, `balanceCents`

From the raw results, compute:
- `avgMonthlyExpense` — average of monthly expense_cents over 6 months
- `avgMonthlyIncome` — average of monthly income_cents over 6 months
- `avgMonthlySaving` — avgMonthlyIncome minus avgMonthlyExpense
- `totalBalance` — sum of all account balanceCents
- `currentMonthExpense` — expense_cents of the most recent month entry
- `topCategory` — name of highest category this month
- `topCategoryAmount` — amount of highest category this month

Cache the result in Redis under key `coach:context:{userId}` with TTL 300 seconds (5 minutes).

Return the full assembled context object.

---

### Task 4 — Create `buildSystemPrompt(ctx, userName)`

**File:** `packages/api/src/services/coachContext.ts` (same file, exported function)

Serialise the context object into a system prompt string in Portuguese.

The prompt must:
- Address the user by `userName`
- Instruct the model to respond always in Portuguese, directly and without jargon
- Instruct the model to base all analysis ONLY on the provided data — never invent numbers
- Include all sections: situação atual, histórico mensal, gastos por categoria, orçamentos ativos, contas, últimas transações
- Format all monetary values as `R$ X.XXX,XX` (Brazilian format)
- Mark budgets that are over 100% utilisation with a note "(ESTOURADO)"
- Keep the prompt under 2000 tokens — abbreviate transaction descriptions if needed

---

### Task 5 — Create `CoachService`

**File:** `packages/api/src/services/CoachService.ts`

Export two functions:

#### `chatStream(userId, message, history)`
Used by the in-app channel (browser + iOS). Returns an OpenAI stream.

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function chatStream(userId: string, message: string, history: ChatMessage[]) {
  // 1. Get context (from Redis cache or build fresh)
  // 2. Get user name from DB
  // 3. Build system prompt
  // 4. Call openai.chat.completions.create with stream: true
  //    model: 'gpt-4.1'
  //    max_tokens: 600
  //    messages: [{ role: 'system', content: systemPrompt }, ...history.slice(-10), { role: 'user', content: message }]
  // 5. Return the stream object
}
```

#### `chatSync(userId, message, history)`
Used by the n8n/Telegram channel. Returns a plain string (awaits full response).

```typescript
export async function chatSync(userId: string, message: string, history: ChatMessage[]) {
  // Same as chatStream but stream: false
  // Await the full completion
  // Return response.choices[0].message.content as string
}
```

Both functions must handle OpenAI API errors gracefully:
- Rate limit (429): return a friendly Portuguese error message
- Invalid key (401): log and throw — do not expose to user
- Any other error: log with request ID, return "Desculpe, não consegui processar sua pergunta agora. Tente novamente."

---

### Task 6 — Create route: in-app streaming

**File:** `packages/api/src/routes/coach.ts`

```
POST /v1/coach/chat
```

- Requires valid Auth0 JWT (use existing `checkJwt` middleware)
- Request body: `{ message: string, history: ChatMessage[] }`
- Validate with Zod: `message` required string max 500 chars, `history` optional array max 20 items
- Call `chatStream(userId, message, history)`
- Stream response using SSE (Server-Sent Events):
  - Set headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`
  - For each chunk: write `data: ${JSON.stringify({ text: chunk })}\n\n`
  - On finish: write `data: [DONE]\n\n` then `res.end()`
- Register route in `packages/api/src/app.ts`

---

### Task 7 — Create route: n8n webhook (Telegram channel)

**File:** `packages/api/src/routes/coach.ts` (add to same file)

```
POST /v1/coach/webhook
```

- Auth: static API key in header `x-api-key` (validated against `process.env.N8N_COACH_WEBHOOK_KEY`)
  - This route does NOT use Auth0 JWT — n8n uses the static key
- Request body:
  ```json
  {
    "userId": "auth0|xxx",
    "message": "quanto gastei esse mês?",
    "history": []
  }
  ```
- Validate with Zod: `userId` required string, `message` required string max 500 chars
- Call `chatSync(userId, message, history ?? [])`
- Return JSON synchronously:
  ```json
  {
    "ok": true,
    "reply": "Você gastou R$ 3.847,00 este mês..."
  }
  ```
- On error return: `{ "ok": false, "reply": "Desculpe, não consegui processar agora." }`
- Add `N8N_COACH_WEBHOOK_KEY` to `.env.example`

---

### Task 8 — Cache invalidation

**File:** `packages/api/src/services/transactionService.ts` (or wherever transactions are created/deleted)

After any transaction create, update, or delete, add:

```typescript
await redis.del(`coach:context:${userId}`);
```

This ensures the coach context is always fresh after new data arrives.

---

### Task 9 — TypeScript types

**File:** `packages/shared-types/src/coach.ts`

```typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CoachWebhookRequest {
  userId: string;
  message: string;
  history?: ChatMessage[];
}

export interface CoachWebhookResponse {
  ok: boolean;
  reply: string;
}

export interface FinancialContext {
  totalBalance: number;
  avgMonthlyExpense: number;
  avgMonthlyIncome: number;
  avgMonthlySaving: number;
  currentMonthExpense: number;
  topCategory: string;
  topCategoryAmount: number;
  monthlyTotals: MonthlyTotal[];
  categoryBreakdown: CategoryTotal[];
  budgets: BudgetWithPeriod[];
  recentTransactions: TransactionWithCategory[];
  accounts: AccountSummary[];
}
```

---

### Task 10 — Web frontend: coach chat component

**File:** `apps/web/components/coach/CoachChat.tsx`

Build a React component with:
- A scrollable message list showing `user` and `assistant` bubbles
- An input field + send button at the bottom
- On send: POST to `/v1/coach/chat` and consume the SSE stream
  - Use `fetch` with `ReadableStream` to parse `data:` lines
  - Append each text chunk to the current assistant bubble in real time (streaming effect)
- Conversation history maintained in component state (last 10 turns sent to API)
- Loading state while waiting for first chunk
- Quick suggestion chips below the input (4 chips):
  - "Quanto gastei esse mês?"
  - "Estou economizando?"
  - "Onde posso cortar gastos?"
  - "Qual meu saldo atual?"
- Each chip populates the input and submits on click
- Style with Tailwind CSS — chat bubbles, clean minimal UI

**File:** `apps/web/app/coach/page.tsx`

Add a `/coach` page that renders `<CoachChat />` wrapped in the authenticated layout.

---

### Task 11 — n8n workflow instructions (README only, no code)

**File:** `docs/N8N-COACH-SETUP.md`

Write setup instructions for configuring the n8n workflow:

1. Telegram Trigger node — fires on new message
2. HTTP Request node — POST to `https://[your-api-url]/v1/coach/webhook`
   - Header: `x-api-key: {{$env.N8N_COACH_WEBHOOK_KEY}}`
   - Body: `{ userId: "{{$env.FINANCEAPP_USER_ID}}", message: "{{$json.message.text}}", history: [] }`
3. Telegram node — send reply: `{{$json.reply}}`

Note: for the Telegram channel, history is not maintained between sessions (stateless).
For persistent history via Telegram, the n8n workflow would need to store and retrieve
conversation history from a database or n8n memory node — mark this as a future enhancement.

---

## Constraints and conventions to follow

- All monetary values stored and computed in **centavos** (integers) — never floats
- All dates in UTC internally, display in `America/Sao_Paulo` timezone
- All user-facing text in **Portuguese (BR)**
- Error messages to the user must never expose stack traces, API keys, or internal details
- Use existing `prisma` client instance — do not create a new one
- Use existing `redis` client instance — do not create a new one
- Use existing `checkJwt` middleware for Auth0 protected routes
- Follow existing route file patterns (Express Router, async handlers with try/catch)
- Add Zod validation to every new route — match existing patterns in `packages/api/src/routes/`
- Do not modify the database schema — all data needed exists in current tables
- GPT-4.1 model string is exactly: `gpt-4.1`
- Max tokens for coach responses: 600 (keeps responses concise and cost-efficient)
- System prompt must be under 2000 tokens to leave room for conversation history

---

## Acceptance criteria

The feature is complete when:

1. `POST /v1/coach/chat` streams a personalised Portuguese response grounded in the user's real DB data
2. `POST /v1/coach/webhook` returns a synchronous JSON reply that n8n can forward to Telegram
3. Sending a message via Telegram bot reaches the same coach logic as the in-app chat
4. Creating a new transaction invalidates the coach context cache
5. The `/coach` page renders in the web app with streaming chat and suggestion chips
6. All new code passes TypeScript strict mode — zero `any` types
7. The OpenAI API key is never logged or exposed in responses
