# Code Review: Full Day Review -- 25 Commits (2026-04-27)

**Date:** 2026-04-27
**Role:** Code Reviewer
**Agent:** Claude Opus 4.6
**Classification:** Significant
**Open Items:** Yes

## Scope

25 commits on `main` from 2026-04-27 (00:09–15:20 UTC+2). Reviewed via 5 parallel passes: verdict/adjudication, prompt, research pipeline, runner/queue, admin UI+API. A prior same-day review covered April 24–27 broadly; this review is a full independent pass over today's code only, with cross-verification of the prior HIGH finding (provenance — now resolved).

**Diffstat:** ~3,300 lines added across production code, ~1,600 lines added across tests, 8 prompt commits, 5 admin feature commits, 6 pipeline fix commits, 3 runner/script commits, 3 verdict fix commits.

## Verification

- **TypeScript tests:** 2037 passed, 1 skipped (108 test files)
- **Next.js build:** Not re-run (prior same-day review confirmed clean)
- **.NET tests:** Build locked by running API process (PID 21664) — not a code defect; prior review confirmed 12 C# tests passing

## Prior Review Finding Status

| # | Prior Finding | Status |
|---|--------------|--------|
| P4-011 | Prepared Stage 1 snapshot reuse without provenance validation (HIGH) | **RESOLVED** — `assertPreparedStage1ProvenanceMatches` validates all config hashes, fail-closed, with escape hatch. 6 tests covering missing provenance, stale hashes, parametric field checks, and forward capture. |

## Self-verification

After the initial 5-pass review, two rounds of verification agents (6 total) re-checked all findings against actual code.

**Round 1 — HIGH + prompt findings (3 agents):**
- **RQ-H1, RQ-H2, RQ-H3:** Confirmed real. Draft preparation has no heartbeat timer (only pipeline `onEvent` callbacks keep `updatedUtc` fresh), no double-read guard, and hard 409 block on PREPARING cancel with no admin override.
- **AD-H1:** Confirmed real. Hide/Unhide require admin key (reducing exposure), but Cancel is reachable via draft token. Rate limiting still missing on all three.
- **AD-H2:** Confirmed real. Affects audit trail IP accuracy only — rate limiting correctly uses `RemoteIpAddress`.
- **AD-H3:** **Downgraded to LOW.** Both fire-and-forget methods correctly create fresh DI scopes in catch blocks. Happy path uses only `HttpClient` (singleton-safe). No `DbContext` usage in any code path.
- **PR-H1:** **Downgraded to MEDIUM.** The direction rules span ~75-78 lines (not 130), have bold sub-headers organized by claim type, include worked examples and priority ordering. Dense but structured.
- **PR-H2:** **Downgraded to LOW.** `"contextual"` is used in two different fields (`claimDirection` vs `applicability`) on different analytical axes. Not a semantic collision.
- **PR-H3:** **Downgraded to MEDIUM.** Runtime code explicitly normalizes `"contextual"` to `"neutral"` with a counter (`contextualMappedToNeutralCount`). Works correctly, but prompt-level divergence is a maintenance hazard.

**Round 2 — all MEDIUM findings (3 agents):**
- **VD-M1, VD-M2, VD-M3:** All confirmed accurate against code. Post-repair rescue at line 1713 confirmed missing citation-side-gap guard. Suppression filter `.some()` and `||` semantics confirmed.
- **RQ-M1:** Confirmed — `acquiredSlot` always true when finally runs, making conditional a dead branch.
- **RQ-M2:** Confirmed — `.env.local` values interpolated into `-Command` string without quote escaping.
- **RQ-M3:** Not re-checked (test coverage gap — no code to verify against).
- **RQ-M4:** **REMOVED — WRONG.** Code has explicit `if (lastUpdateMs === null) { console.warn(...); continue; }` guard at line 950. The null case never reaches the subtraction. Finding also had incorrect JS semantics (`Date.now() - null` = `Date.now()`, not `0`).
- **AD-M1, AD-M2, AD-M3:** All confirmed accurate. No `HasMaxLength` on Message. Route mismatch between admin reads and user-facing writes. All expired drafts materialized via `.ToListAsync()`.
- **RS-M1:** Confirmed — spread operator produces shallow clone; `evidenceScope` is shared by reference.
- **PR-M1, PR-M2:** Confirmed accurate (~75-78 line count correct; normalization at line 352 confirmed).
- **PR-M3:** **Downgraded to LOW.** Sections share classification principles and partial key phrases, but are NOT near-verbatim duplicates. They serve different pipeline stages with different output schemas and substantial unique content.

