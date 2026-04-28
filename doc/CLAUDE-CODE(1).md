# CLAUDE-CODE.md — Claude Code + MCP Configuration

How to configure Claude Code and MCP servers for maximum productivity on this project.

---

## Install Claude Code

```bash
# Install globally via npm
npm install -g @anthropic-ai/claude-code

# Verify
claude --version
```

Or use the VSCode extension: search "Claude Code" in the Extensions panel and install `anthropic.claude-code`.

---

## Authenticate Claude Code

```bash
# Login — opens browser for Anthropic authentication
claude auth login

# Verify authenticated
claude auth status
```

---

## MCP Server Configuration

MCP (Model Context Protocol) servers give Claude Code direct access to your project's data sources — database, filesystem, GitHub, and external APIs. Configure them in `.claude/mcp.json` at the repository root.

### Create the config file

```bash
mkdir -p .claude
touch .claude/mcp.json
```

`.claude/mcp.json`:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/PATH/TO/YOUR/financeapp"],
      "description": "Read and write project files"
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://finance:finance_dev@localhost:5432/financeapp"
      },
      "description": "Query the local PostgreSQL database directly"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN"
        },
        "description": "Manage PRs, issues at https://github.com/moliveira902/finance"
    },
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"],
      "description": "Make HTTP requests — used to test Bradesco and B3 sandbox APIs"
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "YOUR_BRAVE_API_KEY"
      },
      "description": "Search Open Finance Brasil and B3 documentation"
    }
  }
}
```

> Replace `/PATH/TO/YOUR/financeapp` with the absolute path to your repo root.

### Install MCP server packages

```bash
# Install all MCP servers globally so npx resolves them instantly
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-postgres
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-fetch
npm install -g @modelcontextprotocol/server-brave-search
```

### Verify MCP servers are running

```bash
# Start Claude Code and check connected servers
claude mcp list
```

---

## Claude Code in VSCode

### Opening Claude Code panel

- Press `Cmd+Shift+P` → type "Claude" → select "Claude: Open Chat"
- Or click the Claude icon in the activity bar (left sidebar)

### Key Claude Code commands

| Command | What it does |
|---|---|
| `/review` | Review the current file or selection for bugs and improvements |
| `/explain` | Explain selected code in plain language |
| `/test` | Generate unit tests for selected functions |
| `/fix` | Fix the current lint or type error |
| `/commit` | Generate a conventional commit message from staged changes |
| `/pr` | Draft a pull request description |

### Useful prompts for this project

```
# Generate a new Prisma migration
Create a Prisma migration that adds the consents table with fields:
id, user_id, institution, consent_id, scopes, expires_at, revoked_at

# Scaffold an API route
Create an Express route handler for GET /v1/transactions that:
- validates JWT from Auth0
- accepts query params: startDate, endDate, category
- queries PostgreSQL via Prisma
- returns paginated results

# Write a unit test
Write Jest tests for the transaction categorisation service in
packages/api/src/services/categorisation.ts

# Debug a database query
The following Prisma query is returning duplicate rows — identify the issue
and rewrite it: [paste query]

# Review a PR diff
Review this diff for security issues, especially around JWT validation
and SQL injection: [paste diff]
```

---

## Claude Code `.claudeignore`

Create `.claudeignore` at the repo root so Claude doesn't read sensitive or irrelevant files:

```
# Secrets and credentials
.env
.env.*
*.pem
*.key
*.p12
secrets/

# Build artifacts
.next/
dist/
build/
node_modules/
.pnpm-store/

# Generated files
packages/api/src/generated/
apps/web/.next/

# Large data files
*.sql.gz
*.dump
data/
```

---

## Project-level Claude instructions

Create `.claude/CLAUDE.md` — Claude Code reads this automatically for project context:

```markdown
# FinanceApp — Claude Code context

## Project overview
Personal finance SaaS platform for Brazilian users.
Web (Next.js 14) + iOS (SwiftUI). API (Node.js + Express + Prisma).
Hosted on AWS ECS Fargate in sa-east-1 (São Paulo).

## Key conventions
- TypeScript strict mode throughout
- All API routes versioned under /v1/
- Prisma for all DB access — never raw SQL except for migrations
- Auth via Auth0 JWT — all routes require valid Bearer token unless explicitly public
- Monetary values stored as integers in centavos (BRL) — never floats
- All dates stored as UTC, displayed in America/Sao_Paulo timezone

## File structure
- packages/api/src/routes/ — Express route handlers
- packages/api/src/services/ — Business logic
- packages/api/src/middleware/ — Auth, validation, error handling
- apps/web/app/ — Next.js App Router pages
- apps/web/components/ — Shared React components

## Testing
- Jest for unit tests (packages/api)
- Playwright for E2E tests (apps/web)
- Run tests: pnpm test (from any package root)

## Do not
- Store monetary values as floats
- Write raw SQL queries outside of migrations
- Commit .env files or certificates
- Bypass Auth0 JWT validation in any route
```

---

## Workflow tips

**Let Claude Code generate your boilerplate.** When adding a new feature, describe the full requirement and ask Claude to scaffold all the layers — route, service, Prisma schema, and test file — in one go. Then review and refine.

**Use `/review` before every PR.** It catches common issues like missing error handling, unvalidated inputs, and N+1 query patterns.

**Point Claude at the MCP postgres server when debugging.** Ask Claude to query the database directly to inspect data and verify your queries are returning what you expect.

**Keep CLAUDE.md updated.** Every time you add a major new convention (e.g. a new error code pattern, a new third-party library), add a note to `.claude/CLAUDE.md` so Claude Code stays aware.
