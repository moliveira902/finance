# n8n Workflow — Meu Consultor via Telegram

This document describes how to configure the n8n workflow that connects a Telegram bot to the FinanceApp AI Financial Coach.

## Prerequisites

- A Telegram bot token (create one via [@BotFather](https://t.me/BotFather))
- `N8N_COACH_WEBHOOK_KEY` set in both Vercel environment variables and n8n credentials
- `FINANCEAPP_USER_ID` — the Auth0/internal user ID for the Telegram user (e.g. `auth0|xxx`)

## Workflow Nodes

### 1. Telegram Trigger

- **Node type:** Telegram Trigger
- **Event:** Message
- This fires whenever the linked Telegram bot receives a message.

### 2. HTTP Request — POST to FinanceApp Coach Webhook

- **Node type:** HTTP Request
- **Method:** POST
- **URL:** `https://[your-api-url]/api/coach/webhook`
- **Authentication:** None (handled via custom header below)
- **Headers:**
  ```
  x-api-key: {{ $env.N8N_COACH_WEBHOOK_KEY }}
  Content-Type: application/json
  ```
- **Body (JSON):**
  ```json
  {
    "userId": "{{ $env.FINANCEAPP_USER_ID }}",
    "message": "{{ $json.message.text }}",
    "history": []
  }
  ```
- The endpoint returns `{ "ok": true, "reply": "..." }` synchronously.

### 3. Telegram — Send Reply

- **Node type:** Telegram
- **Operation:** Send Message
- **Chat ID:** `{{ $('Telegram Trigger').item.json.message.chat.id }}`
- **Text:** `{{ $json.reply }}`

## Notes

- **Stateless history:** Each Telegram message is sent with an empty `history` array. The coach answers based on real financial data but has no memory of previous Telegram messages.
- **Persistent history (future enhancement):** To maintain conversation history across messages, add an n8n Memory node or store history in a database between requests. Tag the history by Telegram `chat.id`.
- **Multi-user setup:** If multiple users need Telegram access, create one n8n workflow per user or pass `userId` dynamically from a lookup table keyed by Telegram user ID.

## Environment Variables

| Variable | Where to set |
|---|---|
| `N8N_COACH_WEBHOOK_KEY` | Vercel + n8n credentials |
| `FINANCEAPP_USER_ID` | n8n environment variable |
