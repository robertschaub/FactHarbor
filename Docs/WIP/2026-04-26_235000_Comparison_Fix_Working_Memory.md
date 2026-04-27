# 2026-04-26 Working Memory — 235000 Comparison Fix

Purpose: durable thread memory for the paused FactHarbor `235000 Flüchtlinge...` regression work. This is a live WIP note, not a completion handoff.

## Current User Directives

- Pause current live-fix loop until the Opus Agent review is provided in the next prompt.
- Use memory extension/file memory to preserve context.
- Use the new repo-local `/debt-guard` workflow for any bugfix work.
- Debate and address the incoming Opus review, then debate the solution.
- Commit meaningful fixes.
- Resume current work after review fixes are complete.
- Fix all issues seen on the way.
- Live test/run budget after review work: 12 jobs.
- Restart services when needed.
- Do not pull, push, or use destructive operations.
- Work on `main`.

## Approved Live Input

Use only the Captain-defined exact input for this case:

`235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

## Branch And Git State At Pause

- Branch: `main`
- Recent committed fixes:
  - `b905504b fix(prompt): keep comparability limits non-directional`
  - `ee0ead8f fix(analyzer): remap comparison evidence during applicability`
  - `c3ff119e fix(analyzer): decouple claim remap from applicability filter`
- Current uncommitted files related to active fix:
  - `apps/web/prompts/claimboundary.prompt.md`
  - `apps/web/src/lib/analyzer/research-extraction-stage.ts`
  - `apps/web/src/lib/analyzer/research-orchestrator.ts`
  - `apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts`
  - `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- Pre-existing unrelated dirty/untracked files to avoid staging/reverting unless explicitly needed:
  - `Docs/AGENTS/index/stage-manifest.json`
  - `Docs/AGENTS/index/stage-map.json`
  - `Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_ACS_Check_Worthiness_Unification_Assessment.md`
  - `Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_Admin_Preparation_Sessions_Control_Plan.md`
  - `Docs/AGENTS/Handoffs/2026-04-25_Lead_Developer_ACS_Check_Worthiness_Unification_Review_Disposition.md`
  - `Docs/WIP/2026-04-24_Admin_Preparation_Sessions_Control_Plan.md`
  - `Docs/WIP/2026-04-24_Atomic_Claim_ACS_Check_Worthiness_Unification_Assessment.md`

## What Happened Before Pause

1. Commit `c3ff119e` was made and services were restarted.
2. Live job `b54deb6813644f9487dc63f7f16a5e92` was submitted after that commit.
3. Job URL: `http://localhost:3000/jobs/b54deb6813644f9487dc63f7f16a5e92`
4. Result:
   - `SUCCEEDED`
   - Overall verdict `LEANING-TRUE`
   - Truth `62`
   - Confidence `65`
   - Runtime about 12 minutes
   - No top-level issue code
5. Quality gap remained:
   - SEM evidence `Total Personen aus dem Asylbereich (inkl. RU) am Ende 2025: 235.057 Personen` was found.
   - It was still mapped only to `AC_01`, not to the comparison claim `AC_02`.
   - AC_02 was no longer `UNVERIFIED`, but its claim-local evidence still lacked the current-side SEM citation.

Failed-attempt recovery classification:

- `b905504b`: keep. It removed the prior direction/prompt failure and eliminated recurring `UNVERIFIED`.
- `ee0ead8f` + `c3ff119e`: keep-but-insufficient. The applicability mapping pass runs and logs `Claim mapping extensions: 2`, but the final persisted evidence still lacks multi-claim mappings for the decisive SEM current-side evidence.

## Current Uncommitted Hypothesis And Patch

More precise root cause found:

- `EXTRACT_EVIDENCE` already asks the LLM for `relevantClaimIds`, but runtime only passed the target claim to the prompt and then forcibly replaced every extracted item with `relevantClaimIds: [targetClaim.id]`.
- This erased valid companion mappings at extraction time.
- The later `APPLICABILITY_ASSESSMENT` pass is too compressed and too late to reliably reconstruct all comparison-side mappings.

