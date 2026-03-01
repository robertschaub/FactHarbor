# Limited Public Pre-Release Readiness - Implementation Plan

**Role:** Senior Developer
**Date:** 2026-03-01
**Status:** READY FOR REVIEW ROUND 1
**Based on:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/KNOWN_ISSUES.md`, `Docs/STATUS/Backlog.md` (security + reliability + cost-control items)

## Context

FactHarbor is in Alpha and the ClaimAssessmentBoundary pipeline is operational. Invite-code gating is being added for write access. Before opening a limited public pre-release, the highest-risk remaining gaps are URL-fetch hardening, admin endpoint protection, request throttling, and contention handling under concurrent submissions.

**Goal:** Launch a controlled limited public pre-release with minimum required hardening while keeping SQLite + single-instance operations.

---

## Launch Constraints

- Single API instance (no multi-instance deployment in this phase)
- SQLite remains the system database
- Public read/search remains open
- Analysis submission remains invite-code-gated
- No full AuthN/AuthZ platform in this phase

---

## Step 0: Pre-Implementation Baseline

**Action:** Confirm current baseline behavior before hardening changes.

1. Capture current behavior for:
   - Admin route auth behavior
   - Public job response fields
   - Analyze submission under burst requests
   - URL fetch behavior for SSRF-like targets
2. Keep baseline notes in PR/review summary to show before/after hardening effect.

---

## Step 1: SSRF Hardening

### 1a. `apps/web/src/lib/retrieval.ts` - outbound URL safety checks

Add/verify:

- Private/reserved IP blocking (loopback, RFC1918, link-local, multicast)
- Redirect limit enforcement
- Response size cap enforcement
- Strict timeout enforcement
- Fail-closed behavior on DNS/IP resolution errors

### 1b. Tests

Add/extend tests for blocked host/IP paths, redirect chain cap, and oversize response handling.

---

## Step 2: Admin Endpoint Auth Sweep

### 2a. `apps/web/src/app/api/admin/**/route.ts` - standardize auth checks

- Ensure every admin route uses shared admin-key helper from `apps/web/src/lib/auth.ts`
- Remove inline `===` key checks
- Normalize unauthorized response status/body

### 2b. Verification grep

After edits, verify no inline admin-key equality checks remain in admin route handlers.

---

## Step 3: Rate Limiting and Submission Quotas

### 3a. `apps/api/Controllers/AnalyzeController.cs` - request throttling

- Add lightweight per-IP throttling for analysis submissions
- Return `429` on throttle violation with clear error message

### 3b. `apps/api/Services/JobService.cs` - quota consistency

- Keep invite-code daily/lifetime enforcement as the authoritative gate
- Ensure throttling and quota responses remain deterministic and user-readable

### 3c. Optional edge proxy parity

- If needed, add minimal protection in `apps/web/src/app/api/fh/analyze/route.ts` for early rejection before API hop

---

## Step 4: SQLite Contention Handling for Invite Slot Claim

### 4a. `apps/api/Services/JobService.cs` - busy/lock retry path

For `TryClaimInviteSlotAsync`:

- Keep serializable transaction semantics
- Add bounded retry/backoff for transient SQLite busy/lock conflicts
- Emit structured log events for retries and final failure

### 4b. Contention behavior contract

- No quota over-allocation under concurrent writes
- If lock contention persists past retry budget, return deterministic error

---

## Step 5: Public Response Privacy Guard

### 5a. `apps/api/Controllers/JobsController.cs` - response field policy

- Ensure `inviteCode` is excluded from both public list and public single-job responses
- Add regression tests for response shape

### 5b. Regression assertion

- Public job APIs must not leak access-control secrets in any response path

---

## Step 6: Release Verification and Smoke Gates

### 6a. Build and safe test suite

1. `cd apps/api && dotnet build`
2. `npm -w apps/web run build`
3. `npm test` (safe suite only)

### 6b. Functional smoke checks

1. Valid invite submission succeeds and increments counters correctly
2. Daily/lifetime quota exceeded path returns expected error
3. Concurrent submissions do not over-allocate invite slots
4. `GET /v1/jobs` and `GET /v1/jobs/{id}` do not expose `inviteCode`
5. Admin routes reject missing/invalid admin key
6. SSRF probes are blocked (`localhost`, private ranges, redirect abuse)
7. Burst submissions trigger throttling (`429`) as configured

### 6c. Calibration policy

- Do not run expensive calibration tests by default
- Run calibration smoke only when explicitly requested

---

## Step 7: Deployment and Rollback Plan

### 7a. Deployment scope

- Single-instance rolling restart deployment (no blue/green in this phase)
- Deploy web + API with existing scripts, then run post-deploy health checks

### 7b. Pre-deploy checklist

1. Confirm API/web builds are green (Step 6a)
2. Backup `apps/api/factharbor.db` before release
3. Confirm env vars are present and consistent:
   - `FH_ADMIN_KEY`
   - `FH_INTERNAL_RUNNER_KEY`
   - LLM/search provider keys used by current UCM config
4. Confirm invite-code seed/migration assumptions for the target environment

### 7c. Deployment procedure

1. Stop services: `scripts/stop-services.ps1`
2. Deploy updated code/config
3. Start services: `scripts/restart-clean.ps1` (or `scripts/build-and-restart.ps1`)
4. Validate service health: `scripts/health.ps1`
5. Run smoke checks from Step 6b on deployed instance

### 7d. Rollback procedure

1. Stop services
2. Revert to previous known-good code revision
3. Restore `factharbor.db` backup if schema/data incompatibility is detected
4. Restart services and re-run health/smoke checks

### 7e. Deployment acceptance gate

- No blocking errors in health checks
- No regression in invite quota enforcement or privacy guard
- No unauthorized admin-route access

---

## Step 8: Additional Security Measures (Beyond Minimum Gate)

These are recommended for limited public pre-release hardening after P0 gates land.

### 8a. Must add before broadening traffic

- CORS allowlist (only approved front-end origins)
- Security headers (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, CSP baseline)
- Log redaction for secrets (`X-Admin-Key`, `X-Runner-Key`, API keys)
- Dependency and vulnerability scan in CI (npm + NuGet)

### 8b. Strongly recommended in the same release window

- Per-route request body size limits (especially analyze endpoints)
- Stricter timeout/cancellation propagation to avoid request pileups
- Basic audit trail for admin config mutations (who/when/what changed)
- Simple alerting on repeated `401/403/429/5xx` spikes

### 8c. Next phase (post pre-release)

- WAF/CDN front-door rules
- Secret rotation schedule and runbook
- Separate internal/admin surface from public surface
- Full AuthN/AuthZ (OIDC/RBAC) and least-privilege admin model

---

## Planned Files

| # | File | Action | Addresses |
|---|------|--------|-----------|
| 1 | `apps/web/src/lib/retrieval.ts` | Modify - SSRF safety checks | Security-S1 |
| 2 | `apps/web/src/lib/auth.ts` | Modify (if needed) - shared admin auth helper extensions | Security-S2 |
| 3 | `apps/web/src/app/api/admin/**/route.ts` | Modify - auth sweep and response standardization | Security-S2 |
| 4 | `apps/api/Controllers/AnalyzeController.cs` | Modify - per-IP throttling behavior | Security-S3, Cost-Control |
| 5 | `apps/api/Services/JobService.cs` | Modify - bounded retry/backoff for SQLite lock contention | Reliability |
| 6 | `apps/api/Controllers/JobsController.cs` | Modify - inviteCode privacy guard in public responses | Privacy |
| 7 | `apps/web/src/app/api/fh/analyze/route.ts` | Optional modify - early guard parity | Security-S3 |
| 8 | `apps/web/test/**` and/or `apps/api` tests | Modify/add - regression coverage for auth/privacy/contention | QA Gate |
| 9 | `scripts/stop-services.ps1` | Use in deployment runbook validation | Deployment |
| 10 | `scripts/restart-clean.ps1` / `scripts/build-and-restart.ps1` | Use in deployment runbook validation | Deployment |
| 11 | `scripts/health.ps1` | Use for post-deploy health gate | Deployment |

---

## Deferred (Post-Launch)

- EF migration strategy for production lifecycle
- Full AuthN/AuthZ platform (OIDC/SSO/RBAC)
- Multi-instance deployment topology
- Normalized relational analytics schema
- Invite quota introspection endpoint (if not needed for pre-release)

---

## Captain Decisions Required

1. Per-IP throttle default for `/v1/analyze` (requests/minute)
2. SQLite contention retry policy (attempt count + backoff)
3. Status code policy for contention exhaustion (`429` vs `503`)
4. Whether to include quota-remaining endpoint in pre-release scope
5. Deployment rollback policy: DB restore allowed automatically vs manual approval gate
6. Security-header policy strictness for pre-release (minimal vs strict CSP)

---

## Review Checklist

- [ ] Scope is sufficient for limited public pre-release
- [ ] All P0 hardening items are testable and bounded
- [ ] No hidden architecture expansion in this phase
- [ ] Expensive test policy remains respected
- [ ] Captain decision points are explicit and actionable
- [ ] Deployment + rollback path is documented and testable
- [ ] Additional security controls are prioritized by phase

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
4. Are Step 6 and Step 7 verification gates specific enough to prevent risky release?
5. Are Captain decision points complete and unambiguous?

### Out of Scope for This Review Round

- Re-architecting to multi-instance or non-SQLite infrastructure
- Full enterprise identity platform design
- Post-launch optimization work not required for go-live gate