## Findings Summary

| Severity | Count | Source Passes |
|----------|-------|---------------|
| **HIGH** | 5 | Runner (3), Admin (2) |
| **MEDIUM** | 12 | Prompt (2), Verdict (3), Admin (3), Runner (3), Research (1) |
| **LOW** | 19 | All passes |
| **INFO** | 10 | All passes |

## HIGH Findings

### [RQ-H1] Draft preparation has no heartbeat — stale detection relies on API `updatedUtc` freshness
**File:** `apps/web/src/lib/internal-runner-queue.ts:1019-1371`
**Description:** Job runner gained a heartbeat timer (lines 329–368), but `runDraftPreparationBackground` has no equivalent. The `onEvent` callbacks from `prepareStage1Snapshot` keep `updatedUtc` fresh during pipeline stage transitions, but silent gaps between events (e.g., a long LLM call) leave `updatedUtc` stale. If such a gap exceeds 15 minutes, the watchdog marks the draft as FAILED while it is still actively running. The background task then attempts to persist a "prepared" result on a failed draft.
**Recommendation:** Add a heartbeat timer to `runDraftPreparationBackground` mirroring the job heartbeat pattern, or guard the `prepared` API endpoint to reject writes to FAILED drafts.

### [RQ-H2] Stale draft recovery lacks double-read guard — race between watchdog and concurrent drain
**File:** `apps/web/src/lib/internal-runner-queue.ts:927-942`
**Description:** Unlike the job orphan recovery path (lines 662–684) which performs a second live API read before acting, the draft stale detection uses only the bulk `/recoverable` list response. Neither the stale-detection path nor the orphaned-draft reset path (lines 946–957) performs a second individual read to confirm the snapshot is current before acting.
**Recommendation:** Add a fresh single-draft API read (like the job path at line 665) before marking a draft as failed or resetting it to QUEUED.

### [RQ-H3] Cancellation blocked during PREPARING with no user escape hatch
**File:** `apps/api/Services/ClaimSelectionDraftService.cs:524-537`
**Description:** `CancelDraftAsync` returns 409 when a draft is PREPARING. The `actorType` parameter is not used to gate behavior — it blocks regardless of caller identity. No admin override or force parameter exists anywhere. Combined with the absence of a heartbeat (RQ-H1), a stuck preparation creates a worst-case ~15+ minute uncancellable window. The only automatic recovery paths are the 15-minute stale detection and the 24-hour draft expiry.
**Recommendation:** Allow cancellation during PREPARING (with runner-side cancelled-status check before persisting), or add an admin force-cancel endpoint.

### [AD-H1] Missing rate limiting on Cancel, Hide, and Unhide endpoints
**File:** `apps/api/Controllers/ClaimSelectionDraftsController.cs:342,358,369`
**Description:** Every other mutating endpoint applies `[EnableRateLimiting]`. These three do not. `Cancel` is the most exposed — reachable by non-admin callers via draft token. Hide/Unhide require admin key, reducing but not eliminating exposure.
**Recommendation:** Add `[EnableRateLimiting("AnalyzePerIp")]` to all three endpoints.

