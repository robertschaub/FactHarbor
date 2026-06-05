# Multi-Variant Pipeline — Implementation Plan

> **⚠ STATUS 2026-06-04 — DEFERRED / DECOUPLED CAPABILITY.** Near-term work pivoted to the worktree-native study ([`..._Worktree_Study_Plan.md`](2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md)). This phased plan stays as the design for the deferred in-tree capability; revive only if forward variant testing is wanted. (The UCM-simplification + provenance pieces here can also proceed as their own small initiative, independent of either comparison path.)

**Date:** 2026-06-04
**Role:** Lead Architect
**Status:** Proposal / draft for review — no code changed
**Companion docs:** [Architecture](2026-06-04_Multi_Variant_Pipeline_Architecture.md) · [Specification](2026-06-04_Multi_Variant_Pipeline_Specification.md)

Sequenced so that **every phase ends in a runnable, behavior-preserving state**, verifiable with safe tests only. Live/expensive jobs occur only at explicit gates (AGENTS.md cost discipline). This mirrors the May-12 rebuild discipline (contracts/adapters first, isolated path, no public-output replacement until a gate) but at the lighter scale this task actually needs.

> **Settled decisions:** see the **Locked decisions** block at the top of the [Architecture](2026-06-04_Multi_Variant_Pipeline_Architecture.md). **Phase map:** 0 (registry+dispatcher) → 0b (Stage-1 seam + relocate) → 1 (file-authoritative UCM + config-threading) → 2 (provenance) → 3 (per-job selection + smoke A/B) → ~~3b (Option B prompts — DROPPED)~~ → 3c (3 historical variant rebuilds) → 4 (matrix) → 5 (inspector UI + docs). Two bounded refactors only (0b seam, Phase-1 config-threading); no general "refactor-first" phase.

---

## Guiding constraints

- **Behavior-preserving by default.** Until a real second variant is intentionally compared, `claimboundary` output must be unchanged. Each phase's exit gate proves this.
- **Lean over machinery.** No Captain-Deputy/HighJump-style process (Pipeline_V2 lesson). One accountable implementer; independent reviewer only for the prompt/config-governance and the DB-removal phases.
- **Additive provenance.** New report/Job fields are additive and NULL-safe for historical data.
- **Files authoritative.** No DB reseed step should ever be needed for config to take effect.
- **Refactoring posture — one targeted seam refactor, not a rewrite.** Do **not** precede this work with a general pipeline cleanup pass (that is the Pipeline_V2 trap). The current `claimboundary-pipeline.ts` is wrapped unchanged in Phase 0. The *single* structural refactor required is the **Stage‑1 seam** (Phase 0b): introduce a typed `ClaimContract` handoff and split the shared mutable `CBResearchState` into claim‑inputs vs research/verdict working‑state. Coupling there is bounded (Stage 1 writes `state.understanding`/`state.languageIntent` at `claimboundary-pipeline.ts:786–793`; research+ consume them from `:1098`). All other cleanup (dead config knobs, deterministic‑hotspot migration, orphan prompt sections like `CLAIM_GROUPING`, the May‑12 quarantine list) is **opportunistic** — done only when a phase already touches that code, never as a blocking pre‑phase.

---

## Phase 0 — Variant registry + dispatcher (pure refactor, one variant)

**Goal:** route the existing pipeline through a registry + dispatcher with identical behavior.

- Add `apps/web/configs/variants.json` with a single `claimboundary` row (`promptProfile: "default"`, `configOverrideFile: null`).
- Add `apps/web/src/lib/analyzer/variants/registry.ts` (`VARIANT_ENTRIES`, `resolveVariant`, `listActiveVariantIds`) + the `PipelineRunContext`/`PipelineRunResult` types.
- Add `runClaimboundaryVariant(ctx)` adapter wrapping `runClaimBoundaryAnalysis` (no stage changes; still loads config the old way for now).
- **Wire all four variant surfaces (corrected per Codex review — execution is NOT variant-dispatched today):**
  1. **Runner dispatch** — replace the hardcoded `runClaimBoundaryAnalysis` call and the `"claimboundary"`-only typing in `apps/web/src/lib/internal-runner-queue.ts:17, :231` with `resolveVariant(job.pipelineVariant).entry(ctx)`. Unknown/inactive id → fail fast.
  2. **API create validation** — `AnalyzeController` validates against `listActiveVariantIds()` (replace hardcoded allowlist ~`:57`).
  3. **API retry validation** — `JobsController.RetryJob` (`:206`/`:245`) currently accepts a `pipelineVariant` with **no allowlist check**; apply the same validation.
  4. **UI/API selection** — the analyze UI hardcodes the variant (`apps/web/src/app/analyze/page.tsx:26`); add a selector (or accept via API only initially) sourced from the manifest.

