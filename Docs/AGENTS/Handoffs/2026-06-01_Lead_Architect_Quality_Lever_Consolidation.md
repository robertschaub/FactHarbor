---
roles: [Lead Architect]
topics: [applicability, fail_open, evidence_drift, report_damaged, checkworthy_unverified, fetch_failure]
files_touched:
  - apps/web/src/lib/analyzer/research-extraction-stage.ts
  - apps/web/src/lib/analyzer/claimboundary-pipeline.ts
  - apps/web/src/lib/analyzer/research-orchestrator.ts
  - apps/web/test/unit/lib/analyzer/research-extraction-stage.test.ts
  - apps/web/test/unit/lib/analyzer/research-orchestrator.test.ts
  - apps/web/test/integration/claim-auto-selection-pipeline.test.ts
  - scripts/restart-clean.ps1
  - .claude/settings.json
  - Docs/AGENTS/Captain_Quality_Expectations.md
  - Docs/WIP/2026-06-01_Review_Codex_2395f494_Direct_Sufficiency.md
  - scripts/diag/checkworthy-unverified-census.cjs
  - scripts/diag/fetch-failure-drift-sizing.cjs
---

# Lead Architect — Quality-Lever Consolidation (2026-06-01)

**Tier:** Significant. **Bottom line:** one real bug fixed; three candidate quality levers stress-tested and found mostly inherent/correct/rare; quick levers exhausted. Pipeline is in better shape than symptom-hunting suggested.

## Task
Continue quality work against the updated 2026-05-31 bar: root-cause where genuinely fixable, fix the one real bug, and consolidate the findings so the next session does not re-hunt levers that turn out to be inherent or correct-by-design.

