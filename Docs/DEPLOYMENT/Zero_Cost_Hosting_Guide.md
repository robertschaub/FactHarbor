# Zero-Cost Hosting Implementation Guide

**Document Version:** 1.0
**Date:** 2026-01-02
**Status:** Approved - Ready for Implementation
**Target:** Pre-release beta with logged-in users, $0-5/month budget

> Note: FactHarbor is currently in **local POC development**. This guide is a **future deployment plan** and is not required for the current phase.

---

## Executive Summary

This guide provides a complete implementation plan for hosting FactHarbor's pre-release beta version with **near-zero infrastructure costs** ($0-5/month) while supporting 10-50 active beta users.

**Key Strategy:**
- Leverage generous free tiers from modern cloud providers
- Implement aggressive cost controls (rate limiting, caching, tiered LLM models)
- Use separated architecture to reduce AI costs by 70%
- Scale infrastructure costs only when revenue/funding is secured

---

## Recommended Architecture: Fly.io Stack

### Why Fly.io?

✅ **True $0/month possible** with generous free tier
✅ **Works with any tech stack** (Docker-based)
✅ **Global deployment** in seconds
✅ **Includes PostgreSQL + Redis** in free tier
✅ **Auto-suspend when idle** (saves compute)
✅ **Easy migration path** to paid tier when ready

---

## Complete Stack Overview

```
┌──────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────────────┐
│           Cloudflare Pages (Frontend)                    │
│           • React/Vue/Svelte SPA                         │
│           • FREE: Unlimited bandwidth                    │
│           • Global CDN                                   │
└────────────────────┬─────────────────────────────────────┘
                     │
                     │ REST API
                     ▼
┌──────────────────────────────────────────────────────────┐
│           Fly.io App (Backend API)                       │
│           • Node.js/Python/Go/.NET                       │
│           • FREE: 3 shared-cpu VMs (256MB each)          │
│           • Auto-suspend when idle                       │
└──────┬──────────┬──────────┬────────────────────────────┘
       │          │          │
       ▼          ▼          ▼
┌─────────┐ ┌──────────┐ ┌─────────────────┐
│ Fly.io  │ │ Upstash  │ │ Anthropic       │
│Postgres │ │  Redis   │ │ Claude API      │
│         │ │          │ │                 │
│ FREE:   │ │ FREE:    │ │ PAY-PER-USE:    │
│ 3GB     │ │ 10k      │ │ ~$2-5/mo with   │
│ storage │ │ cmds/day │ │ optimizations   │
└─────────┘ └──────────┘ └─────────────────┘
```

**Total Monthly Cost: $0-5**

---

## Implementation Steps

### Step 1: Set Up Fly.io Account and Infrastructure

#### 1.1 Create Fly.io Account

```bash
# Install flyctl CLI
# Windows (PowerShell)
iwr https://fly.io/install.ps1 -useb | iex

# macOS/Linux
curl -L https://fly.io/install.sh | sh

# Sign up (credit card required but NOT charged for free tier)
fly auth signup

# Or log in if you have an account
fly auth login
```

#### 1.2 Create PostgreSQL Database

```bash
# Create a new Postgres cluster (uses free tier)
fly postgres create \
  --name factharbor-db \
  --region ord \
  --vm-size shared-cpu-1x \
  --volume-size 3 \
  --initial-cluster-size 1

# Save the connection string displayed (you'll need it)
# Format: postgres://user:password@factharbor-db.internal:5432/dbname
```

#### 1.3 Create Redis Cache (Upstash)

```bash
# Sign up at https://upstash.com (separate service, better free tier)
# Free tier: 10,000 commands/day, 256MB storage

# Create database via Upstash console
# Select: Global, REST API enabled
# Save connection details:
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
```

---

### Step 2: Containerize Your Application

#### 2.1 Create Dockerfile (Node.js Example)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build if needed (for TypeScript, etc.)
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Expose port
EXPOSE 8080

