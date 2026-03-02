# Limited Public Pre-Release Readiness - Implementation Plan

**Role:** Senior Developer
**Date:** 2026-03-01
**Status:** ✅ Steps 0-12 DONE. All security findings resolved. Dynamic pipeline removed. S-5 fixed (`ccb3e88`). **Next: Step 8 smoke gates + Step 9 deployment.**
**Based on:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/KNOWN_ISSUES.md`, `Docs/STATUS/Backlog.md` (security + reliability + cost-control items)

## Context

FactHarbor is in Alpha and the ClaimAssessmentBoundary pipeline is operational. Invite-code gating is being added for write access. Before opening a limited public pre-release, the highest-risk remaining gaps are URL-fetch hardening, admin endpoint protection, request throttling, contention handling under concurrent submissions, and operational tooling to set/reset invite quotas safely.

**Goal:** Launch a controlled limited public pre-release with minimum required hardening while keeping SQLite + single-instance operations.

---

## Launch Constraints

- Single API instance (no multi-instance deployment in this phase)
- SQLite remains the system database
- Single pipeline: ClaimBoundary only (monolithic dynamic removed 2026-03-02)
- Public read/search remains open (with proxy-level data redaction per Step 11)
- Analysis submission remains invite-code-gated
- No full AuthN/AuthZ platform in this phase

---

## Step 0: Pre-Implementation Baseline (COMPLETED)

**Action:** Confirm current baseline behavior before hardening changes.

1. Capture current behavior for:
   - Admin route auth behavior
   - Public job response fields
   - Analyze submission under burst requests
   - URL fetch behavior for SSRF-like targets
2. Keep baseline notes in PR/review summary to show before/after hardening effect.

---

## Step 1: SSRF Hardening (COMPLETED)

> **Review finding [M-1]:** `retrieval.ts` v1.3.0 already implements all protections below (IPv4/IPv6 private IP blocking, scheme enforcement, redirect validation, 10MB size cap, 30s timeout, fail-closed DNS). This step is verification-only — no new code expected. Update `KNOWN_ISSUES.md` S1 status from "NOT IMPLEMENTED" to "IMPLEMENTED".

### 1a. `apps/web/src/lib/retrieval.ts` - verify existing outbound URL safety checks

Verify existing protections cover:

- Private/reserved IP blocking (loopback, RFC1918, link-local, multicast) — ✅ already present
- Redirect limit enforcement — ✅ already present
- Response size cap enforcement (10MB) — ✅ already present
- Strict timeout enforcement (30s fetch, 60s PDF) — ✅ already present
- Fail-closed behavior on DNS/IP resolution errors — ✅ already present

### 1b. Tests

Add/extend tests for blocked host/IP paths, redirect chain cap, and oversize response handling (coverage gap — protections exist but test coverage is incomplete).

---

## Step 2: Admin Endpoint Auth Sweep (COMPLETED)

### 2a. `apps/web/src/app/api/admin/**/route.ts` - standardize auth checks

> **Review finding:** All 25+ Next.js admin routes already use `checkAdminKey()` from `auth.ts`. No inline `===` found on the web side. This sub-step is verification-only.

- Verify every admin route uses shared admin-key helper from `apps/web/src/lib/auth.ts` — ✅ already done
- Verify no inline `===` key checks remain — ✅ already done
- Normalize unauthorized response status/body

### 2b. Verification grep

After edits, verify no inline admin-key equality checks remain in admin route handlers (web side).

### 2c. `apps/api/Controllers/` - API-side auth hardening (NEW — Review finding [B-1, H-1])

> **BLOCKER [B-1]:** `AdminInviteCodesController.cs:32` uses `got == expected` (plain string equality, timing-unsafe). This contradicts the auth standardization goal and must be fixed before any other implementation.

- Replace `IsAuthorized()` method in `AdminInviteCodesController.cs` with `CryptographicOperations.FixedTimeEquals` comparison
- Extract a shared API auth helper (e.g., `Helpers/AuthHelper.cs`) for reuse by future API controllers
- Audit all API controllers for inline auth checks
- After edits, verify no plain `==` admin-key comparisons remain in `apps/api/Controllers/`

---

## Step 3: Rate Limiting, Submission Quotas, and CORS (COMPLETED)

### 3a. `apps/api/Controllers/AnalyzeController.cs` - request throttling

> **Review finding [L-2]:** Use ASP.NET 8 built-in `Microsoft.AspNetCore.RateLimiting` middleware (`AddRateLimiter` + `UseRateLimiter` in `Program.cs`) with fixed-window per-IP policy on `/v1/analyze`. No custom implementation needed.

- Add per-IP throttling for analysis submissions using built-in rate limiting middleware
- Return `429` on throttle violation with clear error message

### 3a2. CORS Allowlist (P0 — promoted from Step 10a) (NEW — Review finding [H-3])

> **HIGH [H-3]:** API has zero CORS configuration. Without it, any origin can call `/v1/analyze` directly from a browser, consuming invite quota. This is P0 for pre-release, not "beyond minimum gate".

- Add CORS middleware in `apps/api/Program.cs`
- Restrict to the web app's origin (e.g., `http://localhost:3000` in dev, production origin in deployment)
- Linked to Captain decision #9 (web-only vs direct API access)

### 3b. `apps/api/Services/JobService.cs` - quota consistency

- Keep invite-code daily/lifetime enforcement as the authoritative gate
- Ensure throttling and quota responses remain deterministic and user-readable

### 3c. Optional edge proxy parity