## Done
**1. SHIPPED FIX — applicability classifier fails OPEN on infra failure (was fail-closed).** Codex `2395f494` marked evidence `applicabilityAssessed:true` even when the classifier could not RUN (LLM error / prompt-missing), making every item non-direct **job-wide, not geo-gated** → hard citation-integrity gate (`hasStructuralCitationIntegrity`, verdict-stage.ts:1923) + D5 require-direct both fire → mass UNVERIFIED under classifier-failure/load. Pre-`2395f494` that path was fail-open.
- `research-extraction-stage.ts:525` & `:636` (the two *total-failure* exits) now return items UNMARKED (legacy "missing = direct"); the per-item-unclassified case at `:587` stays strict.
- `claimboundary-pipeline.ts:~1227` uses new helper `resolveDirectApplicabilityRequirement(base, items)` (research-orchestrator.ts:~1921) → drops the direct-requirement when no surviving item is `applicabilityAssessed` (classifier didn't run).
- Tests: 2 degraded tests flipped to assert fail-open; 5 new helper unit tests; integration mock updated. Commits **85f129a9** + **29bcb33b**. Full suite **1908 pass**, build clean.

**2. INFRA FIXES.** `restart-clean.ps1` no longer re-exports `apps/web/.env.local` into the web shell prefix (next dev loads it from cwd; the re-export could corrupt/precede keys) — **8c2799fb**. `.claude/settings.json` DB hook scoped to writes-only so read-only `sqlite3` works (the old `/sqlite3.*factharbor.db/` rule blocked the skills' own read path) — **f1afdeef**.

**3. BAR CORRECTIONS — `Captain_Quality_Expectations.md`.** Added two Generic Expectations: **no quality-gate error** (states the PHASE-BLOCKER Q-HF1 floor in the intent file) and **checkworthy-AC UNVERIFIED = bad smell unless Captain confirms**, both with the real measured baselines below. Retracted an unverifiable UNVERIFIED-census memory (it cited a file — `Docs/WIP/2026-05-27_UNVERIFIED_Root_Cause_Plan_v2.md` — that never existed).

**4. INDEPENDENT REVIEW of Codex `2395f494`** → `Docs/WIP/2026-06-01_Review_Codex_2395f494_Direct_Sufficiency.md` (3 reviewers + my verification). Sound + **exonerated on the bolsonaro result** (the change can only demote, never promote; the AC_03 fail is the pre-existing §99 issue; same-input bolsonaro swings UNVERIFIED↔LT-71 on identical code). The one real defect it found — the degraded-path inversion — is now fixed (item 1).

**5. POPULATION CENSUS + REFUTED LEVERS (all read-only `scripts/diag/`).** n=1551 SUCCEEDED: **8.6% hard-failure** (report_damaged 107), **24.2% checkworthy-claim UNVERIFIED** (930/3836). Lever findings:
- **report_damaged** = 94% Stage-1 contract gate working **correctly** (refuses to publish modifier-dropped reports — esp. "rechtskräftig"). Only ~17% (`validator_unavailable`, ~1.2% of jobs) is a marginal slice, and the carry-forward (`canCarryForwardValidatedContractApproval`, claim-extraction-stage.ts:3615) already handles the safe cases. → document.
- **§99 partisan-contradiction** (a convicted party's own appeal allegations counted as direct probative contradiction): **rare** — 0.5% of contradicting evidence, **9 true-side-family cases across all history**, and inconsistent (verdict usually resists). → document, do not build a broad verdict-direction lever.
- **fetch-reliability / evidence-drift = REFUTED.** Mean fetch-fail rate 37%, but **72% is inherent HTTP 403 site-blocking** (paywall/anti-bot: sciencedirect, NYT…); fixable rate-limit/429 is **0.4%**. And fetch-failure does NOT correlate with worse quality — the 25–50%-fail bucket is best (74 evidence / 11% UNVERIFIED); the 0%-fail bucket is worst (20 evidence / 39% UNVERIFIED = under-researched/aborted jobs). The pipeline over-fetches and tolerates 403-blocking.

**6. SHIPPED (later 2026-06-01) — Codex-review item #2 + S4.**
- **#2 per-claim direct-applicability gate** (`4c140ca4`): `directApplicabilityRequiredForD5` was computed job-wide from merged geographies but applied per-claim, so a non-geo claim in a mixed-jurisdiction job could spuriously fail to `insufficient_direct_evidence`. New pure helper `claimRequiresDirectApplicability(filterEnabled, claimEvidenceCount, claimRelevantGeographies, items)` (research-orchestrator.ts) decides it per-claim via each claim's own `getClaimRelevantGeographies(...)`; the classifier-ran (degraded fail-open) check stays job-wide via `resolveDirectApplicabilityRequirement`. Sized first: the guarded path is rare today (7/1565 jobs) but is a *new* feature (`2395f494`) just being exercised — fixed before wider use. 5 new matrix unit tests; build clean; full suite **1916 pass**.
- **S4 analyticalDimension** (`f439f7da`): the field was dropped by the evidence mappings (Stage-2, preliminary, seed) so `scopeFingerprint()`'s `d:` axis was permanently empty; propagated end-to-end so clustering can split mega-groups along the analytical dimension. `scopeFingerprint` test added.
- **Prompt track owned by the concurrent audit agent:** F01–F09 generic-hygiene/neutrality/schema fixes APPLIED in `bcae3239` (Captain-approved). Still open there: **S2+S6** (tunables→UCM) + **S1/S3/S5** — a config pass, *not* mine (avoid colliding).

## Decisions
- **Fail-OPEN on infra failure, not closed.** Disambiguate "classifier ran but didn't classify an item" (content signal → stay strict) from "classifier couldn't run" (infra → legacy direct). Contract/citation gates should bite only when the LLM actually produced a result. (Did NOT route through `factualBasis:opinion` — independence/source, not opinion, is the right axis; and that was for the §99 lever, which we chose not to build.)
- **Size before building.** Every candidate lever was census-sized first; report_damaged, §99, and fetch-reliability all turned out rare/inherent/correct → documented rather than built. This avoided 3 disproportionate builds.
- **No deterministic semantic adjudication; no result caching during alpha** (per-run variance is intentionally wanted) — these bounded the fetch/drift options.

## Warnings
- **Codex `2395f494` review item #3** still lacks a fully-unmocked end-to-end "degraded classifier → no job-wide UNVERIFIED" pipeline test. **Decision: deferred as low-ROI** — the only no-LLM full-pipeline test (`claim-auto-selection`) mocks sufficiency, so a true e2e degraded test needs real LLM ($1.50–3/run, excluded from `npm test`) or a heavy bespoke harness; meanwhile the per-claim gate matrix *and* the degraded fail-open are unit-tested and the wiring is type-checked. Same logic the advisor endorsed for #2: unit-test the extracted helper, don't build the heavy harness. (Item #2 is DONE — see Done #6.)
- **`restart-clean.ps1` fix is statically verified only** — the live `restart-clean.ps1 → /api/health (ANTHROPIC_API_KEY_present:true) → /v1/analyze` end-to-end check was never run (needs a Captain-provided input; and the agent shell must clear harness `ANTHROPIC_*` vars first or it false-negatives).
- **bolsonaro-en is variance-driven**, not deterministically broken — do NOT attribute a single job's verdict to a code change (same input → UNVERIFIED 44 … LEANING-TRUE 71 on identical commit).
- The retracted UNVERIFIED-census memory: the real numbers are in `Captain_Quality_Expectations.md` + the census scripts; the old n=600/n=500 "F1 44.5% / F4 36.1%" figures were unverifiable.

## Learnings
- **Most "quality bugs" here are inherent, intentional (alpha variance), or correct-fail-safe — not fixable defects.** Three levers stress-tested, all documented-not-built. The one clean win was a genuine fail-closed regression. Appended to Role_Learnings.md.
- **`sources[]` retains only `fetchSuccess:true`** — the true fetch-fail rate lives in the `source_fetch_failure` warning `details` (`attempted`/`failed`/`errorByType`), not in `sources[]`.
- **Adding an export to a module that a test `vi.mock`s with a full export list breaks that test** (the integration test crashed until the new export was added to its mock) — and `next build`'s tsc step catches missing imports that `vitest` transpile does not.

## For next agent
**Pause quick-lever hunting — it has diminishing returns.** The 7 read-only diag tools in `scripts/diag/` (checkworthy-unverified-census/-drill, report-damaged-drill, contract-abort-drill, partisan-contradiction-census, bolsonaro-ac03-evidence, fetch-failure-drift-sizing) are reusable for re-measuring after any change. If further quality investment is wanted, it is **hard structural work** (deliberate cost/benefit calls): (a) a better fetcher to recover *non-paywall* 403s; (b) verdict robustness to evidence-pool drift; (c) the under-research tail (largely the report_damaged early-aborts). **Of these, (b) is the only one that targets the session's central documented finding — same-input verdict variance is evidence-pool-drift-dominated (Jaccard 0.10–0.29) — and is therefore the highest-value next investment, but it is a project (design → fix), not a meanwhile-fill.** Loose ends: Codex-review item #2 is DONE (`4c140ca4`); item #3 (e2e degraded test) deferred as low-ROI (see Warnings); run the `restart-clean.ps1` live verification once a `/v1/analyze` input is provided. The tunables-to-UCM config pass (S2/S6) belongs to the prompt/config track agent.
