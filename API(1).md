# API.md — REST API Reference

Base URL: `https://api.financeapp.com.br/v1`

All endpoints require `Authorization: Bearer <JWT>` from Auth0 unless marked `[public]`.

---

## Authentication

Auth0 issues JWTs. Your API validates them via JWKS endpoint.

```typescript
// Validate JWT in every request
import { auth } from 'express-oauth2-jwt-bearer';

const checkJwt = auth({
  audience: 'https://api.financeapp.com.br',
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`
});

app.use('/v1', checkJwt);
```

---

## Endpoints — Release 1

### System

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check `[public]` |
| GET | `/docs` | Swagger UI `[public]` |

### Users

| Method | Path | Description |
|---|---|---|
| GET | `/v1/me` | Get authenticated user profile |
| PUT | `/v1/me` | Update profile (name, timezone) |
| DELETE | `/v1/me` | Delete account (LGPD) |

### Accounts

| Method | Path | Description |
|---|---|---|
| GET | `/v1/accounts` | List all accounts with balances |
| POST | `/v1/accounts` | Create manual account |
| GET | `/v1/accounts/:id` | Get single account |
| PUT | `/v1/accounts/:id` | Update account |
| DELETE | `/v1/accounts/:id` | Delete account |

### Transactions

| Method | Path | Description |
|---|---|---|
| GET | `/v1/transactions` | List transactions (paginated, filterable) |
| POST | `/v1/transactions` | Create manual transaction |
| GET | `/v1/transactions/:id` | Get single transaction |
| PUT | `/v1/transactions/:id` | Update transaction |
| DELETE | `/v1/transactions/:id` | Delete transaction |
| POST | `/v1/transactions/import` | Import CSV file |

**Query params for `GET /v1/transactions`:**

```
startDate     YYYY-MM-DD
endDate       YYYY-MM-DD
categoryId    UUID
accountId     UUID
type          expense | income | transfer
source        manual | csv_import | bradesco
search        string (matches description)
page          integer (default 1)
pageSize      integer (default 50, max 200)
```

### Categories

| Method | Path | Description |
|---|---|---|
| GET | `/v1/categories` | List system + user categories |
| POST | `/v1/categories` | Create custom category |
| PUT | `/v1/categories/:id` | Update custom category |
| DELETE | `/v1/categories/:id` | Delete custom category |

### Budgets

| Method | Path | Description |
|---|---|---|
| GET | `/v1/budgets` | List budgets with current period utilisation |
| POST | `/v1/budgets` | Create budget |
| GET | `/v1/budgets/:id` | Get budget detail |
| PUT | `/v1/budgets/:id` | Update budget |
| DELETE | `/v1/budgets/:id` | Delete budget |

### Reports

| Method | Path | Description |
|---|---|---|
| GET | `/v1/reports/summary` | Monthly income vs expenses |
| GET | `/v1/reports/by-category` | Spending by category |
| GET | `/v1/reports/trend` | 12-month rolling trend |
| GET | `/v1/reports/export` | Request PDF/CSV export (async, returns job ID) |
| GET | `/v1/reports/export/:jobId` | Check export job status |

### Notifications

| Method | Path | Description |
|---|---|---|
| GET | `/v1/notifications/preferences` | Get notification preferences |
| PUT | `/v1/notifications/preferences` | Update preferences |

---

## Endpoints — Release 2 additions

### Open Finance

| Method | Path | Description |
|---|---|---|
| POST | `/v1/open-finance/consent` | Initiate consent flow, returns redirect URL |
| GET | `/v1/open-finance/callback` | OAuth callback handler |
| GET | `/v1/open-finance/consents` | List active consents |
| DELETE | `/v1/open-finance/consents/:id` | Revoke consent |
| POST | `/v1/accounts/:id/sync` | Trigger manual sync for linked account |
| GET | `/v1/accounts/:id/sync-status` | Sync status and last sync time |

### Portfolio

| Method | Path | Description |
|---|---|---|
| GET | `/v1/portfolio` | Portfolio summary: total value, P&L, allocation |
| GET | `/v1/portfolio/positions` | All positions with live prices |
| GET | `/v1/portfolio/positions/:ticker` | Single position detail |
| GET | `/v1/portfolio/dividends` | Dividend income history |
| GET | `/v1/portfolio/history` | Portfolio value over time |
| POST | `/v1/portfolio/sync` | Trigger manual B3 sync |

---

## Error format

All errors return structured JSON:

```json
{
  "error": {
    "code": "TRANSACTION_NOT_FOUND",
    "message": "Transaction with ID abc-123 not found",
    "statusCode": 404,
    "requestId": "req-xyz"
  }
}
```

### Error codes

| Code | HTTP | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Resource belongs to another user |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request body failed Zod validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `CONSENT_EXPIRED` | 400 | Open Finance consent has expired |
| `CONSENT_REVOKED` | 400 | Open Finance consent was revoked |

---

## Pagination

All list endpoints return:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 234,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

## Testing the API locally

Use the Thunder Client or REST Client VSCode extension. Create `api-tests/transactions.http`:

```http
### Create a transaction
POST http://localhost:3001/v1/transactions
Authorization: Bearer {{$dotenv AUTH_TOKEN}}
Content-Type: application/json

{
  "accountId": "{{accountId}}",
  "amountCents": -5000,
  "description": "Uber - viagem ao aeroporto",
  "transactionDate": "2025-04-15",
  "type": "expense"
}

### List transactions
GET http://localhost:3001/v1/transactions?startDate=2025-04-01&endDate=2025-04-30
Authorization: Bearer {{$dotenv AUTH_TOKEN}}
```