# Start app
CMD ["node", "dist/server.js"]
```

#### 2.2 Create Dockerfile (.NET Example)

```dockerfile
# Dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["FactHarbor.API/FactHarbor.API.csproj", "FactHarbor.API/"]
RUN dotnet restore "FactHarbor.API/FactHarbor.API.csproj"

# Copy everything else and build
COPY . .
WORKDIR "/src/FactHarbor.API"
RUN dotnet build "FactHarbor.API.csproj" -c Release -o /app/build

# Publish
FROM build AS publish
RUN dotnet publish "FactHarbor.API.csproj" -c Release -o /app/publish

# Runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=publish /app/publish .

EXPOSE 8080
ENTRYPOINT ["dotnet", "FactHarbor.API.dll"]
```

#### 2.3 Test Locally

```bash
# Build image
docker build -t factharbor-api .

# Run locally
docker run -p 8080:8080 \
  -e DATABASE_URL="your-connection-string" \
  -e REDIS_URL="your-redis-url" \
  -e ANTHROPIC_API_KEY="your-api-key" \
  factharbor-api

# Test
curl http://localhost:8080/health
```

---

### Step 3: Deploy to Fly.io

#### 3.1 Initialize Fly App

```bash
# Create fly.toml config
fly launch \
  --name factharbor-api \
  --region ord \
  --no-deploy

# This creates fly.toml - edit it:
```

#### 3.2 Configure fly.toml

```toml
# fly.toml
app = "factharbor-api"
primary_region = "ord"

[build]

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true  # Auto-suspend when idle (saves $)
  auto_start_machines = true
  min_machines_running = 0   # Can scale to 0 when idle

  [[http_service.checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

[[statics]]
  guest_path = "/app/public"
  url_prefix = "/static"
```

#### 3.3 Set Secrets

```bash
# Set environment variables (encrypted)
fly secrets set \
  DATABASE_URL="postgres://user:pass@factharbor-db.internal:5432/db" \
  REDIS_URL="your-upstash-redis-url" \
  REDIS_TOKEN="your-upstash-token" \
  ANTHROPIC_API_KEY="your-claude-api-key" \
  JWT_SECRET="$(openssl rand -base64 32)"
```

#### 3.4 Deploy

```bash
# Deploy to Fly.io
fly deploy

# Check status
fly status

# View logs
fly logs

# Open in browser
fly open
```

---

### Step 4: Set Up Frontend on Cloudflare Pages

#### 4.1 Build Frontend

```bash
# Example with React
cd frontend

# Build for production
npm run build
# Output: dist/ or build/ folder
```

#### 4.2 Deploy to Cloudflare Pages

```bash
# Install Wrangler CLI
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy
wrangler pages deploy dist \
  --project-name factharbor \
  --branch main

# Configure environment variables in Cloudflare dashboard:
# - VITE_API_URL=https://factharbor-api.fly.dev
```

**Alternative: Use Cloudflare Pages Git Integration**

1. Push frontend to GitHub
2. Go to Cloudflare Dashboard → Pages → Create Project
3. Connect GitHub repo
4. Configure build:
   - Framework preset: React/Vue/Svelte
   - Build command: `npm run build`
   - Build output: `dist`
5. Add environment variable: `VITE_API_URL`
6. Deploy automatically on every git push

---

### Step 5: Implement Cost Control Measures

#### 5.1 Rate Limiting (Critical!)

```typescript
// rate-limiter.ts
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Per-user limits
export const userRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:user',
  points: 10,           // 10 analyses
  duration: 86400,      // per day
  blockDuration: 86400  // block for 1 day if exceeded
});

// Global limits (safety net)
export const globalRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl:global',
  points: 100,          // 100 total analyses
  duration: 86400       // per day
});

// Middleware
export async function rateLimitMiddleware(req, res, next) {
  try {
    const userId = req.user?.id || req.ip;

    // Check user limit
    await userRateLimiter.consume(userId);

    // Check global limit
    await globalRateLimiter.consume('global');

    next();
  } catch (err) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'You have reached your daily analysis limit. Please try again tomorrow.'
    });
  }
}
```

#### 5.2 Budget Alerts (Anthropic API)

```typescript
// budget-monitor.ts
const DAILY_BUDGET = 0.50;  // $0.50/day = ~$15/month
const MONTHLY_BUDGET = 10.00;

