# Agent Outputs Log -- Active Index

This file is a **triage-weight index**, not a full log. Each entry is a 3-line summary
with a link to the full handoff file in `Docs/AGENTS/Handoffs/`.

Full protocol: `Docs/AGENTS/Policies/Handoff_Protocol.md`.
Archived entries: `Docs/ARCHIVE/Agent_Outputs_YYYY-MM.md` + `Docs/ARCHIVE/Handoffs/YYYY-MM/`.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Bundesrat Reference Dossier Draft -- [Standard] [open-items: yes]
**For next agent:** Started Phase 0b dossier authoring by adding `Docs/AGENTS/Reference_Dossiers/bundesrat-rechtskraftig.v0.1.json`, a validator-clean full draft for the Captain input `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`. The draft uses two admissible frames: strict final binding/entry-into-force and limited provisional/procedural legal effect; separates signature, Parliament, people/referendum, and final-force truth conditions; cites official Swiss government/FDFA/BK sources; and keeps status `draft`.
**Warnings:** This is not source-grounded/adjudicated gold yet. It still needs independent curator/adjudicator/reviewer passes before any dossier-backed C1/C3 metric can rank builds. Local/archive source snapshots are not captured yet; `archiveUrl`, `localPath`, and `localHash` remain null in the draft.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Report Quality Phase 1 CLI Sign-Off -- [Standard] [open-items: yes]
**For next agent:** Completed the Phase 1 zero-spend scorer conformance sweep and updated `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md` to mark `scripts/measure-report-quality.ts` signed off for CLI use. Verified floors, T3 colour, efficiency join, bootstrap CIs, stability Jaccard, matrix-diff, focused `--family`/`--compare` paths, duplicate-compare rejection, and full stored-report dry-run: 514 scored reports, 0 parse failures, no live jobs/LLM calls; headline kept `plastic-en` excluded, coarse `llmCalls` covered all 392 headline vectors, rich metrics joined for 388.
**Warnings:** This signs off the zero-spend CLI scorer only, not UI integration and not dossier-backed C1/C3 wiring. Remaining critical path is Phase 0b dossier authoring (`bundesrat-rechtskraftig` full, `plastic-en` partial, one Bolsonaro partial) plus manual alignment gate evidence.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Reference Dossier Validator Review Fixes -- [Standard] [open-items: yes]
**For next agent:** Addressed the lead-developer review blockers for the report-quality implementation plan and AtomicClaim reference-data model. Restatused Phase 0 as done and Phase 1 scorer as built pending sign-off at that point, corrected the plastic family join slug to `plastic-en`, wired `scripts/validate-reference-dossiers.cjs` to the JSON Schema via AJV, added benchmark-slug, multi-frame commit-rationale, verdict-label/truth-band, source/reference, current-snapshot, and band-order cross-field checks, tightened schema verdict labels and band domains, added the aggregation-faithfulness contestation-coupling note, and removed the unused scorer `contestationWeights` config.
**Warnings:** Superseded by the 2026-06-06 Phase 1 CLI sign-off entry above. No reference dossiers were authored and no live jobs, expensive tests, or LLM calls were run in this validator-fix pass.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Reference Data Contract Closure -- [Standard] [open-items: no]
**For next agent:** Tightened the AtomicClaim reference-data model and implementation plan so the v0.1 data/model contract is closed, not left for implementers to define. Added needs/pains coverage matrix, `determinabilityStatus`, closed manual-alignment rubric, score artifact contract, C1/C3 judge output contracts, explicit Phase 0b execution boundary, and plan language that treats deferred items as outside the MVP/data-model contract.
**Warnings:** Remaining work is execution against the contract: author dossiers, validate them, run manual alignment, instantiate prompts from the fixed contracts, and collect gate evidence. No live jobs or LLM calls were run.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | AtomicClaim Reference Data Review Fixes -- [Standard] [open-items: yes]
**For next agent:** Addressed two independent reviews of the AtomicClaim reference-data design. Closed the non-existent clarification taxonomy by switching v0.1 to real `CBClaimUnderstanding.inputClassification`; made C1 atomicity Stage-1-only; added determinability criteria/disagreement handling, current-snapshot dossier-version/run-window pinning, C3 evidence-equivalence judge contract, Phase 0b routing/gates, and the structural dossier schema/validator (`Docs/AGENTS/Reference_Dossiers/reference-dossier.schema.json`, `scripts/validate-reference-dossiers.cjs`, `npm run validate:reference-dossiers`).
**Warnings:** No reference dossiers or prompt files have been authored yet. The validator is structural only; semantic alignment remains manual/LLM-adjudicated and no live jobs or LLM calls were run.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | AtomicClaim Reference Data Consolidation -- [Standard] [open-items: yes]
**For next agent:** Consolidated the reference-data design into `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md` and `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Consolidated_Decision.md`. Settled model: dossiers cover two first-class axes — interpretation-frame contract for ambiguous terms (`pointless`, `rechtskräftig`) and frame-scoped atomicity/separability for clearly determinable truth conditions. Updated `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md` with explicit Phase 0b tasks/gates.
**Warnings:** Dossier-backed C1/C3 remains diagnostic only until Phase 0b proves per-axis reliability: manual-vs-judge agreement >=85% on each axis, kappa >=0.70 where sample supports it, and no LLM judge spend without Captain-approved cap.

