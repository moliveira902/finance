# SETUP.md — VSCode Environment Setup

Complete step-by-step procedure to set up your development environment from zero to running.

---

## Prerequisites

Before starting, install the following on your machine:

| Tool | Version | Install |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| pnpm | 8+ | `npm install -g pnpm` |
| Docker Desktop | latest | https://docker.com |
| Git | 2.40+ | https://git-scm.com |
| AWS CLI | v2 | https://aws.amazon.com/cli |
| Terraform | 1.6+ | https://terraform.io |
| Xcode | 15+ | Mac App Store (iOS only) |

---

## Step 1 — Install VSCode extensions

Open VSCode, press `Cmd+Shift+X` (Mac) or `Ctrl+Shift+X` (Windows/Linux), and install:

### Essential extensions

```
# Core language support
dbaeumer.vscode-eslint
esbenp.prettier-vscode
ms-vscode.vscode-typescript-next

# Database
Prisma.prisma

# Styling
bradlc.vscode-tailwindcss

# API testing
humao.rest-client
rangav.vscode-thunder-client

# Git
eamodio.gitlens

# Docker & AWS
ms-azuretools.vscode-docker
amazonwebservices.aws-toolkit-vscode

# Productivity
christian-kohler.path-intellisense
formulahendry.auto-rename-tag
```

Install all at once via terminal:

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension Prisma.prisma
code --install-extension bradlc.vscode-tailwindcss
code --install-extension humao.rest-client
code --install-extension rangav.vscode-thunder-client
code --install-extension eamodio.gitlens
code --install-extension ms-azuretools.vscode-docker
code --install-extension amazonwebservices.aws-toolkit-vscode
code --install-extension christian-kohler.path-intellisense
```

### Claude Code extension

```bash
# Install from VSCode marketplace
code --install-extension anthropic.claude-code
```

Or search "Claude Code" in the Extensions panel.

---

## Step 2 — Clone and bootstrap the repository

```bash
# Clone
git clone https://github.com/moliveira902/finance.git
cd financeapp

# Install all workspace dependencies
pnpm install

# Copy environment templates
cp apps/web/.env.example apps/web/.env.local
cp packages/api/.env.example packages/api/.env
cp packages/worker/.env.example packages/worker/.env
```

---

## Step 3 — Configure VSCode workspace settings

Create `.vscode/settings.json` in the repo root:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "prisma.showPrismaDataPlatformNotification": false,
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]
  ],
  "files.associations": {
    "*.env*": "dotenv"
  },
  "editor.rulers": [100],
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true
  }
}
```

Create `.vscode/extensions.json` so VSCode recommends extensions to teammates:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "Prisma.prisma",
    "bradlc.vscode-tailwindcss",
    "humao.rest-client",
    "eamodio.gitlens",
    "ms-azuretools.vscode-docker",
    "anthropic.claude-code"
  ]
}
```

---

## Step 4 — Start local services with Docker

```bash
# Start PostgreSQL + Redis locally
docker compose up -d

# Verify containers are running
docker compose ps
```

`docker-compose.yml` (place in repo root):

```yaml
version: '3.9'
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: finance
      POSTGRES_PASSWORD: finance_dev
      POSTGRES_DB: financeapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

---

## Step 5 — Configure environment variables

Edit `packages/api/.env`:

```dotenv
# Database
DATABASE_URL="postgresql://finance:finance_dev@localhost:5432/financeapp"
REDIS_URL="redis://localhost:6379"

# Auth0
AUTH0_DOMAIN="your-tenant.auth0.com"
AUTH0_CLIENT_ID="..."
AUTH0_CLIENT_SECRET="..."
AUTH0_AUDIENCE="https://api.financeapp.com.br"

# Claude API
ANTHROPIC_API_KEY="sk-ant-..."

# App
NODE_ENV="development"
PORT=3001
JWT_SECRET="dev-secret-change-in-production"
```

Edit `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_AUTH0_DOMAIN="your-tenant.auth0.com"
NEXT_PUBLIC_AUTH0_CLIENT_ID="..."
NEXT_PUBLIC_AUTH0_REDIRECT_URI="http://localhost:3000/callback"
```

---

## Step 6 — Run database migrations

```bash
# Navigate to the API package
cd packages/api

# Generate Prisma client
pnpm prisma generate

# Run migrations (creates all tables)
pnpm prisma migrate dev --name init

# Seed with test data (optional)
pnpm prisma db seed
```

---

## Step 7 — Start the development servers

Open three terminal tabs in VSCode (`Ctrl+~` to toggle terminal):

**Tab 1 — API server:**
```bash
cd packages/api
pnpm dev
# Runs on http://localhost:3001
```

**Tab 2 — Web frontend:**
```bash
cd apps/web
pnpm dev
# Runs on http://localhost:3000
```

**Tab 3 — Background worker:**
```bash
cd packages/worker
pnpm dev
# Processes queued jobs
```

Or use the VSCode task runner. Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start all services",
      "dependsOn": ["API", "Web", "Worker"],
      "group": { "kind": "build", "isDefault": true }
    },
    {
      "label": "API",
      "type": "shell",
      "command": "pnpm dev",
      "options": { "cwd": "${workspaceFolder}/packages/api" },
      "presentation": { "panel": "dedicated", "reveal": "always" }
    },
    {
      "label": "Web",
      "type": "shell",
      "command": "pnpm dev",
      "options": { "cwd": "${workspaceFolder}/apps/web" },
      "presentation": { "panel": "dedicated", "reveal": "always" }
    },
    {
      "label": "Worker",
      "type": "shell",
      "command": "pnpm dev",
      "options": { "cwd": "${workspaceFolder}/packages/worker" },
      "presentation": { "panel": "dedicated", "reveal": "always" }
    }
  ]
}
```

Run with `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows).

---

## Step 8 — Verify everything is running

```bash
# API health check
curl http://localhost:3001/health
# Expected: {"status":"ok","db":"connected","redis":"connected"}

# Open web app
open http://localhost:3000

# View API docs (Swagger)
open http://localhost:3001/docs
```

---

## Step 9 — Configure AWS CLI (for deployment)

```bash
# Configure credentials
aws configure
# Enter: Access Key ID, Secret Access Key, region: sa-east-1, format: json

# Verify
aws sts get-caller-identity
```

---

## Troubleshooting

**Port already in use:**
```bash
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Prisma migration fails:**
```bash
# Reset the database (dev only)
pnpm prisma migrate reset
```

**Docker containers not starting:**
```bash
docker compose down -v
docker compose up -d
```

**TypeScript errors after pulling:**
```bash
pnpm install
pnpm prisma generate
```