- If needed, add minimal protection in `apps/web/src/app/api/fh/analyze/route.ts` for early rejection before API hop

---

## Step 4: SQLite Contention Handling for Invite Slot Claim (COMPLETED)

### 4a. `apps/api/Services/JobService.cs` - busy/lock retry path

For `TryClaimInviteSlotAsync`:

- Keep serializable transaction semantics (already using `IsolationLevel.Serializable` → `BEGIN IMMEDIATE`)
- Add bounded retry/backoff for transient SQLite busy/lock conflicts
- Emit structured log events for retries and final failure

> **Review finding [H-5]:** Current code at `JobService.cs:218` does `catch { await tx.RollbackAsync(); throw; }` with no retry. The retry loop must wrap the entire transaction block. **Critical: only catch `Microsoft.Data.Sqlite.SqliteException` where `SqliteErrorCode == 5` (SQLITE_BUSY)**. All other exceptions (constraint violations, data corruption) must propagate immediately — generic retry-on-any-exception would mask real bugs.

Implementation guidance:
- Recommended: 3 retries, exponential backoff starting at 50ms (50ms, 100ms, 200ms)
- Verify `Microsoft.Data.Sqlite` is a direct dependency in the API project (not just transitive via EF Core)
- Status code on exhaustion: Captain decision #3 (`429` vs `503`; recommend `503` since this is server-side contention, not client rate violation)

### 4b. Contention behavior contract

- No quota over-allocation under concurrent writes
- If lock contention persists past retry budget, return deterministic error
- Double-increment impossible because rollback undoes all changes before retry

---

## Step 5: Public Response Privacy Guard (COMPLETED)

> **Review finding [H-2]:** Already implemented. `JobsController.cs` List (lines 48-59) and Get (lines 84-97) both use explicit field projection that excludes `inviteCode`. Confirmed in `Current_Status.md`: "inviteCode removed from public List/Get responses (privacy fix)" — commit `976539f`.

### 5a. `apps/api/Controllers/JobsController.cs` - response field policy
- ✅ `inviteCode` excluded from public list responses (explicit projection, no `inviteCode` field)
- ✅ `inviteCode` excluded from public single-job responses (same pattern)
- Regression test for response shape → carried to Step 8b item 4

### 5b. Regression assertion
- ✅ Public job APIs do not leak `inviteCode` in any response path
- Regression assertion included in Step 8b smoke checks

---

## Step 6: Input Policy Gate (COMPLETED)

### 6a. Deterministic structural gate (API authoritative)

**Target file:**

- `apps/api/Controllers/AnalyzeController.cs`

Add/verify structural blocking rules that do not interpret meaning:

- Reject empty/whitespace-only payloads
- Enforce max input size (chars + bytes)
- Enforce max URL count in free-text submissions
- Allow only `http`/`https` URL schemes
- Reject control-character-heavy payloads and malformed transport bodies

### 6b. Semantic risk gate (LLM, multilingual)

**Target files (new):**

- `apps/web/src/lib/input-policy-gate.ts`
- `apps/web/prompts/text-analysis/input-policy-gate.prompt.md`
- `apps/web/src/app/api/fh/analyze/route.ts`

Implement one lightweight LLM decision call returning structured output:

- `allow | reject` (v1 scope — no `review` state)
- `reasonCode` (enum-like contract label)
- `messageKey` (UI-safe generic reason)

> **Review finding [H-4]:** `review` decision cut for v1. It requires an undefined workflow (queue, admin notification, timeout-to-reject). Without this workflow, `review` is functionally identical to `reject` (dead end) or `allow` (no protection). Simplify to binary `allow | reject` for pre-release. `review` can be added in a future phase with a proper manual review queue.

Rules:

- No hardcoded keyword lists or regex semantic classification
- Prompt text and decision instructions must be UCM-managed (no inline hardcoded prompt text)
- Preserve multilingual neutrality (same policy behavior across languages)
- Use Haiku-tier model for cost efficiency (~$0.001-0.005 per gate call)
- Add short-TTL input-hash cache (5 min) to avoid repeated LLM calls for identical inputs

### 6c. Logging and privacy contract

- Log decision metadata (`decision`, `reasonCode`, job correlation ID) without storing raw blocked payload text
- Return deterministic user-facing HTTP status and generic error message (`422` for rejected input)
- Define explicit fallback behavior if LLM gate errors (`fail-open` vs `fail-closed`) as Captain decision

### 6d. Acceptance criteria

