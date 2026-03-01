# Limited Public Pre-Release Readiness - Implementation Plan

**Role:** Senior Developer
**Date:** 2026-03-01
**Status:** REVIEWS CONSOLIDATED — NO-GO pending P0 fixes (see §Consolidated Review Report)
**Based on:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/KNOWN_ISSUES.md`, `Docs/STATUS/Backlog.md` (security + reliability + cost-control items)

## Context

FactHarbor is in Alpha and the ClaimAssessmentBoundary pipeline is operational. Invite-code gating is being added for write access. Before opening a limited public pre-release, the highest-risk remaining gaps are URL-fetch hardening, admin endpoint protection, request throttling, contention handling under concurrent submissions, and operational tooling to set/reset invite quotas safely.

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

## Step 1: SSRF Hardening (VERIFICATION ONLY)

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

## Step 2: Admin Endpoint Auth Sweep

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

## Step 3: Rate Limiting, Submission Quotas, and CORS

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

## Step 4: SQLite Contention Handling for Invite Slot Claim

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

## Step 6: Input Policy Gate (Block Problematic Inputs)

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
| 1 | `apps/web/src/lib/retrieval.ts` | Verify (no code changes expected) + add tests | Security-S1 | Protections exist |
| 2 | `apps/web/src/lib/auth.ts` | Verify — already provides `checkAdminKey()` | Security-S2 | ✅ Done |
| 3 | `apps/web/src/app/api/admin/**/route.ts` | Verify — all 25+ routes already use `checkAdminKey()` | Security-S2 | ✅ Done |
| 3b | `apps/api/Controllers/AdminInviteCodesController.cs` | **Modify** — fix timing-unsafe `==` auth [B-1] | Security-S2 | **BLOCKER** |
| 3c | `apps/api/Helpers/AuthHelper.cs` (new) | **Create** — shared API auth helper | Security-S2 | TODO |
| 4 | `apps/api/Controllers/AnalyzeController.cs` | Modify — structural input validation + rate limiting setup | Security-S3, Input Policy | TODO |
| 4b | `apps/api/Program.cs` | Modify — add rate limiting middleware + CORS | Security-S3, CORS | TODO |
| 5 | `apps/api/Services/JobService.cs` | Modify — bounded retry/backoff for SQLite lock contention | Reliability | TODO |
| 6 | `apps/api/Controllers/JobsController.cs` | Verify only — inviteCode already excluded | Privacy | ✅ Done |
| 7 | `apps/web/src/app/api/fh/analyze/route.ts` | Modify — semantic input gate before API proxy | Input Policy | TODO |
| 8 | `apps/web/test/**` and/or `apps/api` tests | Modify/add — regression coverage for auth/privacy/contention | QA Gate | TODO |
| 9 | `apps/api/Controllers/AdminInviteCodesController.cs` | ✅ Created — admin invite quota endpoints | Operations | ✅ Done |
| 10 | `apps/web/src/app/admin/invites/page.tsx` | ✅ Created — invite management UI | Operations | ✅ Done |
| 11 | `scripts/stop-services.ps1` | Use in deployment runbook validation | Deployment | Exists |
| 12 | `scripts/restart-clean.ps1` / `scripts/build-and-restart.ps1` | Use in deployment runbook validation | Deployment | Exists |
| 13 | `scripts/health.ps1` | Use for post-deploy health gate | Deployment | Exists |
| 14 | `apps/web/src/lib/input-policy-gate.ts` | Create — LLM semantic input gate helper | Input Policy | TODO |
| 15 | `apps/web/prompts/text-analysis/input-policy-gate.prompt.md` | Create — UCM-managed semantic input gate prompt | Input Policy | TODO |
| 16 | `scripts/smoke-test.ps1` (new) | Create — automated smoke test runner | QA Gate | Recommended |

---

## Deferred (Post-Launch)

- EF migration strategy for production lifecycle
- Full AuthN/AuthZ platform (OIDC/SSO/RBAC)
- Multi-instance deployment topology
- Normalized relational analytics schema
- ~~Invite quota introspection endpoint~~ — **[M-6]:** Already shipped as `GET /v1/analyze/status` in `AnalyzeController.cs:33-43`. Removed from deferred list.

---

## Captain Decisions Required

> **Review update:** Decisions #4 and #7 removed (already shipped). Two new decisions added. Decision #8 is implementation-blocking.

1. Per-IP throttle default for `/v1/analyze` (requests/minute)
2. SQLite contention retry policy (attempt count + backoff). Recommendation: 3 retries, 50/100/200ms exponential backoff.
3. Status code policy for contention exhaustion (`429` vs `503`). Recommendation: `503` — server-side contention, not client rate violation.
4. ~~Whether to include quota-remaining endpoint in pre-release scope~~ — **SHIPPED** (`GET /v1/analyze/status`)
5. Deployment rollback policy: DB restore allowed automatically vs manual approval gate
6. Security-header policy strictness for pre-release (minimal vs strict CSP)
7. ~~Admin invite UI scope: reset-only vs reset+edit in Round 1~~ — **SHIPPED** (full CRUD implemented)
8. **[IMPLEMENTATION-BLOCKING]** Input gate fallback policy on LLM errors (`fail-open` vs `fail-closed`). Must decide before Step 6 implementation starts.
9. Public API exposure policy: web-only ingress vs direct API access allowed in pre-release. **Linked to CORS (Step 3a2)** — if direct API access is disallowed, CORS is the enforcement mechanism. Decide together.
10. **(NEW)** Input gate latency budget: LLM call adds 1-3s per submission. Acceptable for pre-release?
11. **(NEW)** Input gate `review` workflow: cut for v1 (plan assumes `allow | reject` only). Confirm or override.

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
| 0 (Baseline) | ~1-2h | Practical |
| 1 (SSRF) | ~1-2h | Verification-only + tests |
| 2 (Auth sweep) | ~30min | API fix only (web done) |
| 3 (Rate limiting + CORS) | ~2-4h | Needs Captain decision #1 |
| 4 (SQLite contention) | ~2-3h | Practical with error code spec |
| 5 (Privacy guard) | ~15min | Already done, verify only |
| 6 (Input policy gate) | ~8-16h | Most complex; needs decisions #8, #10, #11 |
| 7/7b (Invite admin + EF) | 0h | COMPLETED |
| 8 (Verification) | ~2-4h | Recommend scripted smoke tests |
| 9 (Deployment) | ~1-2h | Practical with EF step added |

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
| **B-1** | `AdminInviteCodesController.cs:32` — timing-unsafe `==` auth comparison | Round 1 | Code exists but **still uses `==`** |
| **S-1** | Cancel/retry endpoints unauthenticated + retry bypasses invite quota (`CreateRetryJobAsync` never calls `TryClaimInviteSlotAsync` → 3 free analyses per failed job) | Security | **NOT IMPLEMENTED** |

#### HIGH (5)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **S-2** | SSRF chunked response bypass — `response.text()` buffers unlimited body when no Content-Length header | Security | **PARTIAL** — private-IP + Content-Length check done, streaming byte counter missing |
| **S-3** | Swagger exposed unconditionally in `Program.cs` (no environment guard) | Security | **NOT DONE** |
| **S-4** | Input gate prompt injection — user text to LLM without injection hardening | Security | **PARTIAL** — structured output used, injection test fixtures missing |
| **H-3** | No CORS on API — any origin can call `/v1/analyze` | Round 1 | **NOT DONE** |
| **H-5** | SQLite contention `catch { throw }` — no retry, no SQLITE_BUSY discrimination | Round 1 | **NOT DONE** |

#### MEDIUM (7)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **S-5** | Invite code in URL query string (`GET /v1/analyze/status?code=...`) — logged in access logs/Referer | Security | **NOT FIXED** |
| **S-6** | `GET /v1/jobs/{jobId}` returns full `inputValue` unauthenticated | Security | **NOT FIXED** |
| **S-7** | Input gate fail-open on LLM errors — attacker can trigger failures then submit abuse | Security | **BY DESIGN** — needs Captain #8 |
| **S-8** | No request body size limit on API (30MB default) — memory exhaustion before `ValidateRequest` runs | Security | **NOT DONE** |
| **S-9** | SSE connection exhaustion — no per-IP concurrent limit, 10min thread hold | Security | **NOT DONE** |
| **M-2** | Input gate test fixtures not created (3 languages, 4 abuse categories) | Round 1 | **NOT DONE** |
| **M-3** | EF migration step in deployment procedure | Round 1 | **DONE** — `Program.cs` uses `Database.Migrate()` |

#### LOW (3)

| ID | Finding | Source | Impl Status |
|----|---------|--------|-------------|
| **L-1** | Step numbering non-sequential | Round 1 | **DONE** |
| **L-2** | Use ASP.NET built-in rate limiting middleware | Round 1 | **NOT DONE** |
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
| **S-5** | Invite code in URL query string | Low-traffic beta, no untrusted proxies. Fix when adding proper auth. |
| **S-6** | `inputValue` exposure in job detail | Data is user-submitted claims (not secrets). Address with Captain #9. |
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

**NO-GO for public pre-release until P0 items 1-6 are implemented.**

The working tree has ~70% of the plan done (invite system, input policy gate, SSRF IP blocking, admin UI, EF migrations, structural validation, quota display). Architecture is sound. But 2 blockers and 4 high-severity gaps remain:

- **S-1** (unauthenticated retry = free analyses) is the most dangerous
- **B-1** (timing-unsafe auth) is a 30-min fix
- **S-3 + S-8** are 5-minute fixes
- **H-3** (CORS) and **S-2** (chunked SSRF) need focused work

**Path to GO:**
1. Captain decides #8 (fail-open?) and #9 (web-only → CORS)
2. Implement P0 items 1-6 (~1 day)
3. Implement P1 items 7-9 (~1 day)
4. Run Step 8a (build + test) and Step 8b (smoke checks)
5. **GO** for limited public pre-release