---
### 2026-06-05 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Recent Commit Regression -- [Standard] [open-items: no]
**For next agent:** Scanned the automation window since `2026-06-04T06:00:44.114Z`; `git log --since="2026-06-04T06:00:44Z"` returned no commits, with latest local commit still `a1b43c1354bc9475692d273d795c2089580c639b` (`feat(diag): extend charts to claimboundary origin (9cdc8889, Feb 17) + GitCommitHash fallback`) from 2026-06-03. Reviewed current WIP diagnostic diffs separately from commit evidence. The only plausible concern was the new `qbd-d3ad26ca` special source in `scripts/diag/quality-timeseries.cjs`; local DB evidence showed 8 succeeded result jobs and all are `PipelineVariant=claimboundary` / `ResultJson.meta.pipeline=claimboundary`, so no contamination bug was confirmed. Verification passed: `node --check` for changed/new Node diag scripts, `python -m py_compile scripts/diag/quality-chart-branch.py`, and runtime runs for `benchmark-band-analysis-equiv.cjs`, `inputs-used.cjs`, `quality-timeseries.cjs`, `quality-branch-membership.cjs`, and `quality-chart-branch.py build/submission`. No code fix made.
**Warnings:** `quality-timeseries.cjs` completed but took about 263s on this machine, so use a long timeout for future checks. Worktree had pre-existing/user WIP docs, indexes, diagnostic edits, and generated outputs; they were preserved.

---
### 2026-06-04 | Lead Developer + LLM Expert | Codex (GPT-5) | Independent Report-Quality Concept Review -- [Standard] [open-items: yes]
**For next agent:** Independent review says the report-quality concept is directionally sound but **not Captain-ready as-is**. Must-fix before section 9 decisions: self-grading circularity needs an independence taxonomy; C1/C3 cheap partial references should be mandatory, not optional; N=5 is only pilot/gross-regression power; Pareto needs a pre-registered default rule; era-schema drift needs versioned scoring adapters; and C4 aggregation faithfulness is mechanically wrong against active `aggregation-stage.ts` (uses triangulation/derivative/anchor/probative factors and does not visibly consume `contestationWeights`). Also resolve confidence-band noise inconsistency (`Q-BE3` vs `benchmark-band-*.cjs`) before reusing scripts.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Developer_LLM_Expert_Report_Quality_Concept_Review.md

---
### 2026-06-04 | Lead Architect | Claude Code (Opus 4.8, 1M) | Report-Quality Measurement, Rating & Build-Comparison Concept -- [Significant] [open-items: yes]
**For next agent:** Plan (no code) for measuring/rating report quality and comparing builds, decomposed into isolatable parts. **START → `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`** (clean consolidated plan; converged, both re-reviewers PASS, implementation-ready). Full rationale + v1→v7 review audit trail: `..._Report_Quality_Measurement_And_Build_Comparison_Concept.md`. Reuses existing Q-codes as the decomposition (`Q-S1.*`=claim extraction C1, `Q-EV*`=evidence C2, `Q-V*`=per-claim verdict C3, `Q-BE*`=overall-verdict gold bands C4, `Q-ST*`=stability, `Q-HF1`=integrity gate); adds what's missing = a rating model + build-comparison + reference model. Spine: **reference availability falls with pipeline depth** (gold only at C4 + coarse floors; C1–C3 = intrinsic+judge+stability) and **run-to-run drift is the primary isolation confound**. Comparison is **pairwise A/B** (repurpose `/report-review` debate panel), not score-subtract; **vector primary, scalar gates never ranks**; calibration is a first-class build-layer dimension. **Phase 1 = zero spend** rollup over stored `ResultJson` (reuse `best-commit-phase1.cjs`, `checkworthy-unverified-census.cjs`, `benchmark-band-*.cjs`). This is the **measurement layer** for the era-comparison study's Phase 3. Cross-build per-stage causal attribution needs the deferred claim-injection harness (era conditions ③/④) — do not over-claim it. **5 §9 decisions recorded, 2 deferred** (③ cross-provider judge, ⑥ contestation-weight drift); plan passed 2 more independent reviews (GO); next action = greenlight Phase 0.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Architect_Report_Quality_Measurement_Concept.md

---
### 2026-06-04 | Lead Architect | Claude Code (Opus 4.8, 1M) | Multi-Variant Pipeline Architecture + Spec + Plan -- [Significant] [open-items: yes]
**⚠ DIRECTION CHANGED (2026-06-04, end of session):** after a Gemini scoped review + advisor cross-check, **Captain chose a worktree-native era-comparison STUDY** over the in-tree build. **Start here → `Docs/WIP/2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md`** (run the 3 historical tags + HEAD natively via `git worktree`; first task = a runnability spike on `2before_bol_fix`). The in-tree multi-variant docs below are now a **DEFERRED, decoupled capability** (banner added to each) — revive only if forward variant testing is wanted. UCM-simplification can proceed independently. Reopened two locked decisions (in-tree registry + Stage-1 pin) for this path.
**For next agent (in-tree capability, deferred):** Proposal only (no code). Three WIP docs design: in-tree **variant registry** (declarative `configs/variants.json` read by both API + web dispatcher + code binding `analyzer/variants/registry.ts`, stable entry `(ctx)=>Promise<PipelineRunResult>`) reviving the dormant `pipelineVariant` seam; **file-authoritative UCM** (base `configs/*.default.json` + sparse `configs/variants/<id>.override.json`, deep-merge+Zod) — **removes** config DB/versioning/activation/editing UI, keeps read-only inspector; **provenance** — each report embeds `meta.provenance` + a **pipeline fingerprint** (variantId+commit+prompt hashes+effective-config hashes+models), config embedded / prompt by-ref. Parallel = per-job select + matrix run. **Prompt sharing settled by FULL /debate (verdict MODIFY): Phase 1 = wholesale-per-variant (Option A); section base+override (Option B) is conditional Phase 3b, gated on a pinned variant-population table + a section-presence validator (A = B-with-no-base, so no rework).** Start: Plan Phase 0; replace hardcoded allowlist `["claimboundary"]` (~AnalyzeController.cs:57) with `listActiveVariantIds()`; wrap `runClaimBoundaryAnalysis` (claimboundary-pipeline.ts:632). Verified safe-to-delete: `getConfigSnapshot` only feeds the read-only admin quality-config route.
→ Docs/AGENTS/Handoffs/2026-06-04_Lead_Architect_Multi_Variant_Pipeline_Architecture.md