1. Structural-invalid payloads are rejected consistently before job creation
2. Semantically abusive/tool-manipulation inputs are rejected across at least 3 languages (EN, DE, FR — per AGENTS.md multilingual mandate) and 4 abuse categories (prompt injection, hate speech, spam/SEO, personal data extraction)
3. Normal controversial/political claims are not blocked purely by topic
4. Decision logs are redacted and auditable
5. Gate failures follow documented fallback policy (Captain decision #8)

> **Review finding [M-2]:** Original criterion #2 was untestable ("multiple languages" — how many? which categories?). Now specifies minimum 3 languages and 4 abuse categories. Create test fixture file for deterministic regression testing.

---

## Step 7: Invite Quota Admin UI (COMPLETED)

### 7a. API endpoints (admin-protected)
- Created `AdminInviteCodesController` with `List`, `Get`, `Create`, `Deactivate`, and `Delete` (hard) endpoints.
- Implemented `GetInviteCodeStatusAsync` in `JobService` for quota introspection.
- **⚠ [B-1] Auth method uses timing-unsafe `==` comparison — fix tracked in Step 2c.**

### 7b. Admin UI page
- Created `apps/web/src/app/admin/invites/page.tsx` for invite management.
- Added "Access Control & Invites" section to the main Admin dashboard.

### 7c. User Quota Visibility
- Added `GET /v1/analyze/status` endpoint for public quota checks.
- Integrated quota status badge into `AnalyzePage` with debounced validation.

---

## Step 7b: Database Persistence Maturity (EF Migrations) (COMPLETED)

> **[L-1]:** Renumbered from Step 11 to Step 7b to fix non-sequential ordering.

### 7b-a. Transition to Migrations
- Installed `dotnet-ef` global tool.
- Created `InitialInviteSystem` migration.
- Replaced `Database.EnsureCreated()` with `Database.Migrate()` in `Program.cs`.
- **Deployment impact:** Step 9c now includes EF migration check before service start.

---

## Step 8: Release Verification and Smoke Gates

### 8a. Build and safe test suite

1. `cd apps/api && dotnet build`
2. `npm -w apps/web run build`
3. `npm test` (safe suite only)

### 8b. Functional smoke checks

1. Valid invite submission succeeds and increments counters correctly
2. Daily/lifetime quota exceeded path returns expected error
3. Concurrent submissions do not over-allocate invite slots
4. `GET /v1/jobs` and `GET /v1/jobs/{id}` do not expose `inviteCode`
5. Admin routes reject missing/invalid admin key (both web and API sides)
6. SSRF probes are blocked (`localhost`, private ranges, redirect abuse)
7. Burst submissions trigger throttling (`429`) as configured
8. Admin invite-code page can update/reset quotas and reflects changes correctly
9. Input policy gate rejects malformed/abusive payloads and allows valid analytical input
10. Input policy gate rejects abusive payloads in at least 3 languages (EN, DE, FR) — **[M-4]**
11. CORS blocks cross-origin requests from non-allowlisted origins — **[H-3]**

> **Review recommendation:** These smoke checks should be scripted into `scripts/smoke-test.ps1` for repeatable pre-deploy verification. Manual checklists drift. Define expected HTTP status + response shape for each check.

### 8c. Calibration policy

- Do not run expensive calibration tests by default
- Run calibration smoke only when explicitly requested

---

## Step 9: Deployment and Rollback Plan

### 9a. Deployment scope

- Single-instance rolling restart deployment (no blue/green in this phase)
- Deploy web + API with existing scripts, then run post-deploy health checks

### 9b. Pre-deploy checklist

1. Confirm API/web builds are green (Step 8a)
2. Backup `apps/api/factharbor.db` before release
3. Confirm env vars are present and consistent:
   - `FH_ADMIN_KEY`
   - `FH_INTERNAL_RUNNER_KEY`
   - LLM/search provider keys used by current UCM config
4. Confirm invite-code seed/migration assumptions for the target environment

### 9c. Deployment procedure

1. Stop services: `scripts/stop-services.ps1`
2. Deploy updated code/config
3. Check for pending EF migrations: `dotnet ef migrations list --project apps/api`. If any pending, run `dotnet ef database update --project apps/api` after backup. — **[M-3]**
4. Start services: `scripts/restart-clean.ps1` (or `scripts/build-and-restart.ps1`)
5. Validate service health: `scripts/health.ps1`
6. Run smoke checks from Step 8b on deployed instance

### 9d. Rollback procedure

1. Stop services
2. Revert to previous known-good code revision
3. Restore `factharbor.db` backup if schema/data incompatibility is detected
4. Restart services and re-run health/smoke checks

### 9e. Deployment acceptance gate

- No blocking errors in health checks
- No regression in invite quota enforcement or privacy guard
- No unauthorized admin-route access

---

## Step 10: Additional Security Measures (Beyond Minimum Gate)

These are recommended for limited public pre-release hardening after P0 gates land.

### 10a. Must add before broadening traffic

- ~~CORS allowlist~~ — **Promoted to P0 (Step 3a2)** per review finding [H-3]
- Security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, CSP baseline)
- Log redaction for secrets (`X-Admin-Key`, `X-Runner-Key`, API keys)
- Dependency and vulnerability scan in CI (npm + NuGet)

### 10b. Strongly recommended in the same release window

- Per-route request body size limits (especially analyze endpoints)
- Stricter timeout/cancellation propagation to avoid request pileups
- Basic audit trail for admin config mutations (who/when/what changed)
- Simple alerting on repeated `401/403/429/5xx` spikes

### 10c. Next phase (post pre-release)

- WAF/CDN front-door rules
- Secret rotation schedule and runbook
- Separate internal/admin surface from public surface
- Full AuthN/AuthZ (OIDC/RBAC) and least-privilege admin model

---

## Planned Files

> **[M-5]:** Table updated to reflect actual file paths and completion status.