**Exit gate:** `npm test` + `npm -w apps/web run build` green; Phase-0 parity test (registry path == direct call on a fixture). No behavior change.
**Reviewer:** not required (mechanical).

---

## Phase 0b — Extract Stage 1 as a HEAD-pinned shared component (refactor, behavior-preserving)

**Goal:** split claim generation + Gate 1 + selection out of the orchestrator into a shared component owned by the dispatcher, so every variant uses the **same HEAD claim-selection logic** (Architecture §3.3, Spec §1.4). Per the Captain constraint, the **logic** is pinned; identical claim **output** across variants is **not** required.

- **Seam refactor (the core of this phase) — `ClaimContract` is richer than first sketched (corrected per Codex review).** Define a typed, **immutable** `ClaimContract` carrying the **full post-selection `CBClaimUnderstanding`** + `languageIntent` + preliminary evidence/seeds + distinct-events + inferred geography/language + Gate-1 stats + selection metadata (selected IDs + finality) — because downstream reads/mutates all of these: research consumes preliminary-evidence remap (`research-orchestrator.ts:484`) + language/geography (`:1171`), boundary reads claims (`boundary-clustering-stage.ts:109`), Gate 4 reads claim stats (`aggregation-stage.ts:476`). **Split `CBResearchState`** (`claimboundary-pipeline.ts:733`) into (a) the immutable `ClaimContract` (what `claimContractHash` hashes) and (b) a **mutable working copy** the variant owns for Stages 2–5. Snapshot the **post-selection** `understanding` — selection mutates it (`:891`). Today Stage 1 writes `state.understanding`/`state.languageIntent` (`:786–793`); research reads from `:1098`. Bounded, test-guarded, behavior-preserving.
- Extract Stage 1 into `runSharedClaimPreStage(input, ctx)` owned by the dispatcher; it returns the run's `ClaimContract` and records `stage1.logicFingerprint` (hash of HEAD Stage-1 code+prompt+config) + this run's `claimContractHash`.
- `runClaimboundaryVariant(ctx)` consumes `ctx.claimContract` instead of extracting claims inline. Stage-1 prompt sections + config are excluded from variant override scope.
- **Relocate** the default variant's Stages 2–5 from `claimboundary-pipeline.ts` into `variants/claimboundary/` (§11 decision 1 — done here since this phase already restructures the file), so all variants are symmetric. Update imports + registry binding.
- Single-variant behavior is preserved structurally (LLM step ⇒ structurally equivalent, not bit-identical — consistent with alpha variance).
- Boundary: shared component = everything through **final claim selection** (incl. the two-pass preliminary-grounding search that shapes claims); research onward = variant.