---
### 2026-06-02 | Senior Developer | Codex (GPT-5) | Daily Bug Scan Config Drift Fix -- [Standard] [open-items: no]
**For next agent:** Scanned commits since `2026-06-01T06:00:45Z` through HEAD `0b38dd8b56fad6eb0a6e5e5576bf70dc6942adff`. Confirmed one concrete regression from `af02692385734b9dc5cabf125a40a3ffb9bb785c`: `sourceMaxResponseBytes` was added to `DEFAULT_PIPELINE_CONFIG` / schema but omitted from `apps/web/configs/pipeline.default.json`, causing `test/unit/lib/config-drift.test.ts` to fail with `Missing keys in JSON: sourceMaxResponseBytes`. Fixed by adding `"sourceMaxResponseBytes": 31457280` to the file-backed pipeline defaults. Verification passed: config drift test, retrieval unit test, targeted analyzer/telemetry/prompt tests (184), new diagnostic scripts `node --check`, and `npm -w apps/web run build`.
**Warnings:** Build still reports the known Turbopack NFT trace warning via `next.config.js` -> `source-reliability-cache.ts`. Worktree had pre-existing unrelated dirty docs/index/WIP files and untracked docs; they were preserved.

---
### 2026-06-01 | Lead Architect | Claude Code (Opus 4.8, 1M) | Quality-Lever Consolidation -- [Significant] [open-items: yes]
**For next agent:** Pause quick-lever hunting. SHIPPED: applicability classifier now fails OPEN on infra failure (was fail-closed → job-wide UNVERIFIED) — `research-extraction-stage.ts:525/636` return unmarked; `claimboundary-pipeline.ts` uses `resolveDirectApplicabilityRequirement` (research-orchestrator.ts). Commits 85f129a9+29bcb33b; suite 1908 pass. Infra: restart-clean.ps1 env-prefix fix (8c2799fb); DB hook writes-only so read-only sqlite3 works (f1afdeef). DOCUMENTED-NOT-BUILT (rare/inherent/correct): report_damaged (94% Stage-1 gate working correctly), §99 partisan-contradiction (9 true-side cases), fetch-reliability/evidence-drift REFUTED (72% inherent HTTP 403, 0.4% fixable). Census: 8.6% hard-fail, 24.2% checkworthy-claim UNVERIFIED. 7 read-only diag tools in `scripts/diag/`. Open: Codex-review #2 (per-claim direct-applicability gate) + #3 (e2e degraded pipeline test); restart-clean live verify needs a `/v1/analyze` input. Remaining quality = hard structural (fetcher for non-paywall 403s; verdict-robustness-to-drift).
→ Docs/AGENTS/Handoffs/2026-06-01_Lead_Architect_Quality_Lever_Consolidation.md

---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
Z`, while the current `claimboundary.prompt.md` file hashes to `db42b6c7...` after later prompt commits. Reseed/build is required before local runs will use the new prompt text.
→ Docs/AGENTS/Handoffs/2026-04-16_Unassigned_Daily_Bug_Scan_Prompt_Propagation_Drift.md

---
---
---
---
---
---
---
---
---
---
---
---
---
ZZ, press releases, generic SEM landing pages, and older PDFs instead of the direct annual-total source.
→ Docs/AGENTS/Handoffs/2026-04-15_LLM_Expert_Asylum_235000_Evidence_Gap_Investigation.md

---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---
---
---

---

---

---

---

---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
Zweiten Weltkrieges.` and compare against jobs `c9b04f5b74d645dea5f24459869a22ad` and `d1045764077f4012a4a4aa9463fc106b`.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_Broad_Current_Total_Comparison_Prompt_Fix.md

---
---
---
---
---
---
---
---
---
---
---
---
---
---
ZHAW_Meeting_Prep.md](/c:/DEV/FactHarbor/Docs/Meetings/2026-04-21_ZHAW_Meeting_Prep.md) is the current briefing version. It was rewritten for clearer discovery-first framing and then corrected to the actual meeting slot (`Dienstag, 21. April 2026, 10:15-11:00 Uhr`), with the filename renamed to match. If you continue, the best follow-up is a short live speaking sheet rather than further expanding the main prep note.
→ Docs/AGENTS/Handoffs/2026-04-19_Unassigned_ZHAW_Meeting_Prep_Refinement.md

---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
Z` window and found no confirmed regression after reviewing verdict commits `f8ae0d44`, `a1353b82`, `f874e62e`, `c2f68884`, `972eb1c4`, `ace3c114` plus Stage 1 commits `08b3d771` and `5f1a7446`. Verification passed on `test/unit/lib/analyzer/verdict-stage.test.ts`, `test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, and `npm -w apps/web run build`. If a later signal appears, start in `apps/web/src/lib/analyzer/verdict-stage.ts` around `validateVerdicts(...)` and `isVerdictDirectionPlausible(...)`.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_No_Confirmed_Regression.md

---
---
---
---
Z` change in scope and it is docs/workflow-only. `git show`, `git diff --check`, and cross-file reference checks found no concrete regression to fix; excluded uncommitted analyzer/test work remains out of scope for this run.
→ Docs/AGENTS/Handoffs/2026-04-21_Unassigned_Daily_Bug_Scan_Report_Review_Publication_No_Regression.md

---
---
---
---
---
---
---
---
---
---
---
---
---
Z` and found one concrete recent-commit bug from restored agent wrappers: `be68dc19` added GPT/Gemini wrappers whose `findRepoRoot()` stopped at any `AGENTS.md`, but this repo also has `apps/api/AGENTS.md` and `apps/web/AGENTS.md`. Fixed `scripts/agents/invoke-gpt.cjs` and `scripts/agents/invoke-gemini.cjs` to require root markers `FactHarbor.sln` plus `AGENTS.md`, preserving upward discovery while avoiding path-specific agent files. Verification passed: `npm run test:knowledge`, `node --check` on both wrappers, a nested `apps/api` root-resolution assertion against both wrapper sources, GPT dry-run from `apps/api`, and `git diff --check` on the touched wrapper files.
**Warnings:** Other uncommitted analyzer/UI/config changes were present before this scan and were not evaluated as recent committed regressions.
**Learnings:** No new role learning appended.

