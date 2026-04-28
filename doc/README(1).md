# FinanceApp — Project Documentation

Personal finance platform with web (SaaS) and iOS clients.

**GitHub repository:** https://github.com/moliveira902/finance

## Quick links

| Document | Purpose |
|---|---|
| [SETUP.md](./SETUP.md) | VSCode environment setup — start here |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full technical architecture reference |
| [RELEASE-1.md](./RELEASE-1.md) | R1 scope, tasks, and checklist |
| [CLAUDE-CODE.md](./CLAUDE-CODE.md) | Claude Code + MCP configuration guide |
| [DATABASE.md](./DATABASE.md) | Schema, migrations, RLS policies |
| [API.md](./API.md) | REST API endpoints reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | AWS deployment and CI/CD pipeline |

## Repository structure

```
financeapp/
├── apps/
│   ├── web/          # Next.js 14 SaaS frontend
│   └── ios/          # Swift + SwiftUI iOS app
├── packages/
│   ├── api/          # Node.js + Express backend
│   ├── shared-types/ # TypeScript types shared across apps
│   └── worker/       # Background job processor
├── infra/            # Terraform — AWS infrastructure
├── docs/             # This documentation folder
└── .claude/          # Claude Code MCP configuration
```

## Tech stack at a glance

- **Web:** Next.js 14, Tailwind CSS, Zustand, React Query
- **iOS:** Swift 5.9, SwiftUI, Keychain, APNs
- **API:** Node.js 20, Express, TypeScript, Prisma
- **Auth:** Auth0 (OAuth 2.0, JWT, MFA)
- **DB:** PostgreSQL 15 (RDS), Redis 7 (ElastiCache)
- **Hosting:** AWS ECS Fargate, sa-east-1 (São Paulo)
- **CI/CD:** GitHub Actions + Terraform
- **AI:** Claude API (transaction categorisation)