| # | File | Action | Addresses | Status |
|---|------|--------|-----------|--------|
| 1 | `apps/web/src/lib/retrieval.ts` | SSRF hardening + streaming size enforcement | Security-S1, S-2 | ✅ Done |
| 2 | `apps/web/src/lib/auth.ts` | Timing-safe `checkAdminKey()` | Security-S2 | ✅ Done |
| 3 | `apps/web/src/app/api/admin/**/route.ts` | All 25+ routes use `checkAdminKey()` | Security-S2 | ✅ Done |
| 3b | `apps/api/Controllers/AdminInviteCodesController.cs` | Timing-safe auth via `AuthHelper` [B-1] | Security-S2 | ✅ Done |
| 3c | `apps/api/Helpers/AuthHelper.cs` | Shared API auth helper (`CryptographicOperations.FixedTimeEquals`) | Security-S2 | ✅ Done |
| 4 | `apps/api/Controllers/AnalyzeController.cs` | Structural validation + rate limiting + body size limit | Security-S3, Input Policy, S-8 | ✅ Done |
| 4b | `apps/api/Program.cs` | Rate limiting + CORS + Swagger guard | Security-S3, H-3, S-3 | ✅ Done |
| 5 | `apps/api/Services/JobService.cs` | SQLite contention retry (3x, SQLITE_BUSY only) | Reliability H-5 | ✅ Done |
| 6 | `apps/api/Controllers/JobsController.cs` | Cancel/retry auth + inviteCode excluded | Privacy S-1 | ✅ Done |
| 7 | `apps/web/src/app/api/fh/analyze/route.ts` | LLM input policy gate integration | Input Policy | ✅ Done |
| 8 | `apps/web/test/**` | 1113 tests passing; calibration smoke PASS | QA Gate | ✅ Done |
| 9 | `apps/api/Controllers/AdminInviteCodesController.cs` | Admin invite CRUD endpoints | Operations | ✅ Done |
| 10 | `apps/web/src/app/admin/invites/page.tsx` | Invite management UI | Operations | ✅ Done |
| 11-13 | Deployment scripts | Exist and documented in Step 9 | Deployment | Exists |
| 14 | `apps/web/src/lib/input-policy-gate.ts` | LLM semantic gate (Haiku, structured output, XML escaping) | Input Policy | ✅ Done |
| 15 | `apps/web/prompts/input-policy-gate.prompt.md` | UCM-managed gate prompt | Input Policy | ✅ Done |
| 16 | `scripts/smoke-test.ps1` | Automated smoke test runner | QA Gate | Deferred |

---

## Step 11: API Data Exposure Hardening

**Priority:** P0 (network isolation) + P1 (data redaction) + P2 (read rate limiting)
**Effort:** ~4-6 hours total
**Addresses:** S-6 (inputValue exposure), metrics exposure, enumeration protection

**Problem:** All read endpoints (job list, job detail, metrics) are completely unauthenticated. Anyone can enumerate all analyses, read full user input text, and access system-wide operational metrics.

**Strategy:** Three-layer hybrid protection — network isolation + proxy-level data redaction + read rate limiting.

### 11a. Network isolation — Bind .NET API to localhost only (P0)

Create `apps/api/appsettings.Production.json`:
```json
{
  "Kestrel": {
    "Endpoints": {
      "Http": { "Url": "http://127.0.0.1:5000" }
    }
  }
}
```

- Next.js is the sole public-facing surface; .NET API unreachable from outside the host
- Verify `FH_API_BASE_URL` points to `http://localhost:5000` or `http://127.0.0.1:5000`
- **Test:** Attempt connection to port 5000 from different machine — must fail

**Effort:** ~15 minutes

### 11b. Proxy-level data redaction — Job list (P1)

**File:** `apps/web/src/app/api/fh/jobs/route.ts`

- Parse upstream JSON response (instead of raw passthrough)
- Non-admin: replace `inputPreview` with generic label based on `inputType` ("Text analysis" / "URL analysis")
- Admin (valid `x-admin-key`): pass through unmodified
- Keep visible for all: `jobId`, `status`, `progress`, `createdUtc`, `inputType`, `pipelineVariant`, `verdictLabel`, `truthPercentage`, `confidence`

**Rationale:** Job list serves discovery/demo. Users see analyses exist with verdicts, but cannot read what others submitted.

**Effort:** ~1 hour

### 11c. Proxy-level data redaction — Job detail (P1)

**File:** `apps/web/src/app/api/fh/jobs/[id]/route.ts`

- Parse upstream JSON response
- Non-admin: replace `inputValue` with `inputPreview` (truncated) or `"[Details visible to admin]"`
- Keep `resultJson`, `reportMarkdown` visible (derived analysis, not private user data — demo value)
- Admin: full response, unmodified

**Effort:** ~1 hour

### 11d. Admin-gate metrics endpoints (P1)

**Files:**
- `apps/web/src/app/api/fh/metrics/summary/route.ts`
- `apps/web/src/app/api/fh/metrics/quality-health/route.ts`

- Add `if (!checkAdminKey(request)) return 401` guard to GET handlers
- Metrics reveal costs, token counts, failure rates, quality trends — operational intelligence

**Effort:** ~30 minutes

### 11e. Rate limiting on read endpoints (P2)

**Files:** `apps/api/Program.cs`, `apps/api/Controllers/JobsController.cs`

- Add `ReadPerIp` policy: 30 req/min per IP (admin bypasses)
- Apply `[EnableRateLimiting("ReadPerIp")]` to `List()` and `Get()` in `JobsController`
- Prevents scripted enumeration while allowing normal browsing

**Effort:** ~1 hour

### 11f. Acceptance criteria

1. Direct connection to .NET API port 5000 from external machine is refused
2. `GET /api/fh/jobs` without admin key returns job list with `inputPreview` replaced by generic label
3. `GET /api/fh/jobs/{id}` without admin key returns `inputValue` as redacted text
4. `GET /api/fh/metrics/summary` without admin key returns 401
5. Admin key holders see full, unredacted data on all endpoints
6. UI jobs list page renders correctly with redacted preview text
7. UI job detail page renders correctly with redacted input (results, verdict, report still display)

### 11g. Design decisions (not done)