---
---
---
---
---
---
---
Zero-citation verdict validation was reviewed but not implemented. Add a structural guard in `apps/web/src/lib/analyzer/verdict-stage.ts` so normal publishable verdicts with empty `supportingEvidenceIds` and `contradictingEvidenceIds` cannot pass, even if the LLM direction validator returns valid. Allow only explicit fallback/insufficient verdict reasons, avoid broad-pool repair backfill, and update `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`.
→ Docs/AGENTS/Handoffs/2026-05-28_Senior_Developer_Zero_Directional_Citation_Guard_Review.md

---
---
Zero_Directional_Citation_Guard_Review.md`, `2026-05-28_Lead_Architect_Main_Stabilization_Analysis_Regression_Takeover.md`, and `Docs/WIP/2026-05-28_ClaimBoundary_Routing_Telemetry_ID_Handover.md`. Push to `origin/main` remains a Captain decision.
→ Docs/AGENTS/Handoffs/2026-05-28_Agents_Supervisor_OpenAI_Login_Switch_Readiness.md

---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
---
Z` through HEAD `e294ee0b706e4a0e32365de39dbbb916bf9698b6`. Reviewed code commits `45c51b31`, `54fe23c3`, `046430ff`, `52af97af`, and `9114c443` plus docs/index commits. No diff-backed bug was confirmed, so no code fix was made. Verification passed: focused touched-surface vitest command, full safe `npm test -- --runInBand --silent`, `npm -w apps/web run build`, and `git diff --check`. Worktree was clean before recording this output and automation memory.
**Warnings:** GitHub Actions had no CI for the May 29 local HEAD because `main` is ahead of `origin/main` by 20 commits; latest visible pushed main success was `2ac6cd02` on 2026-05-28. Build still reports the known Turbopack NFT warning in the `next.config.js` -> `source-reliability-cache.ts` trace.

---
---
---
---
---
---
---
---
---
---
---
---
Z` through HEAD `8f6e801b01b34f17c811d1720a307e40c705924d`. Reviewed runtime/prompt commits `8e87c3e9`, `ca143468`, and `ac3b33da`, plus docs/index/config commits. No diff-backed bug was confirmed, so no code fix was made. Verification passed: touched-surface verdict/prompt-contract Vitest (206 tests), full safe `npm test -- --runInBand --silent`, `npm -w apps/web run build`, and `git diff --check e294ee0b..HEAD`.
**Warnings:** GitHub Actions do not cover current local HEAD because `main` is ahead of `origin/main` by 38 commits; latest visible pushed main guardrail CI success remains `2ac6cd029ce7b3e87fd50c98928b4067d5fbe1cf` on 2026-05-28, with CodeQL success for the same SHA on 2026-05-30. Build still reports the known Turbopack NFT warning in the `next.config.js` -> `source-reliability-cache.ts` trace.

---
ZERO_CITATION_FALLBACK_REASONS` allowlist covers all four `createUnverifiedFallbackVerdict` callsites (`report_damaged`, `insufficient_evidence`, `analysis_generation_failed`) plus `safeDowngradeVerdict`'s `verdict_integrity_failure` — no missed fallback path that could spurious-downgrade. `attemptDirectionRepair`'s null short-circuit is correctly handled by the sole caller (verdict-stage.ts:1583). Gitignore `/.cache/` is root-anchored and does not shadow the only tracked match `apps/web/.cache-version` (a file, not a directory). Prompt fix `ed7698a8` is text-only with `npm test` 1895 pass on this machine; no contract drift. No diff-backed bug confirmed, no code fix made.
**Warnings:** None new. Codex's 2026-05-31 entry already noted `main` is ahead of `origin/main` and the Turbopack NFT warning; both still hold.

---
---
---
### 2026-06-01 | Lead Architect + LLM Expert | Codex (GPT-5) | Direct Publishability Sufficiency Slice -- [Standard] [open-items: yes]
**For next agent:** Implemented the narrowed Stage 2/Stage 4 contract-alignment slice after targeted review. No broad evidence remap was added. D5 sufficiency can now require explicit direct applicability for jurisdictional/geographic analyses before Stage 4: when applicability assessment is relevant, `evaluateEvidenceSufficiency` counts only claim-local `supports`/`contradicts` evidence with `applicability === "direct"` toward directional sufficiency and authoritative-directional shortcuts. Contextual, foreign-reaction, missing, or LLM-unclassified applicability no longer qualifies as direct for publishability.
**Implementation details:** `assessEvidenceApplicability` now marks items with `applicabilityAssessed: true`; omitted/invalid LLM classifications remain available as context but do not silently default to `direct`. D5 emits `insufficient_direct_evidence` and creates an explicit zero-citation UNVERIFIED fallback before Stage 4 when the missing piece is direct directional evidence. Stage 4 citation checks now also reject assessed-but-unclassified applicability, while preserving legacy behavior for evidence pools where applicability assessment was not applicable. Warning display, fallback UI labels, quality metrics, and calibration degradation tagging were updated for the new warning type.
**Review:** Read-only reviewer found two blockers after first implementation: applicability classifier/prompt failures were hidden as analytical scarcity, and `insufficient_direct_evidence` was selected even for ordinary low-evidence cases. Both were fixed. Classifier degradation now emits `evidence_applicability_assessment_degraded`; `insufficient_direct_evidence` is selected only when there is enough item volume and total directional evidence, but not enough explicit direct directional evidence. Residual coverage gap: there is no full `runClaimBoundaryAnalysis` pipeline test for the contextual-only D5 fallback path yet; current tests cover the helper, applicability failure, warning registration, fallback UI, and Stage 4 citation contract.
**Verification:** Focused Vitest passed for `research-extraction-stage.test.ts`, `claimboundary-pipeline.test.ts`, `verdict-stage.test.ts`, `warning-display.test.ts`, and `FallbackReport.test.tsx`. Full safe `npm test` passed. `npm -w apps/web run build` passed with the existing Turbopack NFT warning in the `next.config.js` -> `source-reliability-cache.ts` trace. `git diff --check` passed.
**Warnings:** This is a contract-honesty fix, not evidence-recall repair. Bolsonaro EN may now fail earlier as `insufficient_direct_evidence`; if so, keep this slice and investigate the deferred per-claim attribution model (clone evidence or add claim-local direction/applicability), rather than weakening citation rules. Live jobs were not submitted in this slice; commit and refresh runtime before any job validation.

