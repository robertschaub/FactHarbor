# FactHarbor GitHub Security Assessment & Recommendations

**Repository**: https://github.com/robertschaub/FactHarbor
**Assessment Date**: 2026-02-09
**Status**: Active Development (Alpha)

---

## 📊 Executive Summary

This document provides a comprehensive security assessment of the FactHarbor GitHub repository and actionable recommendations to enhance security posture. The assessment covers repository settings, dependency management, API security, secrets management, and deployment security.

### Current Security Posture

✅ **Good practices already in place:**
- Proper `.gitignore` for secrets (`.env.local`, API keys)
- `.env.example` template without actual keys
- Security policy documented in `SECURITY.md`
- API authentication via `X-Runner-Key` and `X-Admin-Key` headers
- Production enforcement for `FH_INTERNAL_RUNNER_KEY`
- CI/CD pipeline with automated builds

⚠️ **Areas requiring attention:**
- High-severity npm vulnerabilities in dependencies
- Repository is public without branch protection
- Missing automated security scanning
- Potential SSRF risks noted but not fully mitigated
- No rate limiting on admin endpoints

---

## ✅ Immediate Actions Required (FIXED)

### 1. ✅ Fix Dependency Vulnerabilities

**Status**: COMPLETED

```bash
# Vulnerabilities resolved through npm update
npm audit fix
```

**Previously identified issues (now resolved):**
- ✅ `@aws-sdk/*` packages updated
- ✅ `@isaacs/brace-expansion` vulnerability addressed
- ✅ `fast-xml-parser` vulnerabilities patched

**Verification:**
```bash
npm audit
# Should show 0 vulnerabilities or only low-severity informational items
```

### 2. ✅ Enable GitHub Security Features

**Status**: COMPLETED

**Enabled Dependabot:**
1. ✅ Dependency graph enabled
2. ✅ Dependabot alerts enabled
3. ✅ Dependabot security updates enabled
4. ✅ Dependabot version updates configured

**Configuration file**: `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10

  - package-ecosystem: "npm"
    directory: "/apps/web"
    schedule:
      interval: "weekly"

  - package-ecosystem: "nuget"
    directory: "/apps/api"
    schedule:
      interval: "weekly"
```

### 3. ✅ Enable Branch Protection for `main`

**Status**: COMPLETED

**Configuration**: https://github.com/robertschaub/FactHarbor/settings/branches

**Rules applied:**
- ✅ Require pull request reviews before merging (at least 1 reviewer)
- ✅ Require status checks to pass before merging (CI must pass)
- ✅ Require branches to be up to date before merging
- ✅ Restrict who can push to matching branches

**Note:** The following are NOT enabled (as per GitHub defaults):
- ❌ Include administrators - allows maintainers to push directly for critical fixes
- ❌ Require signed commits - not enforced by default

### 4. ✅ Add GitHub CodeQL Scanning

**Status**: COMPLETED

**Configuration file**: `.github/workflows/codeql.yml`

```yaml
name: "CodeQL Security Scan"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: '30 1 * * 1'  # Weekly on Monday at 1:30 AM UTC

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: windows-latest
    timeout-minutes: 360
    permissions:
      security-events: write
      packages: read
      actions: read
      contents: read

    strategy:
      fail-fast: false
      matrix:
        include:
          - language: javascript-typescript
            build-mode: none
          - language: csharp
            build-mode: autobuild

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: ${{ matrix.language }}
        build-mode: ${{ matrix.build-mode }}

    - if: matrix.build-mode == 'autobuild'
      name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
      with:
        category: "/language:${{ matrix.language }}"
```

**Features:**
- ✅ Scans JavaScript/TypeScript and C# code
- ✅ Runs on every push to main
- ✅ Runs on every pull request
- ✅ Weekly scheduled scans
- ✅ Results uploaded to GitHub Security tab

---

## 🔐 Secrets Management

### Current State

✅ **Good practices:**
- `.env.local` is properly gitignored
- `.env.example` provides template without secrets
- Separate development/production configurations

⚠️ **Recommended actions:**

#### Audit Git History for Leaked Secrets

**Purpose:** Verify no secrets were accidentally committed in the past.

```bash
# Check for accidentally committed secrets (quick scan)
git log --all --full-history --source --pretty=format:"%H" -- "**/*.env" "**/*.key" "**/*.pem"

# Deep scan with TruffleHog (recommended)
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest git file:///repo --only-verified
```

**If secrets are found:**
1. Rotate/revoke the exposed secrets immediately
2. Consider using `git filter-repo` to remove from history
3. Force push to update remote (coordinate with team)

#### Use GitHub Secrets for CI/CD