- **No per-user job scoping:** Invite codes are shared (not per-user identifiers). No "my jobs" concept without session management.
- **No SSE events gating:** Events contain only progress messages. JobIds are 32-char hex GUIDs (unguessable without enumeration).
- **No deep resultJson scrubbing:** Fragile and error-prone. Analysis is derived data, not private input.
- **No session management:** Explicitly out of scope for pre-release.

---

## Step 12: UI Polish & Pre-Release Disclaimer (COMPLETED)

**Priority:** P1 (must ship with pre-release)
**Effort:** ~2-4 hours total
**Addresses:** Visual identity, legal protection, user expectations
**Commit:** `53f3ab4`

### 12a. Visual polish — Global background and branding

**Files:** `apps/web/src/styles/globals.css` or `common.module.css`, `apps/web/src/app/layout.tsx`

- Set a consistent page background color (light neutral — not plain white)
- Ensure header/nav has FactHarbor branding (logo or text mark + tagline)
- Consistent card/panel styling across jobs list, job detail, analyze page, admin pages
- Pre-release visual indicator (e.g., subtle "Alpha" badge in header)

### 12b. Pre-release disclaimer banner

**Files:** `apps/web/src/components/DisclaimerBanner.tsx` (new), `apps/web/src/app/layout.tsx`

- Persistent banner (top or bottom of every page) with pre-release disclaimer text
- Not dismissible (always visible during pre-release phase)
- Content requirements (see agent prompt below for text):
  - Alpha/pre-release status
  - Results are AI-generated and may contain errors
  - Not a substitute for professional fact-checking
  - No warranty or liability
  - Data may be reset during pre-release

### 12c. Footer with documentation link

**Files:** `apps/web/src/components/Footer.tsx` (new or extend layout), `apps/web/src/app/layout.tsx`

- Footer on all pages with:
  - Link to `https://factharbor.ch` (documentation/project site)
  - Version/build identifier
  - "Powered by FactHarbor" text
  - Copyright notice

### 12d. Analyze page — methodology note

**File:** `apps/web/src/app/analyze/page.tsx`

- Brief methodology summary below the input area (what happens when you submit)
- Link to full methodology documentation on FactHarbor.ch

### 12e. Job detail page — result disclaimer

**File:** `apps/web/src/app/jobs/[id]/page.tsx`

- Inline disclaimer above results: "This analysis was generated by AI using publicly available sources. It may contain errors or omissions."

### 12f. Acceptance criteria

1. Background color is consistent across all pages (no plain white body)
2. Pre-release disclaimer banner visible on every page
3. Footer with FactHarbor.ch link visible on every page
4. Analyze page shows methodology note
5. Job detail shows result disclaimer above findings
6. Alpha badge visible in header/nav

---

## Planned Files (Updated)

> Includes Step 11 and Step 12 files.

| # | File | Action | Addresses | Status |
|---|------|--------|-----------|--------|
| 17 | `apps/api/appsettings.Production.json` (new) | Create — Kestrel localhost binding | API Protection 11a | TODO |
| 18 | `apps/web/src/app/api/fh/jobs/route.ts` | Modify — parse + redact inputPreview for non-admin | API Protection 11b | TODO |
| 19 | `apps/web/src/app/api/fh/jobs/[id]/route.ts` | Modify — parse + redact inputValue for non-admin | API Protection 11c | TODO |
| 20 | `apps/web/src/app/api/fh/metrics/summary/route.ts` | Modify — add admin key gate to GET | API Protection 11d | TODO |
| 21 | `apps/web/src/app/api/fh/metrics/quality-health/route.ts` | Modify — add admin key gate to GET | API Protection 11d | TODO |
| 22 | `apps/api/Controllers/JobsController.cs` | Modify — add ReadPerIp rate limiting | API Protection 11e | TODO |
| 23 | `apps/web/src/app/globals.css` | Background #f5f6f8 | UI Polish 12a | ✅ Done |
| 24 | `apps/web/src/app/layout.tsx` | Banner + footer + Alpha badge | UI Polish 12b/c | ✅ Done |
| 25 | `apps/web/src/components/DisclaimerBanner.tsx` | Persistent amber disclaimer | UI Polish 12b | ✅ Done |
| 26 | `apps/web/src/components/Footer.tsx` | Copyright + factharbor.ch link | UI Polish 12c | ✅ Done |
| 27 | `apps/web/src/app/analyze/page.tsx` | Methodology note | UI Polish 12d | ✅ Done |
| 28 | `apps/web/src/app/jobs/[id]/page.tsx` | Result disclaimer (SUCCEEDED only) | UI Polish 12e | ✅ Done |

---

## Deferred (Post-Launch)

- EF migration strategy for production lifecycle
- Full AuthN/AuthZ platform (OIDC/SSO/RBAC)
- Multi-instance deployment topology
- Normalized relational analytics schema
- Per-user job scoping (requires session management or per-user invite codes)
- ~~Invite quota introspection endpoint~~ — **[M-6]:** Already shipped as `GET /v1/analyze/status` in `AnalyzeController.cs:33-43`. Removed from deferred list.

---

## Captain Decisions Required

> **Review update:** Decisions #4 and #7 removed (already shipped). Two new decisions added. Decision #8 is implementation-blocking.