### [AD-H2] `ResolveSourceIp` reads raw `X-Forwarded-For` bypassing trusted-proxy validation
**File:** `apps/api/Controllers/ClaimSelectionDraftsController.cs:420-427`
**Description:** `Program.cs` correctly configures `ForwardedHeadersOptions` to trust only loopback, and rate limiting correctly uses the middleware-resolved `RemoteIpAddress`. However, `ResolveSourceIp` reads `X-Forwarded-For` directly from raw headers, allowing any external client to inject an arbitrary IP into the audit trail's `SourceIp` field. Impact is audit accuracy, not security enforcement.
**Recommendation:** Use `request.HttpContext.Connection.RemoteIpAddress` exclusively; remove manual `X-Forwarded-For` parsing.

## MEDIUM Findings

### Prompt

| ID | File | Description |
|----|------|-------------|
| PR-M1 | claimboundary.prompt.md:1222-1299 | Evidence Direction Contract is ~75-78 lines of direction rules. Structured with bold sub-headers by claim type and worked examples, but dense enough to warrant monitoring for selective-attention failures in Haiku-class models. |
| PR-M2 | claimboundary.prompt.md:1213 vs 2547 | EXTRACT_EVIDENCE uses `"contextual"` but APPLICABILITY_ASSESSMENT uses `"neutral"` for the same non-directional concept. Runtime explicitly normalizes at `research-extraction-stage.ts:352` with counter tracking. Works correctly but prompt-level divergence is a maintenance hazard. |

### Verdict

| ID | File | Description |
|----|------|-------------|
| VD-M1 | verdict-stage.ts:1713 | Post-repair plausibility rescue missing citation-side-gap guard, unlike the other two rescue paths updated in `453f9e34`. |
| VD-M2 | verdict-stage.ts:1264-1270 | Suppression filter uses `some` (existential) — intentionally conservative but semantics undocumented. |
| VD-M3 | verdict-stage.ts:1261 | `structurallyInvalidCitedIds` uses OR (missing from either registry or claim-local) — defensively correct but verify intent vs. AND. |

### Admin

| ID | File | Description |
|----|------|-------------|
| AD-M1 | migration + FhDbContext + service | `Message` column has no `maxLength` in schema; only app-layer 512-char truncation. Add `.HasMaxLength(512)` in OnModelCreating. |
| AD-M2 | [draftId]/page.tsx:127,177 | Admin detail reads from admin route but sends actions through user-facing route. Works via header passthrough but routing inconsistency is fragile. |
| AD-M3 | ClaimSelectionDraftService.cs:268-284 | `ListDraftsForAdminAsync` materializes all expired drafts into memory before filtering. Unbounded under sustained load. |

### Runner

| ID | File | Description |
|----|------|-------------|
| RQ-M1 | internal-runner-queue.ts:385 | `acquiredSlot = true` set unconditionally — dead branch in finally block. Flag is misleading. |
| RQ-M2 | restart-clean.ps1:107-112 | `.env.local` values interpolated into `-Command` string without escaping. Command injection vector for values containing quotes/semicolons. |
| RQ-M3 | runner-concurrency-split.integration.test.ts | No test for heartbeat cleanup on exception, stale-draft race, or cancellation 409 path. |

### Research

| ID | File | Description |
|----|------|-------------|
| RS-M1 | research-extraction-stage.ts:628-689 | Shallow clone shares nested `evidenceScope` object across direction clones. Not a live bug but latent cross-claim contamination hazard. |

## LOW Findings

