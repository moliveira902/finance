# Familio Scheduler Integration

Sends a weekly expense summary from Finance to the Familio family scheduler as a calendar event. Finance POSTs to Familio's `/api/finance` endpoint on a configurable day of the week.

---

## Overview

| Item | Value |
|---|---|
| Familio endpoint | `https://familio-git-master-moliveira902-5664s-projects.vercel.app/api/finance` |
| Method | `POST` |
| App-level API key | `fam_d3e87d2f030713433d95c7025cd768b989b9c2baa98f8d2c` |
| Cron schedule | Daily at 12:00 UTC (09:00 BRT) — fires only on the configured weekday |
| Default send day | Sunday |
| Timezone | BRT (UTC−3) for all day-of-week and date calculations |

---

## Environment Variables

Set these in the Finance project on Vercel → Settings → Environment Variables.

| Variable | Description |
|---|---|
| `FAMILIO_ENDPOINT` | Familio API URL (falls back to the URL above if unset) |
| `FAMILIO_API_KEY` | App-level API key sent as `x-api-key` and `Authorization: Bearer` |
| `FAMILIO_BYPASS_TOKEN` | Vercel deployment-protection bypass token — **different from the API key**. Obtain from: Familio project → Vercel Dashboard → Settings → Deployment Protection → Protection Bypass for Automation |

---

## Request Headers

```
Content-Type: application/json
x-api-key: <FAMILIO_API_KEY>
Authorization: Bearer <FAMILIO_API_KEY>
x-vercel-protection-bypass: <FAMILIO_BYPASS_TOKEN>
```

---

## Payload

```json
{
  "summary": {
    "title": "Weekly Finance Summary",
    "totalExpenses": 3250.00,
    "currency": "BRL",
    "period": "2026-05-18/2026-05-24",
    "categories": [
      { "name": "Alimentação", "amount": 980.00 },
      { "name": "Saúde",       "amount": 640.00 },
      { "name": "Transporte",  "amount": 420.00 }
    ],
    "note": "8% above last week."
  },
  "date": "2026-05-25",
  "assignedTo": "Marcio"
}
```

### Field reference