---
### 2026-06-01 | Lead Architect + LLM Expert | Codex (GPT-5) | Live Validation After Direct Publishability Sufficiency Slice -- [Standard] [open-items: yes]
**For next agent:** Committed implementation as `2395f494` (`Align research sufficiency with direct citation publishability`), reseeded prompts/configs, refreshed the web runner, and submitted exactly one fail-fast Bolsonaro EN canonical job to avoid wasting jobs: `40aa29ed7edd4b6b8fb8ecf7411d28d9`. Runtime reported `executedWebGitCommitHash: 2395f4949fc69a8ca5c7f7af8c904fcb671d7ad0+f086ee28`; the suffix came from pre-existing unrelated dirty docs/index/diagnostic files. Job result was a clear quality fail against Captain's true-side expectation: top verdict `UNVERIFIED`, truth `44`, confidence `43`, Gate 4 `0/3 publishable`, 3 claims, 6 boundaries, 49 final evidence items, 33 sources, 21 searches, 3 main iterations, 1 contradiction iteration.
**Live diagnosis:** The new direct-publishability gate did not block prematurely and did not emit `insufficient_direct_evidence`: applicability classified 50 items as 23 direct / 26 contextual / 1 foreign-reaction / 0 unclassified, then Stage 4 ran on all 3 claims. The failure is downstream/semantic: AC_01 was `LEANING-TRUE` 65/48 but non-publishable due low confidence; AC_02 was `UNVERIFIED` 52/30 after reasoning that direct independent international assessment was absent; AC_03 was `MOSTLY-FALSE` 25/28 because defense appeal allegations and defense-team claims were treated as direct contradicting evidence that the verdicts failed international fair-trial standards. This clashes with the project rule that unsubstantiated/adversarial objections are "doubted" and must not reduce verdict truth/confidence unless backed by documented counter-evidence.
**Warnings:** No second job was submitted. Do not weaken the direct-citation or direct-sufficiency contract to recover the Bolsonaro band. Next root slice should address adversarial/legal-party assertion handling in evidence extraction or verdict weighting: party filings, defense claims, government self-justifications, and political reactions need a generic LLM-mediated factual-basis distinction so allegations can inform caveats/confidence without becoming full directional contradiction/support unless independently evidenced. Prompt changes require explicit Captain approval.

---
### 2026-06-01 | Senior Developer | Codex (GPT-5) | Daily Bug Scan No Confirmed Regression -- [Standard] [open-items: no]
**For next agent:** Scanned commits since `2026-05-31T06:02:21Z` through HEAD `f08bbf2242fe376c95e6c2377bc33a0b038a9396`. Reviewed runtime/script/hook surfaces in `2395f494` (direct publishability sufficiency), `8c2799fb` (`restart-clean.ps1` env handling), `f1afdeef` (Claude factharbor.db hook guard), plus read-only diagnostic scripts from `716de649`, `a4338753`, `7fdf78d0`, and `66bcdca3`; earlier `ed7698a8`/`e649b6e5` were already covered by the prior same-day scan and the reverted prompt commit `1c790a05` was consistent with its validation note. No diff-backed bug was confirmed, so no code fix was made.
**Verification:** Focused touched-surface Vitest passed for `claimboundary-pipeline`, `research-extraction-stage`, `verdict-stage`, `warning-display`, and `claim-auto-selection-pipeline`; diagnostic scripts passed `node --check`; `.claude/settings.json` parsed; `scripts/restart-clean.ps1` parsed as a PowerShell scriptblock; full safe `npm test -- --runInBand --silent` passed; `npm -w apps/web run build` passed.
**Warnings:** Build still reports the known Turbopack NFT trace warning via `next.config.js` -> `source-reliability-cache.ts`. Worktree had pre-existing unrelated dirty docs/index/WIP files and untracked `scripts/diag/best-commit-phase1.cjs`; they were preserved.

---
### 2026-06-01 | Unassigned | Codex (GPT-5) | Pipeline Telemetry Plan Source Refresh -- [Standard] [open-items: yes]
**For next agent:** Refreshed `Docs/WIP/2026-05-28_Pipeline_Telemetry_Concept_and_Plan.md` against current source. `pipelineTelemetry` is still not implemented, but D5/direct-publishability behavior changed: `insufficient_direct_evidence` and `evidence_applicability_assessment_degraded` are now source facts and should be split under `qualityHealth`, not Phase 1 `pipelineTelemetry`. Provenance should use `resultJson.meta.executedWebGitCommitHash` / admin `gitCommitHash` and preserve dirty suffixes for grouping.
**Warnings:** Documentation only; no source implementation, tests, build, expensive tests, or live jobs were run. The worktree had pre-existing unrelated dirty files and they were preserved.
→ Docs/AGENTS/Handoffs/2026-06-01_Unassigned_Pipeline_Telemetry_Plan_Source_Refresh.md

---
### 2026-06-05 | Lead Developer | Codex (GPT-5) | Report Quality Phase 0 + Phase 1 Scorer -- [Standard] [open-items: yes]
**For next agent:** Phase 0 is landed in `benchmark-expectations.json` and `report-quality-expectations.json`; Phase 1 started with `scripts/measure-report-quality.ts`. Run with `npx tsx scripts/measure-report-quality.ts` (`--family`, `--limit`, `--build`, `--compare`, `--json` available). Full zero-spend dry-run scored 514 exact benchmark reports with 0 parse failures and no live jobs/LLM calls.
→ Docs/AGENTS/Handoffs/2026-06-05_Lead_Developer_Report_Quality_Phase0_Phase1_Scorer.md