let dailySpend = 0;
let monthlySpend = 0;

export function trackAIUsage(tokensUsed: number, model: string) {
  const cost = calculateCost(tokensUsed, model);

  dailySpend += cost;
  monthlySpend += cost;

  if (dailySpend > DAILY_BUDGET) {
    console.error(`⚠️  DAILY BUDGET EXCEEDED: $${dailySpend.toFixed(2)}`);
    // Disable AI processing until tomorrow
    throw new Error('Daily budget exceeded');
  }

  if (monthlySpend > MONTHLY_BUDGET) {
    console.error(`🚨 MONTHLY BUDGET EXCEEDED: $${monthlySpend.toFixed(2)}`);
    // Send alert email
    sendAlertEmail('Budget exceeded!');
  }
}

function calculateCost(tokens: number, model: string): number {
  const pricing = {
    'claude-sonnet-4.5': { input: 0.003, output: 0.015 },
    'claude-haiku-4': { input: 0.0008, output: 0.004 }
  };

  // Simplified: average of input/output
  const avgPrice = (pricing[model].input + pricing[model].output) / 2;
  return (tokens / 1000000) * avgPrice;
}
```

#### 5.3 Tiered Model Routing (40% Cost Savings)

```typescript
// llm-router.ts
export class LLMRouter {
  async routeRequest(task: AITask): Promise<string> {
    switch (task.type) {
      case 'EXTRACT_CLAIMS':
        // Simple extraction - use Haiku (cheap)
        return 'claude-haiku-4';

      case 'EXTRACT_FACTS':
        // Simple extraction - use Haiku (cheap)
        return 'claude-haiku-4';

      case 'UNDERSTAND_ARTICLE':
        // Complex reasoning - use Sonnet
        return 'claude-sonnet-4.5';

      case 'GENERATE_VERDICT':
        // Complex synthesis - use Sonnet
        return 'claude-sonnet-4.5';

      default:
        return 'claude-sonnet-4.5';
    }
  }
}

// Usage:
const model = await llmRouter.routeRequest({ type: 'EXTRACT_CLAIMS' });
const result = await anthropic.messages.create({
  model: model,
  max_tokens: 1024,
  messages: [...]
});
```

#### 5.4 Claim Caching (70% Cost Savings)

See `Docs/ARCHITECTURE/Separated_Architecture_Guide.md` for full details (planned; not implemented in current code).

```typescript
// Quick example:
async function analyzeClaimWithCache(claim: string): Promise<Verdict> {
  const cached = await cache.get(claim);
  if (cached) {
    return cached; // Save 100% of cost for this claim
  }

  const verdict = await analyzeClaimFull(claim);
  await cache.set(claim, verdict, 7); // 7-day TTL
  return verdict;
}
```

---

### Step 6: Authentication for Beta Users

#### 6.1 Simple JWT-based Auth

```typescript
// auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET;

// Beta user allowlist (stored in DB)
const BETA_USERS = [
  { email: 'user1@example.com', password: '$2b$10$...' },
  { email: 'user2@example.com', password: '$2b$10$...' }
];