**Location:** https://github.com/robertschaub/FactHarbor/settings/secrets/actions

**Recommended secrets to add:**
- `OPENAI_API_KEY` - For OpenAI API access
- `ANTHROPIC_API_KEY` - For Anthropic Claude API
- `GOOGLE_GENERATIVE_AI_API_KEY` - For Google Gemini
- `MISTRAL_API_KEY` - For Mistral AI
- `GOOGLE_CSE_API_KEY` - For Google Custom Search
- `GOOGLE_CSE_ID` - Custom Search Engine ID
- `SERPAPI_API_KEY` - For SerpAPI fallback

**Usage in workflows:**

```yaml
# In .github/workflows/ci.yml or test workflows
jobs:
  test:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run LLM integration tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          GOOGLE_GENERATIVE_AI_API_KEY: ${{ secrets.GOOGLE_GENERATIVE_AI_API_KEY }}
        run: npm run test:llm
```

---

## 🛡️ API Security Hardening

### 1. Strengthen Authentication

**Current implementation:** Simple string comparison for API keys
**Location:** `apps/web/src/app/api/internal/run-job/route.ts:356-365`

**Issue:** Vulnerable to timing attacks

**Recommendation:** Use constant-time comparison

```typescript
// Create apps/web/src/lib/security/auth.ts
import { timingSafeEqual } from 'crypto';

/**
 * Secure constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
```

**Usage in route handlers:**

```typescript
// In apps/web/src/app/api/internal/run-job/route.ts
import { secureCompare } from '@/lib/security/auth';

export async function POST(req: Request) {
  const expectedRunnerKey = getEnv("FH_INTERNAL_RUNNER_KEY");
  if (expectedRunnerKey) {
    const got = req.headers.get("x-runner-key");
    if (!got || !secureCompare(got, expectedRunnerKey)) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "FH_INTERNAL_RUNNER_KEY not set" }, { status: 503 });
  }
  // ... rest of handler
}
```

**Priority:** High
**Effort:** Low (1-2 hours)

### 2. Add Rate Limiting

**Issue:** Admin endpoints vulnerable to brute force attacks

**Recommendation:** Implement rate limiting using Upstash or similar

```bash
# Add to apps/web/package.json
npm install @upstash/ratelimit @upstash/redis
```

**Implementation:**

```typescript
// Create apps/web/src/lib/security/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// For local development without Redis
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Create rate limiter (10 requests per 10 seconds)
export const adminRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10 s"),
      analytics: true,
    })
  : null;

export async function checkRateLimit(identifier: string): Promise<boolean> {
  if (!adminRateLimiter) {
    // In development without Redis, allow all requests
    return true;
  }

  const { success } = await adminRateLimiter.limit(identifier);
  return success;
}
```

**Usage:**

```typescript
// In admin route handlers
import { checkRateLimit } from '@/lib/security/rate-limit';

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ??
             req.headers.get("x-real-ip") ??
             "127.0.0.1";

  if (!await checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // ... rest of handler
}
```

**Environment variables needed:**
```bash
# Add to .env.local and .env.example
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Priority:** Medium
**Effort:** Medium (4-6 hours including setup)

### 3. Add Security Headers

**Issue:** Missing critical security headers

**Recommendation:** Add Next.js middleware for security headers

```typescript
// Create apps/web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Disable unnecessary browser features
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=()'
  );

  // Content Security Policy
  // Note: Adjust based on your actual needs
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.openai.com https://api.anthropic.com;
    frame-ancestors 'none';
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  // Enable browser XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

// Apply to all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Verification:**

```bash
# Test security headers
curl -I http://localhost:3000/api/health

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: ...
```

**Priority:** High
**Effort:** Low (1-2 hours)

### 4. SSRF Protection

**Current state:** Noted in `SECURITY.md:20-21` but not implemented
**Risk:** URL ingestion could target internal resources

**Recommendation:** Implement URL validation and IP blocking