1. ~~Per-IP throttle default~~ — **DECIDED & SHIPPED**: 5 req/min fixed-window per-IP on `/v1/analyze`
2. ~~SQLite contention retry~~ — **DECIDED & SHIPPED**: 3 retries, 50/100/200ms, SQLITE_BUSY only
3. ~~Contention exhaustion status code~~ — **DECIDED & SHIPPED**: `503`
4. ~~Quota-remaining endpoint~~ — **SHIPPED** (`GET /v1/analyze/status`)
5. Deployment rollback policy: DB restore allowed automatically vs manual approval gate — **Pending**
6. Security-header policy strictness for pre-release (minimal vs strict CSP) — **Pending**
7. ~~Admin invite UI scope~~ — **SHIPPED** (full CRUD)
8. ~~Input gate fallback~~ — **DECIDED & SHIPPED**: Fail-open (structural gate always runs first)
9. ~~Public API exposure~~ — **DECIDED & SHIPPED**: Web-only; CORS enforces (`FH_CORS_ORIGIN`)
10. ~~Input gate latency~~ — **DECIDED**: Acceptable for pre-release (1-3s)
11. ~~Input gate `review` workflow~~ — **DECIDED**: Cut for v1 (allow/reject only)

---

## Review Checklist

- [x] Scope is sufficient for limited public pre-release — **Yes, with CORS promoted to P0**
- [x] All P0 hardening items are testable and bounded — **Yes, after review edits**
- [x] No hidden architecture expansion in this phase — **Confirmed**
- [x] Expensive test policy remains respected — **Confirmed**
- [x] Captain decision points are explicit and actionable — **Updated: 2 stale removed, 2 new added, #8 marked blocking**
- [x] Input policy gate is multilingual, UCM-managed, and does not rely on keyword heuristics — **Yes; simplified to allow|reject; test fixtures specified**
- [x] Invite quota admin operations are safe, auditable, and testable — **Yes; auth fix [B-1] tracked in Step 2c**
- [x] Deployment + rollback path is documented and testable — **Yes, with EF migration step added**
- [x] Additional security controls are prioritized by phase — **Yes; CORS promoted from 10a to P0**

---

## Review Round Package

### Review Objective

Validate that this plan is implementation-ready for a limited public pre-release without introducing unnecessary production-scope expansion.

### Requested Reviewer Roles

- Lead Architect: scope integrity, deployment safety, and sequencing
- Senior Developer: implementation feasibility and testability
- Security Expert: abuse paths and minimum viable hardening sufficiency
- Code Reviewer: regression risk, missing tests, edge-case handling

### Review Inputs

1. This plan: `Docs/WIP/2026-03-01_Limited_Public_PreRelease_Readiness_Plan.md`
2. Invite code implementation plan: `Docs/WIP/2026-02-28_Invite_Code_Implementation_Plan.md`
3. Current status: `Docs/STATUS/Current_Status.md`
4. Known issues: `Docs/STATUS/KNOWN_ISSUES.md`
5. Backlog priorities: `Docs/STATUS/Backlog.md`

### Findings Format (for all reviewers)

- Severity: `BLOCKER`, `HIGH`, `MEDIUM`, `LOW`
- Include exact file/section reference
- State expected risk if unresolved
- Provide concrete fix recommendation

### Required Review Questions

1. Are any P0 controls missing for limited public pre-release?
2. Is the deployment/rollback procedure sufficient for single-instance SQLite operations?
3. Are security controls correctly phased (`must add`, `same window`, `next phase`)?
4. Is Step 6 (Input Policy Gate) robust, multilingual, and compliant with LLM-only semantic decision rules?
5. Is Step 7 (Invite Quota Admin UI) scoped correctly for operational support without over-expanding pre-release scope?
6. Are Step 8 and Step 9 verification/deployment gates specific enough to prevent risky release?
7. Are Captain decision points complete and unambiguous?

### Out of Scope for This Review Round

- Re-architecting to multi-instance or non-SQLite infrastructure
- Full enterprise identity platform design
- Post-launch optimization work not required for go-live gate

---

## Review Round 1 Findings — Senior Developer + DevOps (2026-03-01)

**Reviewer:** Claude Code (Opus 4.6) as Senior Developer + DevOps Expert
**Verdict:** Plan is sound but had 1 BLOCKER, 5 HIGH, 6 MEDIUM, 3 LOW findings. All findings have been applied to the plan above.

### Summary of Changes Applied

| Severity | Count | Key Items |
|----------|-------|-----------|
| **BLOCKER** | 1 | B-1: AdminInviteCodesController timing-unsafe `==` auth → Step 2c added |
| **HIGH** | 5 | H-1: Step 2 expanded to API side. H-2: Step 5 marked COMPLETED. H-3: CORS promoted to P0 (Step 3a2). H-4: `review` cut from Step 6. H-5: SQLite error code specified in Step 4. |
| **MEDIUM** | 6 | M-1: Step 1 marked verification-only. M-2: Step 6 test fixtures specified. M-3: EF migration added to Step 9c. M-4: Multilingual smoke check added to Step 8b. M-5: Planned Files table fixed. M-6: Stale deferred item removed. |
| **LOW** | 3 | L-1: Step 11 renumbered to 7b. L-2: ASP.NET middleware recommended for Step 3. L-3: KNOWN_ISSUES.md S2 noted as stale. |

### Implementation Feasibility Summary