export async function login(email: string, password: string) {
  const user = await db.query(
    'SELECT * FROM users WHERE email = $1 AND is_beta_user = true',
    [email]
  );

  if (!user.rows[0]) {
    throw new Error('Not authorized for beta');
  }

  const valid = await bcrypt.compare(password, user.rows[0].password_hash);
  if (!valid) {
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign(
    { userId: user.rows[0].id, email: user.rows[0].email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { token, user: user.rows[0] };
}

export function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}
```

#### 6.2 Beta User Signup (Manual Approval)

```typescript
// POST /api/beta-signup
export async function betaSignup(req, res) {
  const { email, name, reason } = req.body;

  // Store request for manual review
  await db.query(`
    INSERT INTO beta_signup_requests (email, name, reason, status)
    VALUES ($1, $2, $3, 'pending')
  `, [email, name, reason]);

  res.json({
    message: 'Thank you! Your request has been submitted for review.'
  });

  // Notify admin
  await sendEmail({
    to: 'admin@factharbor.org',
    subject: 'New beta signup request',
    body: `${name} (${email}) requested beta access: ${reason}`
  });
}

// Admin approves via /admin/beta-requests
export async function approveBetaUser(req, res) {
  const { requestId } = req.params;
  const { approved } = req.body;

  if (approved) {
    // Create user account
    const tempPassword = generateRandomPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await db.query(`
      INSERT INTO users (email, password_hash, is_beta_user)
      SELECT email, $1, true
      FROM beta_signup_requests
      WHERE id = $2
    `, [passwordHash, requestId]);

    // Send welcome email with temp password
    const request = await db.query(
      'SELECT email FROM beta_signup_requests WHERE id = $1',
      [requestId]
    );

    await sendEmail({
      to: request.rows[0].email,
      subject: 'Welcome to FactHarbor Beta!',
      body: `Your temporary password: ${tempPassword}\n\nPlease log in and change it.`
    });
  }

  // Update request status
  await db.query(
    'UPDATE beta_signup_requests SET status = $1 WHERE id = $2',
    [approved ? 'approved' : 'rejected', requestId]
  );

  res.json({ success: true });
}
```

---

### Step 7: Monitoring and Alerts

#### 7.1 Health Check Endpoint

```typescript
// GET /health
export async function healthCheck(req, res) {
  const checks = {
    api: 'ok',
    database: await checkDatabase(),
    redis: await checkRedis(),
    budgetStatus: await checkBudget()
  };

  const allHealthy = Object.values(checks).every(v => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString()
  });
}

async function checkDatabase(): Promise<string> {
  try {
    await db.query('SELECT 1');
    return 'ok';
  } catch (err) {
    return 'error';
  }
}

async function checkBudget(): Promise<string> {
  const today = await db.query(`
    SELECT SUM(cost) as total
    FROM ai_usage_log
    WHERE date = CURRENT_DATE
  `);

  const spent = today.rows[0]?.total || 0;
  if (spent > DAILY_BUDGET) return 'exceeded';
  if (spent > DAILY_BUDGET * 0.8) return 'warning';
  return 'ok';
}
```

#### 7.2 Daily Budget Report

```typescript
// Run daily via cron job or scheduled task
export async function sendDailyReport() {
  const stats = await db.query(`
    SELECT
      COUNT(*) as total_analyses,
      COUNT(DISTINCT user_id) as active_users,
      SUM(cost) as total_cost,
      AVG(processing_time_ms) as avg_processing_time
    FROM analysis_log
    WHERE date = CURRENT_DATE - INTERVAL '1 day'
  `);

  const cacheStats = await db.query(`
    SELECT
      COUNT(*) as total_claims,
      SUM(access_count - 1) as cache_hits
    FROM ClaimVerdict
    WHERE created_at >= CURRENT_DATE - INTERVAL '1 day'
  `);

  await sendEmail({
    to: 'admin@factharbor.org',
    subject: `FactHarbor Daily Report - ${new Date().toLocaleDateString()}`,
    body: `
      Total Analyses: ${stats.rows[0].total_analyses}
      Active Users: ${stats.rows[0].active_users}
      AI Cost: $${stats.rows[0].total_cost.toFixed(2)}
      Cache Hits: ${cacheStats.rows[0].cache_hits}
      Avg Processing Time: ${stats.rows[0].avg_processing_time}ms
    `
  });
}
```

#### 7.3 Set Up Fly.io Monitoring

```bash
# View metrics
fly dashboard

# Set up alerts (in Fly.io dashboard)
# Alert if:
# - Response time > 2s
# - Error rate > 5%
# - Memory usage > 200MB
```

---

## Cost Breakdown Analysis

### Infrastructure Costs

| Service | Free Tier | Usage Estimate | Monthly Cost |
|---------|-----------|----------------|--------------|
| **Fly.io App** | 3 VMs (256MB each) | 1 VM used | **$0** |
| **Fly.io Postgres** | 3GB storage | 1GB used | **$0** |
| **Upstash Redis** | 10k cmds/day | ~5k/day | **$0** |
| **Cloudflare Pages** | Unlimited | Frontend hosting | **$0** |
| **Domain (optional)** | N/A | factharbor.org | ~$12/year |

**Total Infrastructure: $0/month** (or $1/month if you count domain)

---

### AI Costs (Claude API)

**Scenario:** 50 beta users, 10 analyses/user/month = 500 total analyses

**With All Optimizations:**
- Claim caching (70% hit rate after 1 week)
- Tiered models (Haiku for extraction, Sonnet for reasoning)

| Stage | Model | Tokens/Analysis | Cost/1M tokens | Cost/Analysis | Total (500) |
|-------|-------|-----------------|----------------|---------------|-------------|
| Extract Claims | Haiku | 2,000 | $0.80 | $0.0016 | $0.80 |
| Extract Facts | Haiku | 5,000 | $0.80 | $0.0040 | $2.00 |
| Generate Verdict | Sonnet | 3,000 | $3.00 | $0.0090 | $4.50 |

**Before caching:** $7.30/month
**After 70% cache hit rate:** $7.30 × 0.30 = **$2.19/month**

---

### Total Monthly Cost: $2-3

**Best case:** $2.19 (with high cache hit rate)
**Worst case:** $7.30 (no caching, month 1)
**Realistic:** $3-5 (moderate caching)

---

## Scaling Plan

### When to Upgrade?

| Metric | Free Tier Limit | Action When Reached |
|--------|-----------------|---------------------|
| **Users** | 50-100 | Stay on free tier, add waitlist |
| **Analyses/day** | 100 | Increase rate limits slowly |
| **Database size** | 3GB | Archive old data, or upgrade to $7/mo tier |
| **Memory usage** | 256MB | Optimize code, or add 1 more free VM |
| **Monthly AI cost** | $10 | Seek funding/donations before scaling |

### Upgrade Path

**Phase 1: Free Tier (Current)**
- 0-50 users
- $0-5/month
- Manual beta approvals

**Phase 2: Hobby Tier ($10-20/month)**
- 50-200 users
- Upgrade Fly.io to 512MB VMs ($5/mo)
- Upgrade Upstash to paid tier ($10/mo)
- AI costs: $5-10/month

**Phase 3: Growth Tier ($50-100/month)**
- 200-1000 users
- Add CDN, monitoring, backups
- Consider sponsorships/donations

---

## Deployment Checklist

### Pre-Deployment

- [ ] Backend API containerized and tested locally
- [ ] Frontend built and tested
- [ ] Database schema created
- [ ] Environment variables documented
- [ ] Rate limiting implemented
- [ ] Budget monitoring implemented
- [ ] Authentication system tested

### Fly.io Deployment

- [ ] Fly.io account created
- [ ] PostgreSQL database created
- [ ] Upstash Redis created
- [ ] Secrets configured (`fly secrets set`)
- [ ] `fly.toml` configured
- [ ] Health check endpoint working
- [ ] Deployed (`fly deploy`)
- [ ] Logs reviewed (`fly logs`)

### Cloudflare Pages Deployment

- [ ] Frontend repo pushed to GitHub
- [ ] Cloudflare Pages connected to repo
- [ ] Build settings configured
- [ ] Environment variables set
- [ ] Custom domain configured (optional)
- [ ] HTTPS enabled

### Post-Deployment

- [ ] Health check returns 200
- [ ] Frontend loads correctly
- [ ] API requests work
- [ ] Authentication works
- [ ] Rate limiting works
- [ ] Budget alerts configured
- [ ] Daily reports configured
- [ ] Backup strategy defined

---

## Troubleshooting

### Issue: Fly.io App Not Starting

```bash
# Check logs
fly logs

# Common issues:
# - Wrong PORT (must be 8080)
# - Missing environment variables
# - Database connection failed

# Debug locally:
fly ssh console
```

### Issue: Database Connection Failed

```bash
# Verify database is running
fly postgres list

# Check connection string
fly postgres connect -a factharbor-db

# Test from app
fly ssh console -a factharbor-api
# Inside container:
psql $DATABASE_URL
```

### Issue: Rate Limits Not Working

```typescript
// Verify Redis connection
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

redis.ping().then(() => {
  console.log('Redis connected!');
}).catch(err => {
  console.error('Redis error:', err);
});
```

### Issue: High AI Costs

1. Check cache hit rate:
   ```sql
   SELECT
     COUNT(*) as total_claims,
     AVG(access_count) as avg_reuses
   FROM ClaimVerdict;
   ```

2. Verify tiered model routing:
   ```typescript
   // Log every LLM call
   console.log(`AI Request: ${task.type} → ${model} → ${tokens} tokens → $${cost}`);
   ```

3. Implement hard budget limit:
   ```typescript
   if (dailySpend > DAILY_BUDGET) {
     throw new Error('Budget exceeded - AI disabled for today');
   }
   ```

---

## Alternative: Even Cheaper Option (Vercel + Supabase)

If Fly.io seems too complex:

```
Frontend: Vercel (free, better DX than Cloudflare)
Backend: Vercel Serverless Functions (free tier: 100GB-hrs)
Database: Supabase (free tier: 500MB, 2 projects)
Redis: Upstash (same as above)

Pros: Even simpler deployment (git push)
Cons: Less control, harder to migrate later
```

---

## Security Considerations

### 1. Protect API Keys

```bash
# NEVER commit secrets to git
echo ".env" >> .gitignore
echo "fly.toml" >> .gitignore  # Contains secrets

# Use fly secrets instead
fly secrets set ANTHROPIC_API_KEY="sk-ant-..."
```

### 2. Enable CORS Properly

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'https://factharbor.pages.dev',
    'https://factharbor.org'
  ],
  credentials: true
}));
```

### 3. Rate Limit All Endpoints

```typescript
// Not just /analyze, but also /login, /signup
app.use('/api/login', rateLimitMiddleware);
app.use('/api/analyze', rateLimitMiddleware);
app.use('/api/beta-signup', rateLimitMiddleware);
```

### 4. Validate All Inputs

```typescript
import { z } from 'zod';

const AnalyzeRequestSchema = z.object({
  url: z.string().url(),
  userId: z.string().uuid().optional()
});

app.post('/api/analyze', async (req, res) => {
  const result = AnalyzeRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  // Process validated data
  const { url } = result.data;
  // ...
});
```

---

## Success Metrics

Track these weekly:

- [ ] **Uptime:** >99% (check Fly.io status)
- [ ] **Response time:** <2s average (check logs)
- [ ] **Daily cost:** <$0.50 (check budget monitor)
- [ ] **Cache hit rate:** >40% after week 2
- [ ] **Active users:** Growing steadily
- [ ] **Error rate:** <1%

---

## Next Steps After Beta

When ready to scale:

1. **Seek funding/donations** before increasing usage limits
2. **Add payment system** (Stripe) if going subscription model
3. **Upgrade infrastructure** gradually based on metrics
4. **Implement CDN** for faster global access
5. **Add monitoring** (Sentry, DataDog, etc.)
6. **Hire DevOps** if growing beyond 1000 users

---

## Resources

- **Fly.io Docs:** https://fly.io/docs
- **Upstash Docs:** https://docs.upstash.com
- **Cloudflare Pages:** https://pages.cloudflare.com
- **Anthropic Pricing:** https://www.anthropic.com/pricing
- **Rate Limiter Library:** https://github.com/animir/node-rate-limiter-flexible

---

## Support Contacts

- **Fly.io Community:** https://community.fly.io
- **Fly.io Support:** support@fly.io (for paying customers)
- **This Guide Author:** Claude Code (2026-01-02)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-02 | Claude Code | Initial hosting guide for zero-cost beta |