```typescript
// Create apps/web/src/lib/security/url-validator.ts
import { resolve4, resolve6 } from 'dns/promises';

const BLOCKED_IP_PATTERNS = [
  // IPv4 localhost and private networks
  /^127\./,                           // 127.0.0.0/8 - localhost
  /^10\./,                            // 10.0.0.0/8 - private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 - private
  /^192\.168\./,                      // 192.168.0.0/16 - private
  /^169\.254\./,                      // 169.254.0.0/16 - link-local
  /^0\./,                             // 0.0.0.0/8 - reserved

  // IPv6 special addresses
  /^::1$/,                            // localhost
  /^fe80:/i,                          // link-local
  /^fc00:/i,                          // unique local
  /^fd00:/i,                          // unique local
];

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  '169.254.169.254', // Cloud metadata service
];

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Validates URL for SSRF protection
 * - Blocks private IP ranges
 * - Blocks localhost and link-local
 * - Allows only HTTP(S)
 * - Validates hostname resolution
 */
export async function validateUrl(urlString: string): Promise<UrlValidationResult> {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check protocol
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    return {
      valid: false,
      error: `Protocol ${url.protocol} not allowed. Only HTTP(S) permitted.`
    };
  }

  // Check blocked hostnames
  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return {
      valid: false,
      error: 'Access to this hostname is not permitted'
    };
  }

  // Resolve hostname to IP addresses
  let addresses: string[] = [];

  try {
    // Try IPv4 first
    const ipv4 = await resolve4(hostname);
    addresses.push(...ipv4);
  } catch {
    // IPv4 resolution failed, might be IPv6-only
  }

  try {
    // Try IPv6
    const ipv6 = await resolve6(hostname);
    addresses.push(...ipv6);
  } catch {
    // IPv6 resolution failed
  }

  if (addresses.length === 0) {
    return {
      valid: false,
      error: 'Could not resolve hostname to IP address'
    };
  }

  // Check each resolved IP against blocked patterns
  for (const ip of addresses) {
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(ip)) {
        return {
          valid: false,
          error: 'Access to private/internal IP addresses is not permitted'
        };
      }
    }
  }

  return { valid: true, url };
}

/**
 * Wrapper for fetch with SSRF protection
 */
export async function secureFetch(
  url: string,
  options?: RequestInit,
  maxRedirects = 5,
  maxSize = 10 * 1024 * 1024 // 10MB default
): Promise<Response> {
  const validation = await validateUrl(url);

  if (!validation.valid) {
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  const response = await fetch(url, {
    ...options,
    redirect: 'manual', // Handle redirects manually
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  // Handle redirects with validation
  if (response.status >= 300 && response.status < 400 && maxRedirects > 0) {
    const location = response.headers.get('location');
    if (!location) {
      throw new Error('Redirect response missing Location header');
    }

    // Validate redirect URL
    const redirectUrl = new URL(location, url).href;
    return secureFetch(redirectUrl, options, maxRedirects - 1, maxSize);
  }

  // Check content length
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    throw new Error(`Response size ${contentLength} exceeds maximum ${maxSize}`);
  }

  return response;
}
```

**Usage:**

```typescript
// In URL fetching code (e.g., web search, URL analysis)
import { validateUrl, secureFetch } from '@/lib/security/url-validator';

// Validate before processing
const validation = await validateUrl(userProvidedUrl);
if (!validation.valid) {
  return { error: validation.error };
}

// Use secure fetch
const response = await secureFetch(userProvidedUrl);
const html = await response.text();
```

**Priority:** High
**Effort:** Medium (3-4 hours)

---

## 📊 Monitoring & Incident Response

### 1. GitHub Advanced Security

**Features available:**
- ✅ Secret scanning (enabled automatically for public repos)
- ✅ Code scanning (via CodeQL - configured above)
- ✅ Dependency review (via Dependabot - configured above)

**Access:** https://github.com/robertschaub/FactHarbor/security

### 2. Security Monitoring Workflow

**Create:** `.github/workflows/security-scan.yml`

```yaml
name: Security Scan

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday at midnight UTC
  workflow_dispatch:      # Allow manual trigger

jobs:
  npm-audit:
    name: NPM Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run npm audit
        run: |
          npm audit --audit-level=moderate || true

      - name: Run web app audit
        working-directory: apps/web
        run: |
          npm audit --audit-level=moderate || true

  trivy-scan:
    name: Trivy Container Scan
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

**Priority:** Medium
**Effort:** Low (1 hour)

### 3. Security Incident Response Plan

**Update:** `SECURITY.md`

```markdown
## Reporting Security Vulnerabilities

If you discover a security vulnerability in FactHarbor, please report it to:

**Email:** security@factharbor.org (or your preferred contact)

**Please include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response timeline:**
- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 7 days
- **Fix timeline:** Varies by severity
  - Critical: 7-14 days
  - High: 14-30 days
  - Medium: 30-90 days
  - Low: Best effort

## Security Update Process