| Step | Effort | Status |
|------|--------|--------|
| 0 (Baseline) | ~1-2h | ✅ DONE |
| 1 (SSRF) | ~1-2h | ✅ DONE — streaming size + DNS rebinding + private IP blocking |
| 2 (Auth sweep) | ~30min | ✅ DONE — `AuthHelper.cs` + `CryptographicOperations.FixedTimeEquals` |
| 3 (Rate limiting + CORS) | ~2-4h | ✅ DONE — `AnalyzePerIp` + `FactHarborCors` + Swagger guard |
| 4 (SQLite contention) | ~2-3h | ✅ DONE — 3 retries, SQLITE_BUSY only, 503 on exhaustion |
| 5 (Privacy guard) | ~15min | ✅ DONE |
| 6 (Input policy gate) | ~8-16h | ✅ DONE — LLM gate + structural validation + injection hardening |
| 7/7b (Invite admin + EF) | 0h | ✅ DONE |
| 8 (Verification) | ~2-4h | **NEXT** — build+tests pass, smoke checks pending |
| 9 (Deployment) | ~1-2h | Ready — procedure documented, EF migrations active |
| 10 (Additional security) | deferred | Phased — CORS promoted to P0 (done), rest post-launch |
| 11 (Data exposure) | ~4-6h | ✅ DONE — localhost binding, proxy redaction, metrics gating, read rate limiting (`875972b`) |
| 12 (UI polish + disclaimer) | ~2-4h | ✅ DONE — banner, footer, background, methodology note, result disclaimer (`53f3ab4`) |

### Remaining Doc Updates Needed (Outside This Plan)

- `Docs/STATUS/KNOWN_ISSUES.md`: Update S1 (SSRF → IMPLEMENTED), S2 (Admin auth → partial, web done, API pending)
- `Docs/STATUS/Backlog.md`: Reclassify security items from "low urgency" to "high urgency" per Backlog phase note

---

## Consolidated Review Report (All Rounds)

**Sources:** Round 1 (Senior Developer + DevOps, Claude Opus), Security Expert Review (Claude Opus)
**Handoff:** `Docs/AGENTS/Handoffs/2026-03-01_Security_Expert_PreRelease_Review.md`
**Date:** 2026-03-01
**Produced by:** Claude Code (Opus 4.6) — cross-referencing both reviews + working tree state

### 1. Deduplicated Findings List (severity-ranked)

#### BLOCKERS (2)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **B-1** | `AdminInviteCodesController.cs:32` — timing-unsafe `==` auth comparison | Round 1 | ✅ **FIXED** — `AuthHelper.cs` with `CryptographicOperations.FixedTimeEquals` (`0cd802d`) |
| **S-1** | Cancel/retry endpoints unauthenticated + retry bypasses invite quota (`CreateRetryJobAsync` never calls `TryClaimInviteSlotAsync` → 3 free analyses per failed job) | Security | ✅ **FIXED** — admin key required + retry calls `TryClaimInviteSlotAsync` (`0cd802d`) |

#### HIGH (5)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **S-2** | SSRF chunked response bypass — `response.text()` buffers unlimited body when no Content-Length header | Security | ✅ **FIXED** — `readResponseBodyWithLimit()` streaming byte counter (`0cd802d`, `9ea5eb5`) |
| **S-3** | Swagger exposed unconditionally in `Program.cs` (no environment guard) | Security | ✅ **FIXED** — wrapped in `if (app.Environment.IsDevelopment())` (`0cd802d`) |
| **S-4** | Input gate prompt injection — user text to LLM without injection hardening | Security | ✅ **FIXED** — XML escaping, 4000-char cap, structured output (`9ea5eb5`) |
| **H-3** | No CORS on API — any origin can call `/v1/analyze` | Round 1 | ✅ **FIXED** — `FactHarborCors` policy + `FH_CORS_ORIGIN` env var (`0cd802d`) |
| **H-5** | SQLite contention `catch { throw }` — no retry, no SQLITE_BUSY discrimination | Round 1 | ✅ **FIXED** — 3 retries, 50/100/200ms, `SqliteErrorCode == 5` only (`0cd802d`) |

#### MEDIUM (7)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **S-5** | Invite code in URL query string (`GET /v1/analyze/status?code=...`) — logged in access logs/Referer | Security | ✅ **FIXED** — moved to `X-Invite-Code` header |
| **S-6** | `GET /v1/jobs/{jobId}` returns full `inputValue` unauthenticated | Security | **Step 11** — proxy-level redaction planned |
| **S-7** | Input gate fail-open on LLM errors — attacker can trigger failures then submit abuse | Security | **BY DESIGN** — needs Captain #8 |
| **S-8** | No request body size limit on API (30MB default) — memory exhaustion before `ValidateRequest` runs | Security | ✅ **FIXED** — `[RequestSizeLimit(65_536)]` on Create (`0cd802d`) |
| **S-9** | SSE connection exhaustion — no per-IP concurrent limit, 10min thread hold | Security | Deferred — invite gating limits attack surface |
| **M-2** | Input gate test fixtures not created (3 languages, 4 abuse categories) | Round 1 | Deferred — gate implemented, fixtures for future |
| **M-3** | EF migration step in deployment procedure | Round 1 | **DONE** — `Program.cs` uses `Database.Migrate()` |

#### LOW (3)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **L-1** | Step numbering non-sequential | Round 1 | **DONE** |
| **L-2** | Use ASP.NET built-in rate limiting middleware | Round 1 | ✅ **DONE** — `AddRateLimiter` + `EnableRateLimiting("AnalyzePerIp")` (`0cd802d`) |
| **L-3** | `KNOWN_ISSUES.md` S2 stale | Round 1 | **NOT DONE** |

### 2. Required Changes Before Approval