| ID | Area | File | Description |
|----|------|------|-------------|
| PR-L1 | Prompt | claimboundary.prompt.md:6 | `lastModified` frontmatter stale (pre-dates final commits) |
| PR-L2 | Prompt | claimboundary.prompt.md:2 | Version still 1.0.9 despite structural additions; bump to signal hash change |
| PR-L3 | Prompt | claimboundary.prompt.md:1222-1288 + 2454-2560 | `"contextual"` used in both `claimDirection` and `applicability` fields. Different analytical axes (truth-direction vs jurisdictional proximity), so not a semantic collision — but label overlap could confuse future maintainers. |
| PR-L4 | Prompt | claimboundary.prompt.md:1903-1904 | Exact-match rule sits next to "non-exhaustive registry" caveat without structural separator |
| PR-L5 | Prompt | verdict-prompt-contract.test.ts | No contract test for Evidence Direction Contract header sub-rules |
| PR-L6 | Prompt | claimboundary.prompt.md:1255,1287,2470,2499 | "materially above or below" threshold undefined across 4 rule instances. Ambiguity risk for cross-run consistency. |
| AD-L1 | Admin | preparation/page.tsx + controller | Scope filter silently ignored when status filter is active |
| AD-L2 | Admin | Program.cs:153-157 + 278-310 | `EnsureClaimSelectionDraftEventsTable` duplicates migration DDL |
| AD-L3 | Admin | Entities.cs:103-138 | No `[MaxLength]` on `ClaimSelectionDraftEntity` text columns |
| AD-L4 | Admin | Controller:429-456 | Fire-and-forget methods correctly use `IServiceScopeFactory` in catch blocks and `HttpClient` (singleton) in happy path. No `DbContext` usage. Concern was overstated — but document that `_runner` must remain DB-independent. |
| VD-L1 | Verdict | verdict-stage.ts:1488 | Citation-side-gap guard coupled to `repairContext` existence, not detection capability |
| VD-L2 | Verdict | verdict-stage.test.ts | No multi-claim scenario test for citation-side-gap repair |
| VD-L3 | Verdict | verdict-stage.test.ts | No direct unit test for `suppressStructurallyResolvedGroundingIssues` |
| VD-L4 | Verdict | verdict-stage.ts:1224 | Duplicate `extractEvidenceIdsFromText` name (different impl in source-reliability-eval-helpers.ts) |
| PR-L7 | Prompt | claimboundary.prompt.md:1222-1260 + 2463-2500 | Shared classification principles with partial phrase reuse across EXTRACT_EVIDENCE and APPLICABILITY_ASSESSMENT. Not near-verbatim; they serve different pipeline stages with different output schemas. |
| RQ-L1 | Runner | service-process-cleanup.ps1:133,157,187 | Three redundant WMI snapshots; pass shared `$allProcesses` parameter |
| RQ-L2 | Runner | service-process-cleanup.ps1:185-209 | Orphan detection may kill non-FactHarbor `dotnet watch` processes |
| RS-L1 | Research | claimboundary-pipeline.ts:626-647 | Hash stability untested — test duplicates `stableJsonStringify` instead of importing |

## LLM Expert Assessment — Prompt Behavioral Effectiveness

**Overall verdict: PARTIALLY EFFECTIVE.** The 11 prompt commits address a real failure mode (metric-route-mismatched evidence misclassified as directional support). Metric route separation, source-existence demotion, and VERDICT_GROUNDING fixes will work well. However, three structural risks threaten consistent execution, particularly under Haiku-class models.

### LLM-Specific HIGH Findings

| ID | Section | Issue | Risk |
|----|---------|-------|------|
| LLM-1 | EXTRACT_EVIDENCE:1222-1300 | 29 negative instructions vs 1 buried positive permission (side-premise support at line 1259). Asymmetric penalty landscape. | Haiku will over-apply `contextual`, demoting genuinely directional evidence. |
| LLM-2 | Lines 1255, 1287, 2470, 2499 | "Materially above or below" undefined across 4 rule instances. No threshold or heuristic. | High cross-run variance for values differing 15-50%. |
| LLM-7 | EXTRACT_EVIDENCE overall | 7 distinct demotion paths to `contextual` vs 1 promotion path. Combined effect of LLM-1 and LLM-2. | Evidence pools for verdict stage will be systematically weakened ("contextual inflation"). |

### LLM-Specific MEDIUM Findings