1. **Triage:** Security team reviews and validates the report
2. **Development:** Fix is developed in a private branch
3. **Testing:** Fix is tested against reproduction steps
4. **Disclosure:** Security advisory is published
5. **Release:** Patched version is released
6. **Notification:** Users are notified via GitHub Releases

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| < 2.0   | :x:                |
```

---

## 🔒 Additional Recommendations

### 1. Environment Variable Validation

**Purpose:** Catch configuration errors early

```typescript
// Create apps/web/src/lib/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  // Required in all environments
  NODE_ENV: z.enum(['development', 'production', 'test']),

  // API Configuration
  FH_API_BASE_URL: z.string().url(),
  FH_ADMIN_KEY: z.string().min(32, 'Admin key must be at least 32 characters'),
  FH_INTERNAL_RUNNER_KEY: z.string().min(32, 'Runner key must be at least 32 characters'),
  FH_RUNNER_MAX_CONCURRENCY: z.string().optional().default('4'),

  // LLM Providers (at least one required)
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),

  // Search Providers
  GOOGLE_CSE_API_KEY: z.string().optional(),
  GOOGLE_CSE_ID: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),

  // Optional features
  FH_DEBUG_LOG_FILE: z.string().optional(),
  FH_DEBUG_LOG_PATH: z.string().optional(),
  FH_DEBUG_LOG_CLEAR_ON_START: z.string().optional(),
  FH_SR_CACHE_PATH: z.string().optional(),
}).refine(
  (data) => {
    // Ensure at least one LLM provider is configured
    return (
      data.OPENAI_API_KEY ||
      data.ANTHROPIC_API_KEY ||
      data.GOOGLE_GENERATIVE_AI_API_KEY ||
      data.MISTRAL_API_KEY
    );
  },
  {
    message: 'At least one LLM provider API key must be configured',
  }
);

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and throws on error
 * Call this at application startup
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
    throw new Error('Invalid environment configuration');
  }

  return parsed.data;
}

/**
 * Get validated environment variables
 * Returns undefined if validation fails
 */
export function getValidatedEnv(): Env | undefined {
  try {
    return validateEnv();
  } catch {
    return undefined;
  }
}
```

**Usage:**

```typescript
// In apps/web/src/app/layout.tsx or a startup file
import { validateEnv } from '@/lib/env-validation';

// Validate on startup (server-side only)
if (typeof window === 'undefined') {
  validateEnv();
}
```

**Priority:** Medium
**Effort:** Low (2-3 hours)

### 2. Audit Logging

**Purpose:** Track security-relevant events

```typescript
// Create apps/web/src/lib/security/audit-log.ts
export interface AuditEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  action: string;
  actor?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  details?: Record<string, any>;
  success: boolean;
}

/**
 * Log security-relevant events
 */
export function auditLog(event: Omit<AuditEvent, 'timestamp'>): void {
  const logEntry: AuditEvent = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  // In production, send to logging service (e.g., Datadog, Sentry)
  // In development, log to console
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to logging service
    console.log('[AUDIT]', JSON.stringify(logEntry));
  } else {
    console.log('[AUDIT]', logEntry);
  }
}

/**
 * Helper for authentication events
 */
export function logAuthEvent(
  action: 'login' | 'logout' | 'auth_failed' | 'key_validated' | 'key_rejected',
  success: boolean,
  request?: Request,
  details?: Record<string, any>
): void {
  auditLog({
    level: success ? 'info' : 'security',
    action,
    ip: request?.headers.get('x-forwarded-for') || request?.headers.get('x-real-ip') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    success,
    details,
  });
}

/**
 * Helper for config change events
 */
export function logConfigChange(
  configType: string,
  profile: string,
  action: 'activate' | 'update' | 'delete' | 'import' | 'export',
  request?: Request,
  details?: Record<string, any>
): void {
  auditLog({
    level: 'info',
    action: `config_${action}`,
    resource: `${configType}/${profile}`,
    ip: request?.headers.get('x-forwarded-for') || 'unknown',
    success: true,
    details,
  });
}
```

**Usage in routes:**

```typescript
// In admin routes
import { logAuthEvent, logConfigChange } from '@/lib/security/audit-log';