| Field | Type | Description |
|---|---|---|
| `summary.title` | string | Fixed: `"Weekly Finance Summary"` |
| `summary.totalExpenses` | number | Sum of all expenses in the current Mon–Sun week, rounded to 2 decimal places |
| `summary.currency` | string | Fixed: `"BRL"` |
| `summary.period` | string | `"YYYY-MM-DD/YYYY-MM-DD"` — Monday to Sunday of the current week |
| `summary.categories` | array | Per-category expense totals, sorted descending by amount |
| `summary.note` | string | Week-over-week delta, e.g. `"8% above last week."` or `"First week with recorded data."` |
| `date` | string | BRT date of the configured send day (next occurrence if today doesn't match — ensures the Familio calendar event always lands on the correct weekday) |
| `assignedTo` | string | Familio family member name configured by the user (defaults to `"Family"`) |

### Note format in Familio calendar event

Familio renders the `note` field as the event description. The format is:

```
Alimentação: BRL 980.00
Saúde: BRL 640.00
Transporte: BRL 420.00

8% above last week.
```

Categories listed one per line (descending by amount), blank line, then the delta note.

---

## Finance API Routes

### `POST /api/familio/send`

Authenticated (session cookie). Builds the weekly summary from the user's transaction store and sends it to Familio immediately.

**Request body** (all fields optional):
```json
{ "assignedTo": "Marcio" }
```

**Success response** (`200`):
```json
{
  "ok": true,
  "payload": { ... },
  "familioResponse": "..."
}
```

**Error response** (`502`):
```json
{
  "ok": false,
  "payload": { ... },
  "error": "Familio returned 401: ..."
}
```

Persists `lastPayload` and (on success) `lastSentAt` to the user's prefs in KV regardless of Familio's response, so the payload viewer in Settings always reflects the latest attempt.

---

### `GET /api/familio/config`

Returns the current Familio configuration for the authenticated user.

**Response**:
```json
{
  "familioConfig": {
    "enabled": true,
    "sendDay": 0,
    "assignedTo": "Marcio",
    "lastSentAt": "2026-05-25T12:00:00.000Z",
    "lastPayload": "{ ... }"
  }
}
```

---

### `PUT /api/familio/config`

Updates the Familio configuration for the authenticated user.

**Request body** (all fields optional):
```json
{
  "enabled": true,
  "sendDay": 0,
  "assignedTo": "Marcio"
}
```

**Response**: `{ "ok": true, "familioConfig": { ... } }`

---

### `GET /api/cron/familio`

Daily cron endpoint. Requires `Authorization: Bearer <CRON_SECRET>` header.

Iterates all users, checks if today's BRT day-of-week matches each user's `sendDay`, and dispatches the summary to Familio for matching users.

**Response**:
```json
{
  "ok": true,
  "todayDow": 0,
  "processed": 2,
  "results": [
    { "userId": "...", "action": "sent" },
    { "userId": "...", "action": "skipped:disabled" }
  ]
}
```

Possible `action` values: `sent`, `failed:<status>:<body>`, `skipped:disabled`, `skipped:wrong_day(N≠M)`, `error`.

---

## User Preferences Schema

`familioConfig` is stored inside `UserPrefs` in Upstash Redis under key `user_prefs:{userId}`.

```typescript
interface FamilioConfig {
  enabled:      boolean;   // master toggle
  sendDay:      number;    // 0=Sun, 1=Mon, … 6=Sat
  assignedTo:   string;    // Familio family member name
  lastSentAt?:  string;    // ISO timestamp of last successful send
  lastPayload?: string;    // JSON string of last sent payload
}
```

---

## Settings UI

**Location**: Settings → Integrations → Familio card

| Control | Description |
|---|---|
| Toggle | Enable / disable the integration |
| Day selector | Dropdown with all 7 days (Domingo … Sábado); controls both cron check and calendar event date |
| Assigned-to field | Free-text name of the Familio member who receives the event |
| Salvar button | Persists enable, sendDay, assignedTo via `PUT /api/familio/config` |
| Testar envio button | Calls `POST /api/familio/send` immediately; shows success/error feedback |
| Ver último payload | Toggles display of the last JSON payload sent to Familio |

---

## Cron Schedule

Registered in `vercel.json`:

```json
{ "path": "/api/cron/familio", "schedule": "0 12 * * *" }
```

Runs at 12:00 UTC = 09:00 BRT every day. The route compares today's BRT day-of-week against each user's `sendDay` and only dispatches on a match.

---

## Familio Side — `api/finance.js`

Familio's handler validates the request, inserts a calendar event into Supabase, and logs the webhook call.

**Auth**: reads `Authorization: Bearer <token>`, queries `user_settings` table matching `n8n_config->>finance_api_key = token`.

**Person mapping**: `assignedTo` is lowercased and matched against `{ marcio: '1', jen: '2', gui: '3' }`. Unmatched values are passed through as-is.

**Event row inserted into `events`**:

| Column | Value |
|---|---|
| `title` | `summary.title` |
| `date` | `body.date` |
| `start_time` / `end_time` | `11:00` / `12:00` |
| `all_day` | `false` |
| `person` | mapped person ID or raw value |
| `category` | `"finance"` |
| `note` | formatted categories + delta note |

A row is also written to `webhook_logs` with `trigger_type: "finance_summary"` and the full payload.

---

## Known Issues Fixed

| Issue | Fix |
|---|---|
| `FUNCTION_INVOCATION_FAILED` 500 | `supabase.from().insert().catch()` is invalid in Supabase JS v2 — replaced with `try { await ... } catch {}` in Familio's `api/finance.js` |
| Event on wrong calendar day | `date` was `isoDate(new Date())` (UTC "today") — replaced with `brtDateForSendDay(sendDay)` which computes the BRT date of the next occurrence of the configured weekday |
| 401 from Familio endpoint | Familio is a Vercel preview deployment with SSO protection — fixed by adding `x-vercel-protection-bypass: <FAMILIO_BYPASS_TOKEN>` header; token must match the one set in Familio's Vercel project under Deployment Protection |