---
### 2026-06-05 | Lead Developer | Codex (GPT-5) | Report Quality Scorer Review Remediation -- [Standard] [open-items: yes]
**For next agent:** Diverse read-only review returned NO-GO on the initial scorer; remediation is appended in the same handoff. Main fixes: primary-claim anchor floor, exact evidence-reference parsing including unknown `EV_*` reason tokens, calibration target split from confidence-band success, optional `AnalysisMetrics`, parse-failure isolation, and matched family/build tie-band comparison. Follow-up review found two further NO-GO items, now fixed: compare coverage uses the required benchmark family universe and reports `missingBoth`, and aggregation-faithfulness provenance normalizes consumed source-default baseline weighting fields instead of comparing an incomplete local aggregation object. Q-S1.3 metadata now names the current persisted CB shape. Final diverse re-review after second remediation: Gemini 3.1 GO, Claude Opus conditional GO with `contestationWeights` residual verified closed against source, local Codex GO. Full zero-spend dry-run passes: 514 scored reports, 0 parse failures, no live jobs/LLM calls.
→ Docs/AGENTS/Handoffs/2026-06-05_Lead_Developer_Report_Quality_Phase0_Phase1_Scorer.md

---
### 2026-06-06 | Senior Architect / Code Reviewer | Codex (GPT-5) | Multi-Variant Pipeline Proposal Paused -- [Standard] [open-items: yes]
**For next agent:** Multi-variant pipeline work is paused after consolidation in commit `e6a965d29` (`docs(wip): pipeline era-comparison study plan + deferred multi-variant capability`). The in-tree variant architecture/spec/plan remain useful but are explicitly deferred; near-term comparison work should start from `Docs/WIP/2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md`. If the deferred in-tree capability is revived, start with `Docs/WIP/2026-06-04_Multi_Variant_Pipeline_Architecture.md`, `..._Specification.md`, and `..._Implementation_Plan.md`; the Codex review findings have already been folded into those docs. Key guardrails: current code persists `pipelineVariant` but does not dispatch variants; Phase 0 must cover create/retry validation, runner dispatch, and UI/API selection; Phase 0b needs a rich immutable `ClaimContract` plus mutable downstream working copy; Phase 1 must thread both effective config and prompt profile, not just config.
**Warnings:** No source implementation, tests, expensive tests, or live jobs were run for the pause step. Existing unrelated dirty index/script changes and the untracked report-quality handoff were preserved and not staged.
→ Docs/WIP/2026-06-04_Multi_Variant_Pipeline_Architecture.md

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Diverse Reference-Dossier Confirmation -- [Standard] [open-items: yes]
**For next agent:** Updated `scripts/agents/invoke-claude.cjs` to use the `opus-4.8-1m-max` profile with current Opus alias, Max effort, explicit account/CLI-entitlement context note, and child-env `CLAUDE_CODE_EFFORT_LEVEL=max` override. Applied diverse-review fixes to `Docs/AGENTS/Reference_Dossiers/bundesrat-rechtskraftig.v0.1.json`: explicit `EU-Vertrag` referent, no "most relevant" frame bias, added valid-signature/procedural-effect coverage, separated signature occurrence from Parliament timing, corrected `RA_RATIFICATION_PHASE_COOPERATION` to TRUE for its narrowed claim, and documented the narrow LEANING-TRUE benchmark edge. Hardened `scripts/validate-reference-dossiers.cjs` and `Docs/WIP/2026-06-06_AtomicClaim_Reference_Data_Model.md` for benchmark band equality, duplicate frame/assertion IDs, required assertion evidence, strict separability, and `BAND_EXCEPTION:` overrides. Initial diverse review found fixable issues; focused confirmation returned Opus GO, Gemini GO, and GPT GO after rerun with embedded diff.
**Warnings:** Dossier remains `status: draft`; external source verification, source archives/hashes, independent adjudicator/peer reviewer, and manual alignment against stored reports are still required before any status upgrade. The first GPT confirmation attempt had no filesystem access and was treated as invalid, then rerun with embedded diff and validation transcript. Existing unrelated `Agent_Outputs.md` daily bug-scan entry was preserved.

---
### 2026-06-06 | Lead Developer | Codex (GPT-5) | Bundesrat Dossier Source Snapshot Pass -- [Standard] [open-items: yes]
**For next agent:** Captured five live official Swiss-government source snapshots for `bundesrat-rechtskraftig.v0.1` under `Docs/AGENTS/Reference_Dossiers/snapshots/bundesrat-rechtskraftig/v0.1/`, added SHA-256 hashes to the dossier, and hardened `scripts/validate-reference-dossiers.cjs` to verify that any declared `localPath` exists inside the repo and matches `sourceSnapshots[].localHash`. Removed the stale BK ratification guideline source after live browser testing returned 404, re-routed final-force support through the EDA legal explainer, EUPA notice, package overview, and timeline snapshots, and reordered signature evidence so retrospective sources carry actual-event support before the 25 Feb announcement. `npm run validate:reference-dossiers` passes with hash enforcement. Opus returned `SOURCE-GROUNDED-READY`; Gemini returned `KEEP-DRAFT` on status policy, so the lead decision was to keep `status: draft` and commit the source groundwork without promotion.
**Warnings:** Promotion remains open: a human or explicitly accepted adjudicator must decide whether agent adjudication is sufficient for `source_grounded`. The first five HTML snapshots are committed local captures, but no Internet Archive URLs were added. Existing unrelated `Agent_Outputs.md` daily bug-scan entry remains preserved.