export async function POST(req: Request) {
  const key = req.headers.get('x-admin-key');

  if (!key || !secureCompare(key, expectedKey)) {
    logAuthEvent('key_rejected', false, req);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logAuthEvent('key_validated', true, req);

  // ... perform admin action

  logConfigChange('pipeline', 'production', 'activate', req, {
    previousVersion: 'v1.2.3',
    newVersion: 'v1.2.4',
  });

  return NextResponse.json({ success: true });
}
```

**Priority:** Low
**Effort:** Medium (3-4 hours)

### 3. Dependency Lock File Integrity

**Recommendation:** Commit and verify lock files

```bash
# Ensure lock files are committed
git add package-lock.json apps/web/package-lock.json apps/api/packages.lock.json

# In CI, verify lock files are up to date
npm ci --audit=false  # Fails if package.json and lock file are out of sync
```

**Add to CI workflow:**

```yaml
# In .github/workflows/ci.yml
- name: Verify lock files
  run: |
    npm ci --audit=false
    git diff --exit-code package-lock.json
```

**Priority:** Low
**Effort:** Low (30 minutes)

---

## 🔄 Regular Security Maintenance

### Weekly Tasks

- [ ] Review Dependabot alerts and PRs
- [ ] Check CodeQL scan results
- [ ] Monitor GitHub Security tab for new issues

### Monthly Tasks

- [ ] Review audit logs for suspicious activity
- [ ] Run `npm audit` manually and investigate new findings
- [ ] Review and rotate API keys if needed
- [ ] Update security documentation if processes change

### Quarterly Tasks

- [ ] Comprehensive security review
- [ ] Review and update `.env.example` templates
- [ ] Audit user permissions and access controls
- [ ] Review SECURITY.md and incident response procedures
- [ ] Consider external security audit or penetration testing

### Before Production Deployment

- [ ] Complete all high-priority recommendations
- [ ] Run full security scan (`npm audit`, CodeQL, Trivy)
- [ ] Review all environment variables in production
- [ ] Ensure all secrets are rotated from development values
- [ ] Test rate limiting and authentication
- [ ] Verify security headers are present
- [ ] Enable production logging and monitoring
- [ ] Document incident response procedures
- [ ] Set up alerting for security events

---

## 📋 Security Implementation Checklist

### Critical Priority (Complete Before Production)

- [x] ✅ Fix npm dependency vulnerabilities
- [x] ✅ Enable Dependabot security updates
- [x] ✅ Configure branch protection rules
- [x] ✅ Set up CodeQL security scanning
- [ ] ⏳ Audit git history for leaked secrets
- [ ] ⏳ Implement constant-time authentication comparison
- [ ] ⏳ Add security headers middleware
- [ ] ⏳ Implement SSRF protection for URL fetching

### High Priority (Within 2 Weeks)

- [ ] Add rate limiting to admin endpoints
- [ ] Set up GitHub Secrets for CI/CD
- [ ] Implement environment variable validation
- [ ] Add security monitoring workflow
- [ ] Update SECURITY.md with incident response plan

### Medium Priority (Within 1 Month)

- [ ] Implement audit logging
- [ ] Add Trivy security scanning
- [ ] Review and test all authentication flows
- [ ] Document security architecture
- [ ] Set up security alerting

### Low Priority (Ongoing)

- [ ] Regular dependency updates
- [ ] Quarterly security audits
- [ ] Continuous monitoring and improvement
- [ ] Security training for contributors

---

## 🎯 Priority Matrix

| Task | Impact | Effort | Priority | Status |
|------|--------|--------|----------|--------|
| Dependency vulnerabilities | High | Low | Critical | ✅ Done |
| Dependabot setup | High | Low | Critical | ✅ Done |
| Branch protection | High | Low | Critical | ✅ Done |
| CodeQL scanning | High | Low | Critical | ✅ Done |
| Secret history audit | High | Low | High | ⏳ Pending |
| Constant-time auth | Medium | Low | High | ⏳ Pending |
| Security headers | High | Low | High | ⏳ Pending |
| SSRF protection | High | Medium | High | ⏳ Pending |
| Rate limiting | Medium | Medium | Medium | 📋 Planned |
| Environment validation | Medium | Low | Medium | 📋 Planned |
| Audit logging | Low | Medium | Low | 📋 Planned |

---

## 📚 References & Resources

### GitHub Security

- [GitHub Security Best Practices](https://docs.github.com/en/code-security/getting-started/securing-your-repository)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)

### Web Security Standards

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)

### Next.js Security

- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [Next.js Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)
- [Content Security Policy Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

### NPM Security

- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [npm Audit Documentation](https://docs.npmjs.com/cli/v10/commands/npm-audit)
- [Snyk Vulnerability Database](https://snyk.io/vuln/)

### API Security

- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)
- [REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)

### Tools

- [TruffleHog - Secret Scanning](https://github.com/trufflesecurity/trufflehog)
- [Trivy - Vulnerability Scanner](https://github.com/aquasecurity/trivy)
- [git-secrets - Prevent Committing Secrets](https://github.com/awslabs/git-secrets)

---

## 📞 Support & Questions

For questions about security implementation:
- Open an issue: https://github.com/robertschaub/FactHarbor/issues
- Security concerns: See SECURITY.md for reporting procedures

**Last Updated:** 2026-02-09
**Next Review:** 2026-03-09
**Document Owner:** Security Team
