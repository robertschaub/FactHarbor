# Codex (GPT-5.5) Review Prompt — Multi-Variant Pipeline Proposal

Paste the block below into Codex running in the FactHarbor repo. It is a **review** task (no code to write). Codex has read access to the repo, so it should verify the docs' claims against the actual source.

---

You are an independent **Senior Architect / Code Reviewer** for the FactHarbor repo (`C:\DEV\FactHarbor`). Adversarially review a **proposal** (no code written yet) before implementation. Do **not** implement — produce a review grounded in the actual code. Cite `file:line` for every confirm/refute; if you can't verify a claim, say so.

## Read first
1. `/AGENTS.md` — binding repo rules (generic-by-design; the LLM-intelligence mandate that semantic text decisions must not be deterministic regex/keyword logic; UCM/config placement tiers; warning materiality; commit-first discipline; safety). The proposal must respect these.
2. The three proposal docs in `Docs/WIP/` (all dated 2026-06-04). Start from the **Locked decisions** block at the top of the Architecture doc:
   - `2026-06-04_Multi_Variant_Pipeline_Architecture.md`
   - `2026-06-04_Multi_Variant_Pipeline_Specification.md`
   - `2026-06-04_Multi_Variant_Pipeline_Implementation_Plan.md`

## What the proposal does (orientation)
Adds a multi-variant pipeline capability: an **in-tree variant registry** (declarative `apps/web/configs/variants.json` + code binding `variants/registry.ts`, stable entry `(ctx) => Promise<PipelineRunResult>`); **file-authoritative UCM** (base `configs/*.default.json` + sparse per-variant `configs/variants/<id>.override.json`, deep-merge by key + Zod, **removing** the config SQLite DB / versioning / editing UI, keeping a read-only inspector); **per-report provenance + a pipeline fingerprint**; and a **matrix run** (one input → N variants → comparison view). **Stage 1 (claim generation + selection) is pinned to HEAD's *logic* for all variants** (identical claim *output* not required); a variant = **Stages 2–5 only**, fed an injected `ClaimContract`. First concrete use: rebuild 3 historical tag-eras as variants — `Quality_Top_Peak` (`b7783872`), `2before_bol_fix` (`d528b62c`), `quality_before_decline` (`d3ad26ca`) — to compare downstream quality on a constant claim-selection logic.

## Ground rules
- The **Locked decisions** are Captain-approved. You MAY critique their risks/feasibility and propose *required changes*, but do **not** propose reversing them.
- This is a proposal; output a review, not code. Don't run expensive/LLM tests.