**Exit gate:** parity test (extracted Stage 1 + variant == prior monolith on a fixture, structurally); `stage1.logicFingerprint` stable for fixed HEAD; build + `npm test` green. (Note: `claimContractHash` need NOT be stable run-to-run — that's expected variance, not a failure.)
**Reviewer:** light review (Stage-1 boundary correctness).

---

## Phase 1 — UCM: files authoritative + base/override resolution

**Goal:** replace the config DB with file-backed base + sparse per-variant override; effective config flows through the run context.

- Implement `resolveEffectiveConfig(variantId)` (deep-merge by key, array/scalar replace, Zod validate, hashes) + file cache by mtime.
- Re-point `loadPipelineConfig/loadSearchConfig/loadCalcConfig` to wrap `resolveEffectiveConfig` (keep `{config, contentHash}` return shape) → minimal churn for the **DB-removal mechanics**.
- **Config-threading refactor (correctness prerequisite for per-variant overrides — found 2026-06-04).** Config is read in ~**70 sites / ~25 files** (count depends on whether loader/storage/admin routes are included; Codex counted 72/28), **~20 inside the analyzer stages** (`research-orchestrator.ts` 6, `claim-extraction-stage.ts` 4, `verdict-generation-stage.ts` 3, `aggregation-stage.ts` 3, `boundary-clustering-stage.ts` 2, `budgets.ts` 1, `sr-service-impl.ts` 1). These in-stage reads currently hit the **global/active** config; under variants a stage reading the global config **silently bypasses the variant's override**. So Stages-2-5 reads must resolve from the **variant's effective config** (`ctx.effectiveConfig`, not the hardcoded `"default"` profile); Stage-1 reads resolve to **HEAD** config. Bounded/mechanical but mandatory — wrapping `loadXConfig` alone does NOT fix it. Non-analyzer readers (admin routes, health/version, calibration, input-policy-gate) keep global-active semantics and are out of scope.
- **Prompt-profile threading (sibling correctness prerequisite — found by Codex review).** **24 hardcoded `loadAndRenderSection("claimboundary", …)` call sites** across the stages ignore the variant's prompt profile (`research-query-stage.ts:181`, `research-extraction-stage.ts:116/279/512`, `scope-normalization.ts:133`, `boundary-clustering-stage.ts:280`, `verdict-generation-stage.ts:406`, `aggregation-stage.ts:718/869`, + Stage-1 sections in `claim-extraction-stage.ts`/`claim-selection-recommendation.ts`). Replace with the profile from the run context, honoring the split: **Stage-1 sections → HEAD profile; Stages-2-5 sections → variant profile** (`ctx.prompt`). Binding is by call-site/stage, not section name (`EXTRACT_EVIDENCE` appears in both the Stage-1 path `claim-extraction-stage.ts:2019` and the research path `research-extraction-stage.ts:279`).
- Wire `runClaimboundaryVariant` to consume `ctx.effectiveConfig` (drop the in-orchestrator `loadXConfig` calls at claimboundary-pipeline.ts ~638–642).
- Delete config DB internals — **wider surface than just `loadXConfig` (expanded per Codex review):** `config_blobs`/`config_active`/`config_usage` tables, `initializeDefaultConfigs()`, activation/history/rollback APIs (`config-storage.ts:719, :891`), the editing UI (`apps/web/src/app/admin/config/page.tsx`), the job-level **config + prompts endpoints** (`api/fh/jobs/[id]/configs/route.ts:27`, `.../prompts/route.ts:31`), and the config drift/storage **tests**. Also remove the snapshot **write** `captureConfigSnapshotAsync` (`claimboundary-pipeline.ts:656`, `config-snapshots.ts:71`), not just the table/read.
- Move prompt loading fully to files (remove DB-backed prompt seeding/reseed); keep `hashContent` + per-file hashes.
- Keep `DEFAULT_*_CONFIG` + `config-drift.test.ts` (role: TS fallback parity guard).
- `claimboundary` override file stays absent ⇒ effective == base ⇒ behavior unchanged.

**Exit gate:** safe tests green; config-resolution + drift contract tests pass; a manual diff of resolved effective config vs. the previous default-DB values shows equality for `claimboundary`. **Propagation tests (both):** (a) a synthetic variant config override of a deep pipeline key (e.g. `modelVerdict`) is observably honoured by the stage that consumes it; (b) a synthetic variant prompt-profile override is honoured by a Stages-2-5 section load while Stage-1 sections still load HEAD. Both prove no in-stage global read/hardcoded-profile bypass. No behavior change for `claimboundary`.
**Reviewer:** **required** (DB removal touches a wide surface; in-stage config **and prompt-profile** reads must be variant-scoped). Focused review on the deleted-surface call graph + the ~20 in-stage config reads + the 24 hardcoded prompt-profile sites.

> **Sequencing note:** Phase 1 is the largest deletion. If the call-graph review surfaces a reader that genuinely needs runtime mutability we did not anticipate, classify the attempt (keep/quarantine/revert) before broadening — do not stack new mechanism on a failed deletion.

---

## Phase 2 — Provenance manifest + fingerprint (each report knows)

**Goal:** every new report embeds code/prompt/config provenance + a fingerprint; key fields denormalized onto the Job.

- Build `ProvenanceStub` during context assembly (hashes known pre-run) and finalize `meta.provenance` + `fingerprint` in the runner after `entry()` returns.
- **Record the `environment` block + resolved model ids (per Codex review).** `meta.provenance.environment` = current-date, active search providers, search/SR cache state, and **alias→concrete model resolution** (`model-resolver.ts:58`). The fingerprint uses **resolved concrete model ids** (so `*-latest`/tier drift changes it) but **excludes** the environment axes (else date alone breaks all matches). The fingerprint is a **setup fingerprint**, not a full-reproducibility token (Architecture §6.3).
- Add `PipelineFingerprint`, `ConfigEffectiveHash` columns to `JobEntity`; extract in `JobService` (same pattern as `promptContentHash`).
- Retire `config-snapshots.ts` / `job_config_snapshots` once the inspector reads embedded provenance. **Pre-deletion check done (2026-06-04):** the only runtime consumer of `getConfigSnapshot` is the read-only admin display route `apps/web/src/app/api/admin/quality/job/[jobId]/config/route.ts` — there is **no reanalysis/re-run path** depending on it, so deletion is safe and that route is exactly what the new inspector replaces. (`captureConfigSnapshot` in `calibration/runner.ts:314` is an unrelated local symbol.)
- Add the read-only inspector endpoints (`/effective/{variantId}`, `/provenance/{jobId}`, `/variants`), superseding the admin quality-config display route above.

**Exit gate:** provenance/hash/fingerprint contract tests pass; a stubbed run yields a well-formed `meta.provenance`; legacy reports (no provenance) still read; Job columns NULL-safe. Build + `npm test` green.
**Reviewer:** light review on the schema/migration.

---

## Phase 3 — Prove add/remove/replace with a real second variant + end-to-end per-job selection

**Goal:** demonstrate the registry under load with a genuine second variant and full per-job selection. **Prompts = Option A (wholesale per-variant)** this phase — no section-merge machinery (per the 2026-06-04 `/debate` MODIFY verdict; Architecture §4.3a).

- **G1 resolved (2026-06-04):** the population is the five historical tags (Architecture §3.3) — all code-divergent historical rebuilds ⇒ Option A wholesale, Option B dropped (Phase 3b). No table to draft; the heavy rebuilds are Phase 3c.
- Generalize `prompt-loader` to **profile-keyed wholesale** (`prompts/<profile>/…`, each profile self-contained); make the current file the `default` profile (lowest-churn option). **Do NOT build the section-merge resolver or base-optional inheritance.**
- Register a **cheap smoke-test second variant** first — a config-only A/B (`claimboundary` code + an override changing `modelVerdict`/`llmProvider`): no new stage code, immediately exercises config-override + provenance-diff + the shared `ClaimContract`, and de-risks the dispatch/provenance plumbing **before** the expensive historical module builds in Phase 3c.
- Document **Option A's prompt edit story** (the Validator caveat / E7 parity): how a wholesale profile is edited, committed, and recovered — and that dirty-tree edits are flagged (`+wt8`) but not reconstructable, so commit-first discipline applies to prompts as to code.
- Minimal UI variant selector on submission (or API-only initially).

**Exit gate:** two variants resolvable, dispatchable, distinguishable by fingerprint; provenance diff shows exactly the overridden config keys + identical `stage1.logicFingerprint` (same claim-selection logic). Safe tests green. **First optional live gate:** a tiny Captain-approved A/B on Captain-defined inputs to confirm the override changes behavior end to end (commit-first, runtime-refresh).
**Reviewer:** **required** for the prompt-profile change (prompt-system-adjacent) and the model-override A/B design.

---

## Phase 3b — (DROPPED for the current population) Section base+override for prompts (Option B)

**Status 2026-06-04: NOT scheduled.** G1 is resolved — the population is five **code-divergent historical rebuilds** (Architecture §3.3) whose downstream prompts are carried wholesale, with Stage-1 prompt sharing handled by the hoist (Phase 0b), not by section merge. There is no section-sharing need, so Option B is not built. The spec below is retained only as the recipe for a *future* population that does need section sharing.

**Would run only if** a future variant population shows genuine section-level divergence across variants (not config/model-only, not historical-rebuild). Otherwise **skip permanently** — A is sufficient.

- Build the **section-merge resolver** (`effectiveSection[name] = override[name] ?? base[name]`, whole-section replacement only — no partial/append merge).
- Build the **section-presence/completeness validator** FIRST (the debate's key finding): assert every *required* section is present in the merged result, not merely well-formed — catches a variant silently dropping a base section (e.g. the neutrality/language directive) that would still render valid schema. Base-optional is not declared safe until this exists.
- Extend provenance with `overriddenSections` + effective section hashes; route base-section edits through the AGENTS prompt-review + LLM-Expert gate, scoped to inheriting variants.
- Aligns with / may fold into the Prompt Split plan ([2026-04-20](2026-04-20_Prompt_Split_Plan.md)). Because A = B-with-no-base, existing wholesale profiles need no rework.

**Reviewer:** **required** (prompt-system + new coherence guard).

---

## Phase 3c — Historical variant build-out (3 selected tags)

**Goal:** rebuild each selected tag as an in-tree variant = **tag X's Stages 2–5**, fed by HEAD's claim-selection logic (Architecture §3.3). **Scope (Captain 2026-06-04): three tags** — `quality_before_decline` (`d3ad26ca`, pre-decline baseline), `Quality_Top_Peak` (`b7783872`, peak), `2before_bol_fix` (`d528b62c`, recent). The other two tags (`Deployed_6.Apr`, `deployed_22.4`) are **deferred** — addable later via a registry entry + module with no foundation rework. All three are **code-divergent** vs HEAD (42 / 21 / 16 analyzer files), so each is a genuine module, not override-only.

Per variant (do one end-to-end first, then template the rest):
- **Scope the era's Stages 2–5** — diff `apps/web/src/lib/analyzer` (research/boundary/verdict/aggregation only — Stage 1 is excluded, pinned to HEAD) between HEAD and the tag; identify the behaviors to reproduce.
- **Build the module** under `variants/<id>/` implementing those Stages 2–5 on today's shared infra; register it (binding + manifest row).
- **Pin the era's downstream prompt** as a wholesale profile (Option A) and the era's **config delta** as `X.effective − current.base` (computed from the tag's files; Architecture §8).
- **ClaimContract adapter** — map HEAD's claim shape to what that era's Stages 2–5 expected (structural only).
- **Provenance** records `variantId`, the HEAD `stage1.logicFingerprint` (same across variants), this run's `claimContractHash`, the downstream prompt/config hashes, and the fingerprint.

**Exit gate (per variant):** resolvable + dispatchable; produces a report; fingerprint distinct; provenance shows the HEAD `stage1.logicFingerprint` (identical to other variants) + the era's downstream deltas. Safe tests green. **Live runs Captain-gated** (commit-first, Captain-defined inputs).
**Reviewer:** **required** (each module re-implements analysis behavior — cross-stage). Sequence-aware: reuse the first module's pattern; this is the largest build effort.

> **Note — effort honesty:** this is the bulk of the work — three code-divergent eras = three module rebuilds. The registry/UCM/provenance/pre-stage foundation (Phases 0–3) makes each rebuild a *bounded, comparable* unit but does not make the re-implementation free. Suggested order: build **`Quality_Top_Peak`** first (the peak — the most valuable comparator and the pattern-setter), then `2before_bol_fix`, then `quality_before_decline`. Re-evaluate before adding the two deferred tags.

---

## Phase 4 — Matrix run + comparison view

**Goal:** one input → N variants → N reports + side-by-side comparison. All arms use the **same HEAD claim-selection logic** (Architecture §3.3); **optionally** run Stage 1 once and share claims across arms to also remove claim variance as a confound (cheaper; not required).

- `POST /v1/analyze/matrix` creates N jobs sharing `MatrixRunId`/`InputGroupId`; add the two nullable columns. Support a `shareClaims` flag: if set, resolve Stage 1 once and inject the same `ClaimContract` into all arms; else each arm runs HEAD Stage 1 itself.
- `GET /v1/matrix/{matrixRunId}` aggregates arm summaries + provenance.
- Comparison view: verdict/truth/confidence deltas, evidence-pool overlap, provenance diff across arms (asserts identical `stage1.logicFingerprint`; flags whether `claimContractHash` matched). Reuse diag intuition (`compare-evidence-pools.cjs`, `verdict-direction-instability.cjs`).
- State credit accounting explicitly (N arms = N units; shared-claims mode incurs only **one** Stage-1 extraction cost).

**Exit gate:** matrix submission creates N correctly-tagged jobs sharing one `stage1.logicFingerprint` (and one `claimContractHash` when `shareClaims` is set); comparison view renders from real local reports; provenance diff correct. Safe tests green.
**Reviewer:** light review on the new API surface.

---

## Phase 5 — Inspector UI + documentation

- Read-only inspector UI over the Phase-2 endpoints (effective config with overridden keys highlighted; prompt + hashes; fingerprint; matrix provenance diff).
- Update the **stale** "Pipeline Variants" xWiki (`Docs/xwiki-pages/…/Deep Dive/Pipeline Variants/WebHome.xwiki`) — it still documents the removed `monolithic_dynamic`/`orchestrated` variants; replace with the registry/manifest/override/provenance model.
- Update `AGENTS.md` Configuration Placement + UCM pointers (config is now file-authoritative; DB removed).
- **Reconcile residual refactor streams** in `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md`: WS‑1–4 (analyzer/pipeline) are already complete. **WS‑6 (admin config page decomposition) is superseded** — Phase 1 deletes the config editing UI — close it as obsolete. **WS‑5 (job report page) and WS‑7 (admin route boilerplate)** lightly overlap this phase's UI work; absorb opportunistically or leave deferred.

**Exit gate:** docs match code; inspector renders for a real report; WS‑6 closed as superseded.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Config DB removal misses a runtime reader | Medium | Phase 1 wraps existing `loadXConfig` (return shape preserved) before deleting internals; required call-graph review; revert-classify if a real need surfaces |
| In-stage global config read silently bypasses a variant override | **High (correctness)** | ~20 analyzer-stage config reads currently hit the global/active config (found 2026-06-04). Stages 2–5 must read the variant's effective config (`ctx.effectiveConfig` or pass variant id, not `"default"`). Phase 1 config-threading refactor + override-propagation exit-gate test; reviewer checks the in-stage sites. Harmless until Phase 3c (a variant actually sets an override) — but must land before then. |
| Hardcoded prompt profile silently bypasses a variant's prompt | **High (correctness)** | 24 `loadAndRenderSection("claimboundary", …)` sites (Codex review). Thread the profile from the run context; Stage-1 sections → HEAD profile, Stages-2-5 → variant profile; bind by call-site, not section name. Same Phase-1 refactor + a prompt-profile-propagation test. |
| API can't read `apps/web/configs/variants.json` (+ `configs/*.default.json`) in prod | **Medium/verify (blocking for variant validation)** | C# API reading a file under `apps/web/` is a cross-app path dep (Codex). Prove the deployed layout makes it readable, or relocate the manifest to a shared path / inject the allowlist at build/startup. Resolve before Phase 0 ships validation. |
| Equal fingerprints behave differently due to environment | Medium | Fingerprint is a *setup* fingerprint; env axes (date, search-provider availability, search/SR cache, alias→concrete model) are recorded in `meta.provenance.environment` and excluded from it. Comparisons must diff `environment` before attributing to variance. (Architecture §6.3) |
| Adapters extend the existing deterministic substring matching | Low/guardrail | Pre-existing lowercased substring anchor match at `aggregation-stage.ts:158`. The `ClaimContract` adapter + config/prompt threading must be structural-only; do NOT extend that pattern (AGENTS LLM-intelligence rule). |
| API-side commit hash unavailable in prod | Low | `AppBuildInfo` runs git from `AppContext.BaseDirectory` (`:170`) — may not be a git checkout when deployed. Report-side provenance uses the **web** commit (captured at run); the API `GitCommitHash` is a separate, best-effort field. Don't make provenance depend on the API-side git result. |
| API ↔ web manifest divergence | Low | Single shared `configs/variants.json`; manifest↔registry drift test; both deployed from same repo |
| Provenance bloat in `ResultJson` | Low | Embed effective config (small) + hashes; prompt text by reference (git), not embedded |
| "Does the same" misread as bit-exact | Medium | Spec states behavioral parity within benchmark bands; fingerprint = "same setup," not "same output" |
| Variant id reuse breaks comparability | Medium | Rule: replace = new id + deprecate; never mutate an id's behavior; enforced by review, not code |
| Scope creep into pipeline rewrite | Medium | This track is orchestration/config/provenance only; stage internals untouched; `analyzer-v2` is just another future registry entry |
| Editing a base file silently shifts all variants | Low/accepted | Intended (moves the baseline); reproducible-by-record via per-report effective hashes; surfaced in inspector |
| Matrix run cost surprise | Medium | Explicit N-units accounting; live matrix runs are Captain-gated |
| Matrix arms diverge if config edited mid-run | Medium | Resolve+pin effective config for all arms at submission (Spec §6.1); else warn against edits in-flight + provenance diff catches it after the fact |
| Prod runtime does not read bundled `configs/*.json` from fs | Low/verify | The whole "files authoritative" model rests on the running process reading `configs/*.json` from its filesystem in every deploy target. The long-running in-process runner makes this expected, but **confirm prod bundles + reads the files** (a serverless target would not by default). If it holds, this also *removes* the recurring prod `config.db` reseed pain — a net win to state. |
| Dirty-tree prompt edit unrecoverable | Low/accepted | Prompt stored by hash+git reference, not embedded (Arch §6.4); reconstruction guaranteed only under commit-first discipline; `+wt8` flags dirty runs; embedding is an additive fallback if portability is later required |
| Silent missing-section hole under prompt Option B | Medium (deferred) | The 2026-06-04 `/debate` key finding: once a base is optional, a variant that *drops* a base section (e.g. neutrality/language directive) still renders valid schema — whole-section-replace + render/schema tests do NOT catch it. **Gated:** Option B is not built until a section-presence/completeness validator exists (Phase 3b). Phase 1 ships Option A (wholesale), where this hole cannot occur. |
| G2 (prod file-read) / G3 (matrix config-timing) left open with no closure plan | Medium | Validator caveat. **Owners/SLAs:** G2 verified during Phase 1 (confirm the deploy target bundles+reads `configs/*.json`); G3 closed in Phase 4 by pinning effective config for all arms at submission. Both tracked as explicit phase exit items, not left dangling. |

---

## Verification summary

- **Safe, every phase:** `npm test`, `npm -w apps/web run build`, focused contract tests, `git diff --check`.
- **Live/expensive (gated):** only Phase 3 A/B and Phase 4 matrix, with Captain-defined inputs, commit-first, runtime-refresh, fail-fast on 3-job clear regression. Compare against `Captain_Quality_Expectations.md`, `benchmark-expectations.json`, `report-quality-expectations.json`.
- **Indexing:** run `npm run index` after any bulk file moves under `Docs/AGENTS/Handoffs/` or `apps/web/src/lib/analyzer/`.

---

## Sequencing rationale

Phase 0 establishes the seam with zero behavior risk. Phase 1 (UCM rework) is done before provenance so that provenance captures the *new* file-backed effective config, not the soon-deleted DB snapshot. Phase 2 makes reports self-describing — the prerequisite for any meaningful comparison. Phase 3 proves the whole loop with one real variant before investing in the matrix UI. Phase 4 adds comparison once there is something to compare. Phase 5 closes docs/UI last, when contracts are stable.

The first three phases deliver the core asks (parallel-capable variants, file-authoritative layered UCM, self-describing reports) without any live spend; the rebuild-an-old-variant workflow (Architecture §8) is usable as soon as Phase 3 lands.

**Prompt sharing (2026-06-04 `/debate`, verdict MODIFY; then G1 resolved):** prompts ship as **Option A (wholesale per-variant)**. With G1 now answered — the population is five code-divergent historical rebuilds (Architecture §3.3) — Option B / Phase 3b is **dropped** (no section-sharing need; Stage-1 sharing is handled by the Phase-0b hoist, not by prompt merge). B remains a documented recipe only for a hypothetical future population that needs it.

**Stage-1 logic pinned to HEAD (Captain constraint):** Phase **0b** extracts claim generation + selection into a shared HEAD-pinned component so every variant uses the **same claim-selection logic** (not necessarily the same claims — run-to-run variance is accepted). This reshapes the variant boundary to Stages 2–5. The real build effort is **Phase 3c** (three Captain-selected module rebuilds, from five candidate tags) — bounded and made comparable by the Phase 0–3 foundation, but not free; build `Quality_Top_Peak` first as the pattern-setter.