#### P0 — Must fix before go-live

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 1 | Fix timing-unsafe auth (B-1) | `AdminInviteCodesController.cs` → `CryptographicOperations.FixedTimeEquals`; extract `Helpers/AuthHelper.cs` | ~30min |
| 2 | Gate cancel/retry behind admin key (S-1) | `JobsController.cs` — require admin key on cancel/retry; make retry call `TryClaimInviteSlotAsync` | ~1-2h |
| 3 | CORS allowlist (H-3) | `Program.cs` — `AddCors`/`UseCors`, restrict to web app origin | ~30min |
| 4 | Swagger environment guard (S-3) | `Program.cs` — wrap in `if (app.Environment.IsDevelopment())` | ~5min |
| 5 | Request body size limit (S-8) | `AnalyzeController.cs` — add `[RequestSizeLimit(65536)]` on `Create` | ~5min |
| 6 | Streaming size enforcement for chunked responses (S-2) | `retrieval.ts` — streaming reader + cumulative byte counter, abort at `MAX_RESPONSE_SIZE_BYTES` | ~2-3h |

#### P1 — Required before broadening traffic

| # | Item | File(s) | Effort |
|---|------|---------|--------|
| 7 | SQLite contention retry (H-5) | `JobService.cs` — retry loop catching `SqliteException` where `SqliteErrorCode == 5`; 3 retries, 50/100/200ms | ~2-3h |
| 8 | Rate limiting middleware (L-2) | `Program.cs` — `AddRateLimiter` fixed-window per-IP on `/v1/analyze`; needs Captain #1 | ~2-4h |
| 9 | Input gate injection test fixtures (S-4/M-2) | Test file with injection attempts in EN/DE/FR + 4 abuse categories | ~2-3h |

### 3. Deferred / Non-Blocking Improvements

| ID | Item | Rationale |
|----|------|-----------|
| ~~**S-5**~~ | ~~Invite code in URL query string~~ | ✅ **FIXED** — moved to `X-Invite-Code` header (API + proxy + UI) |
| **S-6** | `inputValue` exposure in job detail | **Addressed by Step 11** (proxy-level redaction for non-admin). |
| **S-9** | SSE connection exhaustion | Invite gating limits attack surface. Monitor. |
| **S-7** | Fail-open vs fail-closed | Acceptable for beta if structural gate (Step 6a) always runs. Re-evaluate with metrics. |
| **L-3** | KNOWN_ISSUES.md updates | Documentation hygiene, not code risk. |
| **10a** | Security headers (HSTS, CSP) | Not exploitable for API-only service at beta scale. |
| **10b** | Admin config audit trail | Nice-to-have for beta. |

### 4. Captain Decisions Required

| # | Decision | Blocking? | Recommendation |
|---|----------|-----------|----------------|
| **#1** | Per-IP throttle rate for `/v1/analyze` | P1 | 5 req/min |
| **#2** | SQLite retry policy | P1 | 3 retries, 50/100/200ms exponential backoff |
| **#3** | Contention exhaustion status code | P1 | `503` (server-side, not client rate) |
| **#5** | Deployment rollback: auto vs manual DB restore | No | Manual approval gate |
| **#6** | Security header strictness | No | Minimal for pre-release |
| **#8** | **Input gate fallback on LLM error** | **Yes** | **Fail-open acceptable** — structural gate always runs first |
| **#9** | Public API exposure: web-only vs direct | Yes (CORS) | Web-only; CORS enforces |
| **#10** | Input gate latency (1-3s per submission) | No | Acceptable. Monitor p95. |
| **#11** | Input gate `review` workflow | No | Confirmed cut for v1 |

### 5. Go / No-Go Recommendation

**~~NO-GO~~ → ~~CONDITIONAL GO~~ → GO pending smoke checks (Step 8b) — all implementation complete.**

All 2 blockers, 5 high-severity, and all actionable medium-severity findings have been resolved across commits `0cd802d` through `ccb3e88`. Implementation includes:

- ✅ Timing-safe auth (`AuthHelper.cs` + `CryptographicOperations.FixedTimeEquals`)
- ✅ Cancel/retry gated behind admin key + retry consumes invite quota
- ✅ CORS allowlist (`FH_CORS_ORIGIN` env var + localhost default)
- ✅ Swagger dev-only guard
- ✅ Request body size limit (65KB)
- ✅ Streaming SSRF size enforcement (chunked response protection)
- ✅ SQLite contention retry (3x, 50/100/200ms, SQLITE_BUSY only)
- ✅ Per-IP rate limiting (`AnalyzePerIp` + `ReadPerIp` fixed-window policies)
- ✅ Input gate injection hardening (XML escaping, 4000-char cap, structured output)
- ✅ DNS rebinding protection in retrieval.ts
- ✅ API data exposure hardening (localhost binding, proxy redaction, metrics gating)
- ✅ Invite code moved from URL to `X-Invite-Code` header (S-5)
- ✅ Monolithic dynamic pipeline removed (single pipeline: ClaimBoundary)
- ✅ UI polish, disclaimer banner, footer, methodology note

**Remaining before GO:**
1. ~~Step 11 (API data exposure hardening)~~ — ✅ DONE (`875972b`)
2. ~~Step 12 (UI polish + disclaimer)~~ — ✅ DONE (`53f3ab4`)
3. ~~Monolithic dynamic pipeline removal~~ — ✅ DONE (`122f34b`)
4. ~~S-5 (invite code in URL)~~ — ✅ FIXED (`ccb3e88`)
5. **Step 8b: Functional smoke checks** — run against live services
6. **Step 9: Deployment procedure** — execute on target environment

**Deferred items (acceptable for limited pre-release):**
- ~~S-5 (invite code in URL)~~ ✅ FIXED, S-9 (SSE limits), M-2 (gate test fixtures), L-3 (docs update)
