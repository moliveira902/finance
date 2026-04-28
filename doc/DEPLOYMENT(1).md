# DEPLOYMENT.md — AWS Deployment and CI/CD

Infrastructure on AWS (sa-east-1 — São Paulo). IaC via Terraform. CI/CD via GitHub Actions.

---

## AWS services used

| Service | Purpose |
|---|---|
| ECS Fargate | Run API and worker containers (serverless containers) |
| ECR | Container image registry |
| RDS PostgreSQL 15 | Primary database |
| ElastiCache Redis 7 | Session cache, job queue, quote cache |
| API Gateway | Public HTTPS entry point with rate limiting |
| Secrets Manager | Credentials, Open Finance certificates |
| S3 + CloudFront | Static assets, Next.js ISR cache, file exports |
| ACM | SSL certificates |
| Route 53 | DNS |
| CloudWatch | Logs, metrics, alarms |
| WAF | Web Application Firewall |
| SES | Transactional email |

---

## CI/CD pipeline

### GitHub Actions workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Repository: https://github.com/moliveira902/finance

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 8 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build-and-push:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: sa-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build and push API image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/financeapp-api:$IMAGE_TAG ./packages/api
          docker push $ECR_REGISTRY/financeapp-api:$IMAGE_TAG

      - name: Build and push Worker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/financeapp-worker:$IMAGE_TAG ./packages/worker
          docker push $ECR_REGISTRY/financeapp-worker:$IMAGE_TAG

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: sa-east-1

      - name: Run DB migrations
        run: |
          aws ecs run-task \
            --cluster financeapp-prod \
            --task-definition financeapp-migrate \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[...],securityGroups=[...]}"

      - name: Deploy API to ECS
        run: |
          aws ecs update-service \
            --cluster financeapp-prod \
            --service financeapp-api \
            --force-new-deployment

      - name: Deploy Worker to ECS
        run: |
          aws ecs update-service \
            --cluster financeapp-prod \
            --service financeapp-worker \
            --force-new-deployment

      - name: Deploy Web to Vercel
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

---

## Terraform infrastructure

### Directory structure

```
infra/
├── main.tf
├── variables.tf
├── outputs.tf
├── modules/
│   ├── networking/    # VPC, subnets, security groups
│   ├── ecs/          # ECS cluster, services, task definitions
│   ├── rds/          # PostgreSQL RDS
│   ├── elasticache/  # Redis
│   └── cdn/          # CloudFront + S3
```

### Bootstrap Terraform

```bash
cd infra

# Configure backend (S3 for state, DynamoDB for locking)
aws s3 mb s3://financeapp-terraform-state --region sa-east-1
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region sa-east-1

# Initialise Terraform
terraform init

# Preview changes
terraform plan -var-file="production.tfvars"

# Apply
terraform apply -var-file="production.tfvars"
```

### Key Terraform resources (`main.tf` excerpt)

```hcl
# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  name    = "financeapp-vpc"
  cidr    = "10.0.0.0/16"
  azs     = ["sa-east-1a", "sa-east-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  enable_nat_gateway = true
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "financeapp-prod"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier        = "financeapp-prod"
  engine            = "postgres"
  engine_version    = "15.4"
  instance_class    = "db.t3.medium"
  allocated_storage = 100
  storage_encrypted = true
  deletion_protection = true
  backup_retention_period = 7
  multi_az          = true
}

# ElastiCache Redis
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "financeapp-redis"
  description          = "Redis for sessions and cache"
  node_type            = "cache.t3.medium"
  num_cache_clusters   = 2
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
}
```

---

## Dockerfiles

### API Dockerfile (`packages/api/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json ./
COPY packages/api/package.json ./packages/api/
COPY packages/shared-types/package.json ./packages/shared-types/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build --filter=api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/packages/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

---

## Environment variables in production

Store all secrets in AWS Secrets Manager. ECS task definitions reference them as environment variables:

```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:sa-east-1:ACCOUNT:secret:financeapp/prod/DATABASE_URL"
    },
    {
      "name": "ANTHROPIC_API_KEY",
      "valueFrom": "arn:aws:secretsmanager:sa-east-1:ACCOUNT:secret:financeapp/prod/ANTHROPIC_API_KEY"
    }
  ]
}
```

---

## Monitoring

### CloudWatch alarms to configure

```bash
# API error rate > 1%
aws cloudwatch put-metric-alarm \
  --alarm-name "API-Error-Rate" \
  --metric-name "5xxErrorRate" \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold

# DB CPU > 80%
aws cloudwatch put-metric-alarm \
  --alarm-name "RDS-High-CPU" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/RDS" \
  --threshold 80

# API P95 latency > 1000ms
aws cloudwatch put-metric-alarm \
  --alarm-name "API-High-Latency" \
  --metric-name "TargetResponseTime" \
  --threshold 1
```

---

## Deployment checklist

Before every production deployment:

- [ ] All tests passing in CI
- [ ] DB migration reviewed and tested on staging
- [ ] Migration is backward-compatible (old code + new schema must work together)
- [ ] Secrets updated in Secrets Manager if changed
- [ ] CloudWatch dashboard shows green before deploy
- [ ] Rollback plan documented (previous task definition version noted)
- [ ] Deploy during low-traffic window (02:00–06:00 BRT)
- [ ] Smoke test after deploy: health check, login, create transaction
