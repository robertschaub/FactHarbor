---
title: Selection Readiness Root Cause and Fix Plan
date: 2026-04-24
authors: Unassigned, Codex (GPT-5)
status: Reviewed; partially implemented
scope: Root causes behind delayed or missing Atomic Claim Selection and the recommended fix plan
related:
  - Docs/WIP/2026-04-23_Session_Preparation_Semantics_Preserving_Async_Proposal.md
  - Docs/WIP/2026-04-23_Grander_Runtime_Followup_Options.md
  - apps/web/src/app/analyze/page.tsx
  - apps/web/src/lib/internal-runner-queue.ts
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/src/lib/analyzer/verdict-stage.ts
---

# Selection Readiness Root Cause and Fix Plan

## 1. Purpose

This note turns the last live monitoring findings into an implementation plan.

It answers three questions:

1. why the Atomic Claim Selection dialog did not appear when expected
2. why selection readiness can still take too long even after the ACS/session work
3. what should be fixed next, in what order

The intent is to separate:

- issues that were already fixed
- issues that are still open
- issues that look noisy in monitoring but are not actual product blockers

## 2. Grounded Findings

These findings are grounded in:

- live session monitoring on 2026-04-23
- DB state and session/job status checks
- runtime logs in:
  - `apps/web/.next/dev/logs/next-development.log`
  - `apps/web/debug-analyzer.log`