Current uncommitted patch:

- Passes the full claim set into `EXTRACT_EVIDENCE`.
- Keeps extraction focused on the target claim and source content.
- Always preserves `targetClaim.id`.
- Preserves additional LLM-provided companion IDs only when they are valid IDs from the known claim set.
- Updates `runResearchIteration()` and supplementary English lane to pass `state.understanding?.atomicClaims ?? [targetClaim]`.
- Adds focused unit coverage for preserving valid companion IDs.

Important reviewer finding already received from reviewer agent Russell:

- P1: Multi-claim mapping can reuse the wrong `claimDirection`.
- Reason: `EvidenceItem` has a single `claimDirection` shared across all `relevantClaimIds`. A source value can support the side-specific claim while contradicting or only contextualizing a companion comparison claim. Mapping it to multiple claims without direction validity can create false support/contradiction citations.
- Required adjustment: prompt/contract must require companion IDs only when the single direction is valid for all mapped claims, or require split evidence items when directions differ.

This finding must be addressed after the incoming Opus review is provided.

## Debt-Guard State

Repo-local skill loaded from `.claude/skills/debt-guard/SKILL.md`.

Use Full Path for the next edit because this is:

- failed-attempt recovery,
- analysis behavior,
- prompt + code contract behavior,
- live-job verified quality issue.

Required next debt-guard framing:

- Symptom: live job `b54deb6813644f9487dc63f7f16a5e92` still lacks current-side SEM evidence on AC_02.
- Verifier: job inspection after `c3ff119e`; focused tests/build/safe tests for current uncommitted patch.
- Existing mechanisms: Stage 2 extraction `relevantClaimIds`, Stage 2 applicability remap, verdict claim-local evidence scoping.
- Likely classification: incomplete-existing-mechanism, not missing capability.
- Preferred action currently likely: amend current extraction/prompt contract to prevent directional contamination.
- Avoid additive workaround stacking.

## Verification Already Run For Current Uncommitted Patch

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer/research-extraction-stage.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `npm -w apps/web run build`
- `npm test` passed on rerun.
- `git diff --check -- apps/web/src/lib/analyzer/research-extraction-stage.ts apps/web/src/lib/analyzer/research-orchestrator.ts apps/web/prompts/claimboundary.prompt.md apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

Note:

- First full `npm test` attempt failed due to a transient `runner-concurrency-split` timeout and analyzer integration issues from the initial optional-chain bug. After fixing the optional-chain issue, focused tests, build, and full `npm test` passed.
- Build reseeded the prompt and changed the active `claimboundary` prompt hash to `ee749c036370...`.

## Browser / UI

- In-app browser current user-visible page: `http://localhost:3000/jobs/4070a74a47b04fc3944d785dd68a5a56`.
- Browser-control MCP is still not exposed in this Codex context; provide URLs for the user to view unless tools become available.

## Next Steps After Incoming Opus Review

1. Read the Opus review from the next user prompt.
2. Run `/debt-guard` Full Path inventory and options before editing.
3. Debate review findings and current Russell P1 direction-contamination concern.
4. Apply the smallest amendment that fixes review findings without topic-specific logic.
5. Add/update tests for direction-safe multi-claim mapping.
6. Run focused tests, build, `npm test`.
7. Commit meaningful slice.
8. Restart services/reseed if needed.
9. Submit monitored live jobs from the 12-job budget, likely 1-2 at a time.
10. Inspect each job for:
    - no `UNVERIFIED`,
    - no `verdict_integrity_failure` or damaged report,
    - SEM current-side evidence mapped/cited for AC_02 when directionally valid,
    - AC_02 cites both current-side and historical/reference-side material,
    - warnings are proportional,
    - no unjustified queue/runtime delay.