| ID | Section | Issue |
|----|---------|-------|
| LLM-3 | EXTRACT_EVIDENCE | Triple articulation of approximate-parity rule (Contract, Rules, sub-bullets). Haiku recency bias toward least comprehensive version. |
| LLM-4 | Cross-section | `contextual`/`neutral` vocabulary split primes non-directional interpretation when APPLICABILITY sees incoming `claimDirection: "contextual"`. |
| LLM-9 | APPLICABILITY:2462-2472 | Dense Claim-Local Direction Contract front-loads comparison logic before applicability task. May bleed into non-comparison evidence. |
| LLM-10 | All 4 sections | Approximate-parity rule repeated 4 times with wording variations. Token waste (~150 tokens) and ambiguity about governing version. |

### LLM Expert Recommendations

1. **Restructure as positive decision tree** — Replace negation list with 3 steps: identify route → match route → classify by relation.
2. **Define "materially"** — Even a coarse heuristic ("~25% of the smaller side") gives the model a decision boundary.
3. **Promote side-premise support rule** — Move from buried line 1259 to immediately after the Evidence Direction Contract header.
4. **Deduplicate approximate-parity rule** — Define once in the Contract, use brief back-references elsewhere.
5. **Add incoming-label independence note to APPLICABILITY** — "Your `claimDirectionByClaimId` output is independent of the item's prior `claimDirection` label."

### What works well

- Metric route separation (endpoint vs period/window) — concrete, clear decision procedure
- Source-existence demotion to `contextual` — well-defined positive rule
- VERDICT_GROUNDING exact-ID matching and empty-array tolerance — precise, low-ambiguity
- APPLICABILITY two-output distinction (relevance vs direction) — cleanly structured
- No deterministic substring anti-patterns — rules are semantically defined

## Positive Observations

- **Provenance guard is textbook:** Fail-closed, comprehensive field validation, escape hatch, strong tests. Prior HIGH fully resolved.
- **Test expansion continues strong:** +1,600 test lines with thorough coverage of adjudication, direction cloning, heartbeat, stale recovery, and C# service logic.
- **Token security remains excellent:** SHA-256 + `FixedTimeEquals` + hash-only storage consistently applied.
- **No XSS vectors:** All dynamic content rendered through React JSX escaping. No `dangerouslySetInnerHTML`.
- **No SQL injection:** All DB access via EF Core parameterized LINQ. DDL uses hardcoded constants.
- **Evidence direction logic is correct:** Neutral-to-directional cloning with proper per-claim isolation and schema-level `.optional().catch([])` safety.
- **Heartbeat events are well-scoped:** All use `progress: -1` (info-only), proper cleanup guards.

## Recommended Priority Actions

1. **[RQ-H1+H2+H3] HIGH — Draft preparation heartbeat + stale guard + cancel escape** (internal-runner-queue.ts, ClaimSelectionDraftService.cs) — These three are interconnected; fixing the heartbeat resolves most of the stale-detection race and reduces the cancel-blocked window.
2. **[LLM-1+7] HIGH — Restructure EXTRACT_EVIDENCE direction rules as positive decision tree** (claimboundary.prompt.md:1222-1300) — 29 negation rules vs 1 buried positive permission causes contextual inflation under Haiku. Promote side-premise support rule; replace negation list with ordered procedure.
3. **[LLM-2] HIGH — Define "materially" threshold for approximate-parity rule** (claimboundary.prompt.md:1255,1287,2470,2499) — Undefined threshold causes high cross-run variance. Add a coarse heuristic.
4. **[AD-H2] HIGH — Remove raw `X-Forwarded-For` parsing** (ClaimSelectionDraftsController.cs) — Audit trail IP spoofing; quick one-liner fix.
5. **[AD-H1] HIGH — Add rate limiting to Cancel/Hide/Unhide** (ClaimSelectionDraftsController.cs) — One-line attribute additions. Cancel is the most exposed (draft-token auth only).
6. **[VD-M1] MEDIUM — Add citation-side-gap guard to post-repair rescue** (verdict-stage.ts:1713) — Consistency fix with the other two rescue paths.
7. **[LLM-10] MEDIUM — Deduplicate approximate-parity rule** (claimboundary.prompt.md) — Define once in Contract, back-reference elsewhere. Saves ~150 tokens, eliminates wording-divergence risk.