- current implementation in:
  - `apps/web/src/app/analyze/page.tsx`
  - `apps/web/src/lib/internal-runner-queue.ts`
  - `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
  - `apps/web/src/lib/analyzer/verdict-stage.ts`

## 3. Root Causes

### 3.1 Root cause A — Web submit flow forced `automatic` mode

**Status:** fixed

The web analyze page was hardcoding:

- `selectionMode: "automatic"`

in the draft-creation request and in the locally stored session reference.

That meant:

- long article/PDF inputs could produce many candidate claims
- ACS recommendation would run
- the system would auto-select the recommended set
- the manual AC selection dialog would never appear

This was not a Stage 1 failure. It was a web submit-path behavior bug.

### 3.2 Root cause B — Long time to selection is dominated by Stage 1, not the ACS recommendation call

**Status:** open

Current preparation is not just:

- atomic-claim extraction
- recommendation/check-worthiness

Current preparation includes the full Stage 1 path:

- Pass 1
- salience commitment
- preliminary web search
- Pass 2 evidence-grounded extraction
- contract validation / retry logic
- Gate 1
- then ACS recommendation

So the main contributor to time-to-selection is still Stage 1, especially on:

- long political PDFs
- broad article pages
- campaign or manifesto-style content

The recommendation call adds cost, but it is not the main delay driver.

### 3.3 Root cause C — Stage 1 broad-input quality remains a real risk, but it is not yet the best-grounded primary driver of selection delay

**Status:** open, but currently secondary to latency

The most important repeatedly measured problem for selection readiness is still latency, not repeated contract-preservation failure.

There is still a quality risk on broad, multi-branch political/article inputs:

- the extractor can under-preserve the full thesis structure
- important branches of the page argument can be omitted or collapsed
- a bundled claim can survive where separate branch claims are preferable

But the current local evidence does **not** support claiming this as the dominant repeated failure mode behind delayed selection readiness.

What is currently grounded:

- recent broad-input sessions still showed coverage gaps and bundled-consequence issues
- the stronger repeated measurement is still `stage1Ms`, not recurring `preservesContract = false` failures
- the strongest recent contract-preservation rejection captured in follow-up notes remains the Grander failure class, which is analytically important but not enough by itself to justify making this the top readiness priority

So this remains a real analytical-risk seam, but it should be framed as:

- a targeted quality investigation track
- triggered by concrete failing packets
- not the best-grounded first explanation for why users wait too long before selection becomes available

### 3.4 Root cause D — Monitoring is harder than necessary because draft and job logs interleave

**Status:** open

While monitoring a draft in `PREPARING`, the live log tail also included evidence/research work from a different running report job.

That creates a recurring ambiguity:

- the session page shows one run
- the log tail shows lines from another run
- the operator can misread a healthy draft as contradictory or stuck

This is an observability problem, not a pipeline-integrity problem.

### 3.5 Root cause E — Dev-browser hydration mismatch noise is present but not currently a product blocker

**Status:** monitor only

The `/analyze` page showed hydration mismatch noise caused by browser-extension DOM injection, specifically a LastPass root node.

Current assessment:

- noisy for local monitoring
- not a grounded root cause for the ACS/session problems
- not a current priority unless it reproduces without browser extensions

## 4. What Was Already Fixed In The Current Worktree

These issues should not drive the next implementation cycle:

1. **Forced automatic ACS mode from `/analyze`**
- implemented by making the default mode UCM-backed and defaulting it to `interactive`
- this applies to newly created sessions in the current worktree
- it is not retroactive to sessions that were already created in `automatic` mode before the fix

2. **Queued/preparing sessions or stale jobs appearing permanently stuck**
- improved by route-triggered queue recovery kicks and the prep/job concurrency split

3. **Browser-close session recovery**
- implemented with the session resume surface and token/cookie flow already in place

4. **Order-only ACS recommendation mismatch**
- a valid recommendation subset no longer fails the whole session when `recommendedClaimIds` arrives out of `rankedClaimIds` order
- the recommendation validator now normalizes that subset back into ranked order instead of failing the session

5. **Preparation-page wording and concurrent log attribution**
- preparation copy now explains that recommendation generation follows Stage 1 before the selection screen appears
- major draft/job log lines now carry scoped prefixes so concurrent preparation and full-analysis activity are easier to distinguish

These areas still need ordinary regression monitoring, but they are not the highest remaining problem.

## 5. Recommended Fix Plan

## Phase 1 — Reduce Stage 1 time-to-selection under current semantics

**Priority:** highest

### Problem addressed

Selection becomes available too late on heavy article/PDF inputs.

### Root cause addressed

Stage 1 remains the dominant latency source.

### Plan

1. Keep the current evidence-seeded Stage 1 semantics unchanged.
2. Continue same-semantics waste reduction only:
- duplicate retrieval/retry waste removal
- exact same-job duplicate work elimination where it does not alter semantics
3. Keep cross-session prepared-snapshot reuse **deferred for live behavior** until an exact, auditable reuse contract is approved.
4. It is acceptable to land provenance-only groundwork for a future reuse decision as long as it does not change runtime behavior.
5. Keep ACS recommendation on for now because it is not the main delay driver and still supports idle auto-continue with a meaningful preselected set.
6. Instrument and compare:
- `stage1Ms`
- `recommendationMs`
- total prep time
- time to `AWAITING_CLAIM_SELECTION` or auto-continue

### Guardrails

- no text-first redesign of AC generation
- no weakening of evidence-seeded Pass 2
- no provisional selection before the final Stage 1 candidate set exists
- do not mix full-analysis optimizations that happen after selection readiness, such as later source-reliability work, into this phase
- do not enable cross-session prepared reuse on public URLs until prompt/config/commit/input identity and final semantic-safety rules are formally approved

### Acceptance criteria

- median time-to-selection improves on the same monitored input families
- no semantic drift in Stage 1 output contract

## Phase 2 — Investigate Stage 1 broad-input quality failures using concrete failing packets

**Priority:** high, but only after latency work is underway or when a concrete failing packet is in hand

### Problem addressed

Some broad, multi-branch inputs still show coverage gaps, bundled consequences, or contract-preservation risk before ACS becomes relevant.

### Root cause addressed

- under-preservation of multi-branch thesis structure
- over-bundled claims surviving contract validation attempts
- insufficiently explicit structural recovery when broad article/page inputs need branch-level preservation

### Plan

1. Add a focused failure-review path for Stage 1 quality regressions and contract-preservation rejections.
2. Capture and compare:
- original input
- Pass 1 rough claims
- salience anchors
- Pass 2 atomic claims
- contract-validation summary
- final failing Stage 1 snapshot
3. Identify the exact missing branch or bundled-claim pattern before changing prompt or code.
4. Fix the Stage 1 extraction/contract-validation path so broad multi-branch pages preserve the full proposition contract more reliably.

### Guardrails

- do not weaken contract validation just to reduce failures
- do not remove preliminary evidence from Stage 1 to make the path faster
- do not introduce deterministic semantics logic to patch branch detection

### Acceptance criteria

- concrete failing broad-input packets no longer fail due to omitted thesis branches that were present in the input
- Stage 1 can still reject genuinely bad candidate sets, but the rejection rate for previously observed broad-input failures drops for the right reason: better preservation, not looser validation

## Phase 3 — Improve observability for live monitoring

**Priority:** medium-high

### Problem addressed

Draft and final-job logs are too easy to confuse.

### Root cause addressed

Log lines are not consistently attributable when multiple sessions/jobs run concurrently.

### Plan

1. Ensure every major analyzer log line carries either:
- draft id, or
- job id
2. Keep session preparation and full-job progress reporting visually distinct.
3. Narrow the work to attribution and operator clarity:
- make it obvious which lines belong to draft preparation versus full analysis
- preserve the already-landed session-mode/status messaging instead of reopening that UI work

### Acceptance criteria

- an operator can read the log tail and identify which session/job each major event belongs to
- draft and final-job progress are not easily confused during concurrent runs

### Current implementation state

- scoped draft/job log prefixes are already implemented
- the remaining work here is follow-up monitoring and extension only if uncovered gaps remain

## Phase 4 — Monitor but do not prioritize extension-driven hydration noise

**Priority:** low

### Problem addressed

Local monitoring noise on `/analyze`

### Plan

1. Reproduce only if it appears without extensions.
2. If it remains extension-only, document and ignore.

### Acceptance criteria

- no engineering effort spent here unless the issue reproduces in a clean browser profile

## 6. Recommendations Not Chosen

These are intentionally not the current recommendation:

### 6.1 Do not redesign Stage 1 into text-first AC extraction

Reason:

- current preliminary evidence influences AC generation
- changing that would be a semantic redesign, not just a UX fix

### 6.2 Do not disable the ACS recommendation call right now

Reason:

- it is not the main time driver
- it still supports automatic continuation and idle auto-continue with a meaningful preselected set

### 6.3 Do not treat browser-extension hydration mismatch as a core root cause

Reason:

- current evidence points to extension injection noise, not pipeline behavior

## 7. Recommendation Order

The recommended next implementation order is:

1. continue Stage 1 same-semantics latency work
2. targeted Stage 1 broad-input quality investigation on concrete failing packets
3. monitor the newly landed observability and preparation-copy improvements, then extend only if they still leave real ambiguity
4. only then revisit lower-priority UX polish and dev-noise cleanup

## 9. Consolidated 2026-04-24 Outcome

After the follow-up debate/review, the three concrete threads were consolidated as follows:

1. **Cross-session prepared snapshot reuse**
- not approved for live behavior yet
- provenance-only groundwork is acceptable and landed
- exact runtime reuse remains deferred

2. **Per-draft/per-job log attribution**
- approved and implemented

3. **Preparation-page wording**
- approved and implemented

This means the strongest remaining open problem is still the same one identified earlier:

- **time-to-selection on heavy inputs is dominated by Stage 1 under current semantics**

## 8. Review Request

The main question for review is:

- is the diagnosis correctly separating:
  - the already-fixed ACS mode bug
  - the still-open Stage 1 quality problem
  - the still-open Stage 1 latency problem
  - the observability problem

The main thing a reviewer should challenge is whether the proposed priority order matches the actual evidence from the monitored sessions and logs.