---
### 2026-06-07 | Lead Developer | Codex (GPT-5) | Plastic EN Partial Reference Dossier -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/plastic-en.v0.1.json` as a draft partial AtomicClaim reference dossier for Captain input `Plastic recycling is pointless`, plus four local source snapshots under `Docs/AGENTS/Reference_Dossiers/snapshots/plastic-en/v0.1/`. The dossier separates the literal zero-benefit frame from the reasonable effectiveness/worth-at-scale frame, defines truth conditions for effectiveness, environmental value, economic value, and material-specific variance, and keeps material-specific variance as tolerated context pending adjudication. Source hashes are enforced by `scripts/validate-reference-dossiers.cjs`; `npm run validate:reference-dossiers` passes.
**Review:** Opus returned GO with only draft-status residuals; Gemini returned GO-after-fixes, and the economic overgeneralization/polarity concerns were addressed; GPT's first no-filesystem review was invalid, then embedded-context review found the economic caveat on the wrong assertion and a source-note mismatch, both fixed. Final narrow GPT confirmation: source/note mismatch RESOLVED, no new blocker/high/medium, final commit verdict GO.
**Warnings:** Dossier remains `status: draft`; promotion still needs adjudicator/peer-review decision, stronger direct economic evidence if moving beyond draft, and any desired archive URLs beyond local HTML snapshots. The existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-07 | Lead Developer | Codex (GPT-5) | Hydrogen EN Partial Reference Dossier -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/hydrogen-en.v0.1.json` as a draft partial AtomicClaim reference dossier for Captain input `Using hydrogen for cars is more efficient than using electricity`, plus four local official DOE/EPA source snapshots under `Docs/AGENTS/Reference_Dossiers/snapshots/hydrogen-en/v0.1/`. The dossier treats `efficient` as measurement-frame dependent: full-pathway/well-to-wheel and use-phase/tank-to-wheel are strict required truth conditions, while range/refueling/energy-density advantages are tolerated context only and must not become thesis-direct evidence. `npm run validate:reference-dossiers` passes.
**Review:** Initial Opus and GPT reviews returned GO-after-fixes on source-note overstatement and wording caveats; Gemini returned GO with the same minor source-note concern. Fixed the unsupported motor-stage efficiency number, added caveats that the full-pathway model is inferential/partial, made the BEV/direct-electric reading explicit, and marked the proxy assertion's procedural role as intentional. Final narrow confirmations: GPT GO, Gemini GO, Opus GO; all prior medium findings resolved and no new blocker/high/medium.
**Warnings:** Dossier remains `status: draft`; promotion still needs adjudicator/peer-review decision, any stronger direct WTW/tank-to-wheel quantitative source desired for later versions, and archive URLs beyond local HTML snapshots. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Asylum 235000 DE Partial Reference Dossier -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/asylum-235000-de.v0.1.json` as a draft partial current-snapshot AtomicClaim reference dossier for Captain input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`, plus six local official SEM source snapshots under `Docs/AGENTS/Reference_Dossiers/snapshots/asylum-235000-de/v0.1/`. The dossier uses the official SEM umbrella category `Total Personen aus dem Asylbereich (inkl. RU)`: the clean decisive aggregate is 235 057 at end December 2025, just above the threshold; the April 2026 current-statistics packet is treated as component context only because the captured relevant listing exposes narrower tables rather than a one-line clean umbrella total.
**Review:** `npm run validate:reference-dossiers` passed. Diverse review through GPT-5.5, Gemini 3.1 Pro Preview, and Claude Opus 4.8 1M Max confirmed the main fixes: component-stitching guard is narrowed to unsupported/incomplete/double-counting reconstructions, procedural/definition guards are not averaged into top-line truth, the end-2025 vs April-2026 freshness caveat is explicit, and the April archive-page absence claim is scoped to the captured listing. A remaining low 6-51 source-note issue was fixed by removing an unsupported row value and preserving the `ohne offenen Asylprozess` qualifier; final narrow confirmations from all three lanes returned GO.
**Warnings:** Dossier remains `status: draft`; promotion still needs adjudicator/peer-review decision, any desired archive URLs beyond local snapshots, and revalidation when SEM publishes a newer clean official umbrella aggregate for `Personen aus dem Asylbereich`. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Bundesrat Simple Partial Reference Dossier -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/bundesrat-simple.v0.1.json` as a draft partial AtomicClaim reference dossier for Captain input `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`, plus four copied official Swiss-government source snapshots under `Docs/AGENTS/Reference_Dossiers/snapshots/bundesrat-simple/v0.1/`. The dossier models the Captain-corrected high-true literal chronology: the Switzerland-EU package/Bilaterals III was signed before Parliament decided and before any popular decision, while a required caveat prevents treating signature as final parliamentary/popular approval, ratification, or entry into force.
**Review:** `npm run validate:reference-dossiers` passed. Diverse review through GPT-5.5, Gemini 3.1 Pro Preview, and Claude Opus 4.8 1M Max returned GO for draft after one substantive refinement: `RA_PACKAGE_SIGNATURE_OCCURRED` now explicitly attributes the signature to the Swiss side through the Federal Council, with Federal President Guy Parmelin named as signer, and clarifies that `Der Bundesrat unterschrieb` is not a seven-physical-signatures claim. Operator checks verified the non-obvious `newnsb` URL against captured HTML metadata/title and confirmed no contradiction with `bundesrat-rechtskraftig` source/referent structure.
**Warnings:** Dossier remains `status: draft`; promotion still needs adjudicator/peer-review decision and any desired archive URLs beyond local snapshots. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Asylum WWII DE Partial Reference Dossier -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/asylum-wwii-de.v0.1.json` as a draft partial AtomicClaim reference dossier for Captain input `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`, plus three local source snapshots under `Docs/AGENTS/Reference_Dossiers/snapshots/asylum-wwii-de/v0.1/`. The dossier separates the current-count premise from the historical comparison: broad SEM `Personen aus dem Asylbereich (inkl. RU)` supports 235 057 at end 2025, narrow recognized-refugee terminology is caveated at 94 261, and the top-line comparison is false-side because the end-of-WWII endpoint stock was about 115 000 refugees, not a cumulative wartime flow.
**Review:** `npm run validate:reference-dossiers` passed. Diverse review through GPT-5.5, Gemini 3.1 Pro Preview, and Claude Opus 4.8 1M Max found the structure correct and draft-committable. Two material review risks were fixed before commit: the HLS endpoint-stock source now has a local Wayback snapshot/hash instead of being URL-only, and the SEM 235 057 assertion explicitly says to use the published total only, not reconstruct it from RU/component tables. Final focused confirmations from all three lanes returned GO.
**Warnings:** Dossier remains `status: draft`; promotion still needs adjudicator/peer-review decision and ideally a second independently captured endpoint-stock corroborator beyond HLS. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Bolsonaro EN/PT Partial Reference Dossiers -- [Standard] [open-items: yes]
**For next agent:** Added `Docs/AGENTS/Reference_Dossiers/bolsonaro-en.v0.1.json` and `Docs/AGENTS/Reference_Dossiers/bolsonaro-pt.v0.1.json` as draft partial AtomicClaim reference dossiers for the Captain Bolsonaro EN/PT inputs, plus a shared current source snapshot pack under `Docs/AGENTS/Reference_Dossiers/snapshots/bolsonaro-shared/v0.1/`. The EN dossier covers the broad `legal proceedings` wording with TSE ineligibility plus STF AP 2668; the PT dossier stays focused on AP 2668 because the input says `por tentativa de golpe de Estado`. Both keep the family true-side-with-caveats band and preserve verdict/sentence fairness as an explicit evaluative component.
**Review:** `npm run validate:reference-dossiers` passed. Diverse review through GPT-5.5, Gemini 3.1 Pro Preview, and Claude Opus 4.8 1M Max returned GO-WITH-FIXES on a shared structural issue: caveat-weighting guidance had been modeled as a scored truth assertion. Fixed by removing the pseudo-claim from both dossiers, narrowing overstrong source wording, adding pre-finality warnings to the October 2025 AP appeal source, removing unsupported impartiality/public-process wording, removing OAS Article 8 from the PT evidence path, and splitting EN verdict supportability from AP 2668 sentence proportionality/fairness. Focused confirmations from all three lanes returned GO with no new blocker/high/medium findings.
**Warnings:** Dossiers remain `status: draft`; promotion still needs adjudicator/peer-review decision and any desired archive URLs beyond local snapshots. The May 2026 STF finality source controls current case status; October 2025 AP appeal coverage is retained only for historical defense/sentence-reduction arguments. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Reference Dossier Corpus Routing Readiness -- [Standard] [open-items: yes]
**For next agent:** Performed a corpus-level zero-spend audit across all eight draft v0.1 reference dossiers. Added explicit `benchmarkCoherence.topLineAssertionIds`, `coverageGuardAssertionIds`, and `contextAssertionIds` to the schema and all dossiers, and hardened `scripts/validate-reference-dossiers.cjs` so top-line assertion IDs must resolve, be required, and match benchmark truth/confidence bands. Added aggregate top-line assertions for `bundesrat-rechtskraftig`, `bundesrat-simple`, and `plastic-en`; set explicit routing for the other five dossiers.
**Review:** Initial corpus review through GPT-5.5, Gemini 3.1 Pro Preview, and Claude Opus 4.8 1M Max returned GO-WITH-FIXES, converging on top-line ambiguity, guard double-counting risk, duplicate source IDs with different local paths, and small cleanup items. Fixed by adding machine-readable routing, moving shared asylum/bundesrat snapshots into shared directories, removing plastic literal-zero counterevidence ambiguity, setting a bounded `validThrough` on `bundesrat-simple`, and adding the asylum-WWII threshold caveat. Focused confirmations from all three lanes returned GO with no new blocker/high/medium findings.
**Verification:** `npm run validate:reference-dossiers`, `node --check scripts/validate-reference-dossiers.cjs`, and a source-conflict audit over all dossier `sourceSnapshots` passed. Remaining v0.2 polish: decide whether to route every non-topline required subclaim explicitly, not just top-line/guards/context; this is not required by the v0.1 consumer contract.
**Warnings:** Dossiers remain `status: draft`; promotion still requires adjudicator/peer-review decision and any desired archive URLs beyond local snapshots. Existing unrelated `Agent_Outputs.md` daily-scan entries from another agent remain preserved outside this commit.

---
### 2026-06-08 | Lead Developer | Codex (GPT-5) | Reference Dossier Routing Consumer -- [Standard] [open-items: yes]
**For next agent:** Implemented the first zero-spend consumer for the reference-dossier routing contract. `Docs/AGENTS/benchmark-expectations.json` now links all eight benchmark families to their draft v0.1 dossiers via `families[].referenceDossier`; `scripts/lib/reference-dossier-routing.cjs` loads those linked dossiers and exposes top-line, coverage-guard, and context assertion routes. `scripts/measure-report-quality.ts` now uses linked `topLineAssertionIds` as the C4 expected labels/truth/confidence source, while exposing the whole dossier signal as `role: COLOUR`, `mode: diagnostic_only`, and `rankingEligible: false` for C1/C3 until Phase 0b reliability gates pass. Coverage guards and context assertions are explicitly not averaged into C4.
**Validation:** `npm run validate:reference-dossiers` passes all eight dossiers; `node --check scripts/lib/reference-dossier-routing.cjs` and `node --check scripts/validate-reference-dossiers.cjs` pass. A focused `npx tsx scripts/measure-report-quality.ts --family hydrogen-en --limit 1 --json` confirmed `overallVerdict.expected.source = reference-dossier-top-line` and `referenceDossier.rankingEligible = false`; `npx tsx scripts/measure-report-quality.ts --limit 25` ran without live jobs/LLM calls. A route audit confirmed all eight families resolve to their intended top-line assertion IDs.
**Warnings:** `npm run validate:quality-drift` still fails on pre-existing `Docs/AGENTS/Prompt_Issue_Register.md` entries PI-001..PI-004 lacking `qCode:` lines; this slice did not touch that register. During implementation, the first two amendments accidentally targeted repeated `acceptedVerdictLabels` blocks in `bundesrat-simple`; both were logged with `scripts/hooks/revert-classify.cjs` and corrected so only `RA_SIMPLE_CHRONOLOGY_TOPLINE_TRUE` carries the added `MOSTLY-TRUE` top-line label. Dossiers remain `status: draft`; next real work is manual C1/C3 alignment against stored reports, starting with `bundesrat-rechtskraftig`, `plastic-en`, and one Bolsonaro input.