## Verify these factual claims against the code (confirm/refute with file:line)
1. `pipelineVariant` already flows end-to-end (`apps/api/Controllers/AnalyzeController.cs` `CreateJobRequest` + allowlist ~line 57; `JobService.CreateJobAsync`; `JobEntity` in `apps/api/Data/Entities.cs`), allowlist hardcoded to `["claimboundary"]`.
2. **Stage-1 seam:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` threads one mutable `CBResearchState` (init ~`:733`); Stage 1 (`extractClaims`, `:785`) writes `state.understanding`/`state.languageIntent` (`:786–793`); selection `~:888–1090`; `researchEvidence(state)` at `:1098`. Is the seam as bounded as Plan Phase 0b claims? **List any downstream stage that reads Stage-1-only state in a way that complicates the split** into `ClaimContract` (pre-stage) vs research/verdict working-state (variant).
3. **Config read breadth:** the plan claims ~65 `loadXConfig`/`getConfig` sites across 21 files, ~20 inside analyzer stages, and that in-stage reads hit the *global/active* config (so a variant override would be **silently bypassed** unless threaded). Verify the count and — crucially — **whether each in-stage read can be made variant-scoped**. List any that are hard to thread (module-level singletons; calls with no access to `jobId`/`variantId`).
4. `getConfigSnapshot` / `job_config_snapshots` has only one runtime consumer (read-only admin route `apps/web/src/app/api/admin/quality/job/[jobId]/config/route.ts`); deletion is safe. **Confirm there is no other consumer** (esp. any reanalysis/re-run path).
5. `apps/web/src/lib/analyzer/prompt-loader.ts` is section-addressed (`loadAndRenderSection`, ~30 named sections) and `promptContentHash` = SHA-256 of file content. Confirm.
6. Commit provenance (`apps/web/src/lib/build-info.ts`, `apps/api/Helpers/AppBuildInfo.cs`): `GIT_COMMIT` env → `git rev-parse HEAD`; dirty tree → `<hash>+<wt8>`. Confirm.
7. The 5 candidate tags are code-divergent in `apps/web/src/lib/analyzer` vs HEAD (plan cites file counts). Spot-check one (e.g. `git diff --stat HEAD b7783872 -- apps/web/src/lib/analyzer`).

## Pressure-test the riskiest design claims (answer each)
- **A. Config-threading correctness (rated High risk).** Is "in-stage reads must resolve from `ctx.effectiveConfig`" sufficient and feasible? Are there reads that can't be threaded cleanly? Is a per-job effective-config resolver keyed by `jobId` simpler/safer than threading `ctx` everywhere? What's the failure mode if one in-stage read is missed?
- **B. Stage-1 hoist behavior-preservation.** Is splitting `CBResearchState` truly behavior-preserving for the single `claimboundary` variant? Any hidden coupling (research mutating `understanding`; selection depending on downstream state; `languageIntent` consumers)?
- **C. Fingerprint sufficiency.** Is `sha256(variantId + commit + stage1.logicFingerprint + downstream prompt hashes + effective-config hashes + models)` the right set for "same reproducible setup"? Anything missing that would make two equal fingerprints behave differently (search-provider env/keys, source-reliability DB state, a model *version* drifting behind a tier alias, current-date)?
- **D. Config-DB removal blast radius.** Beyond wrapped `loadXConfig`, what else reads/writes `config_blobs`/`config_active`/`config_usage` or depends on admin config write/activate/reseed/rollback/history endpoints? Any test/script/UI that breaks?
- **E. Historical-report compatibility.** Does any diag script, report viewer, metrics, or calibration code assume the config DB / `job_config_snapshots` exists, or break when `meta.provenance` is present/absent or when new nullable Job columns appear?
- **F. Lean check.** Is this drifting toward the abandoned Pipeline_V2 "process machinery becomes the product" failure (see `Docs/ARCHIVE/WIP/2026-05-12_Pipeline_Rebuild_*` and project memory), or appropriately scoped? Flag any over-built phase.
- **G. Rebuild semantics.** Variants are "tag X's Stages 2–5 on HEAD's claim-selection logic." Does the `ClaimContract` adapter (HEAD claim shape → era-X expected shape) introduce a confound that undermines the cross-era comparison? Is there a cleaner way to hold claim-selection constant?

## Also check
- **Internal consistency across the 3 docs** — especially the fingerprint formula (Architecture §6.3 vs Spec §4.2), the `stage1` provenance block, the `JobEntity` new columns, and the phase map.
- **AGENTS.md compliance** — the config deep-merge and the `ClaimContract` adapter must be **structural-only** (no semantic text interpretation); no domain hardcoding; warning/severity rules intact; Gate-1/Gate-4 and evidence-transparency invariants preserved; input-neutrality and multilingual robustness unaffected.
- Whether the plan's **phase ordering** is right (e.g., should config-threading land before any variant sets an override; is Phase-1 DB removal safely reversible).

## Output format
1. **Verdict:** commit-as-is / commit-with-required-changes / revise.
2. **Blockers** (must-fix before Phase 0) — each with `file:line` evidence.
3. **Required changes** and **recommended (non-blocking) improvements** — separated.
4. **Factual corrections** — any claim in "Verify" you refuted, with evidence.
5. **Risks the proposal missed.**
6. **Direct answers to pressure-tests A–G.**

Be terse and evidence-based. Prefer `file:line` and concrete mechanisms over prose.
