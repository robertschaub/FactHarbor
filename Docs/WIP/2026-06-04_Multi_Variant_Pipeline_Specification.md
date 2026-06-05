# Multi-Variant Pipeline — Specification

> **⚠ STATUS 2026-06-04 — DEFERRED / DECOUPLED CAPABILITY.** Near-term work pivoted to the worktree-native study ([`..._Worktree_Study_Plan.md`](2026-06-04_Pipeline_Era_Comparison_Worktree_Study_Plan.md)). This spec stays as the design for the deferred in-tree capability; revive only if forward variant testing is wanted.

**Date:** 2026-06-04
**Role:** Lead Architect
**Status:** Proposal / draft for review — no code changed
**Companion docs:** [Architecture](2026-06-04_Multi_Variant_Pipeline_Architecture.md) · [Implementation Plan](2026-06-04_Multi_Variant_Pipeline_Implementation_Plan.md)

This document specifies the concrete contracts. Names are logical; implementation may refine exact symbol names but not the contract shape. All file paths are relative to repo root unless noted.

> **Settled decisions:** see the **Locked decisions** block at the top of the [Architecture](2026-06-04_Multi_Variant_Pipeline_Architecture.md). This spec realises those decisions; it does not reopen them.

---

## 1. Variant registry

### 1.1 Declarative manifest — `apps/web/configs/variants.json`

Read by **both** the C# API (submission allowlist) and the web runner (dispatch metadata). Editable by agents/users.

```jsonc
{
  "schemaVersion": "1.0",
  "defaultVariant": "claimboundary",
  "variants": [
    {
      "id": "claimboundary",                 // stable, kebab/lower; never reused for different behavior
      "title": "ClaimAssessmentBoundary",
      "description": "Production 5-stage CB pipeline.",
      "status": "active",                    // "active" | "experimental" | "deprecated"
      "promptProfile": "default",            // resolves to prompts/<profile>/ (see §3)
      "configOverrideFile": null,            // null = pure base set
      "introducedCommit": null               // optional provenance hint
    }
  ]
}
```

**Validation rules**
- `id` unique, matches `^[a-z0-9][a-z0-9-]*$`.
- `status: "active"` ⇒ must have a registry binding (§1.2) or startup fails fast.
- `defaultVariant` must reference an `active` id.
- `promptProfile` must resolve to an existing profile (§3); `configOverrideFile` (if set) must exist and parse.
- A drift test asserts every `active`/`experimental` manifest id has exactly one registry binding and vice-versa.

### 1.2 Code binding — `apps/web/src/lib/analyzer/variants/registry.ts`

```ts
export interface VariantEntry {
  (ctx: PipelineRunContext): Promise<PipelineRunResult>;
}

// id → entry function. The ONLY part that cannot live in JSON.
export const VARIANT_ENTRIES: Record<string, VariantEntry> = {
  claimboundary: runClaimboundaryVariant,   // thin adapter over existing runClaimBoundaryAnalysis
};

export function resolveVariant(id: string): { manifest: VariantManifestRow; entry: VariantEntry };
export function listActiveVariantIds(): string[];           // from manifest, status active|experimental
```

**Adding a variant** touches: a module under `variants/<id>/`, one line in `VARIANT_ENTRIES`, one row in `variants.json`, a prompt profile, optional override file. No edits to the orchestrator, the runner loop, or stage code.

### 1.3 Stable entry contract

A variant owns **Stages 2–5 only**. Stage 1 (claim generation + Gate 1 + selection) is a **HEAD-pinned shared component** run by the dispatcher/context-builder (§1.4); the run's `ClaimContract` is delivered to the variant. The pinned thing is the Stage-1 *logic*, not the claim output.

```ts
interface PipelineRunContext {
  jobId: string;
  variantId: string;
  input: { type: "text" | "url" | "pdf"; value: string };
  currentDateUtc: string;                // injected, not Date.now() inside stages
  claimContract: ClaimContract;          // §1.4 — claims from HEAD's pinned Stage-1 LOGIC (this run); variant must NOT re-extract/override selection
  effectiveConfig: EffectiveConfig;      // §2 — already merged + validated (downstream config)
  prompt: PromptProfileHandle;           // §3 — loader bound to this variant's downstream profile
  modelPolicy: ModelPolicy;              // derived from effectiveConfig.pipeline
  provenance: ProvenanceStub;            // §4 — code/prompt/config/claimContract hashes, pre-fingerprint
  onEvent: (e: PipelineEvent) => void;   // existing progress callback
}

interface PipelineRunResult {
  resultJson: object;                    // report; runner injects meta.provenance + fingerprint
  reportMarkdown: string;
  // verdict/truth/confidence remain inside resultJson (denormalized by API as today)
}
```

The current `runClaimBoundaryAnalysis(input: AnalysisInput)` (`claimboundary-pipeline.ts:632`) is split: its Stage 1 becomes the shared pre-stage (§1.4); its Stages 2–5 become the `claimboundary` variant entry `runClaimboundaryVariant(ctx)`, which consumes `ctx.claimContract` and `ctx.effectiveConfig` (replacing the in-orchestrator `loadPipelineConfig`/`loadSearchConfig`/`loadCalcConfig` at lines ~638–642 and the in-line claim extraction). **Stage 2–5 signatures are unchanged** — they still receive immutable config + claims; only the *source* changes.

### 1.4 Stage 1 pinned to HEAD — same logic, not necessarily same claims [confirmed 2026-06-04]

- Stage 1 — claim generation (incl. preliminary-grounding search), Gate 1, and final selection — runs at **HEAD** code/prompt/config for **every** variant. Its **logic is pinned**; the selected claims are **not required identical** across variants (claim extraction is a nondeterministic LLM step — run-to-run variance is accepted). The dispatcher runs Stage 1 (so the variant module contains only Stages 2–5 and cannot drift the logic) and injects the resulting `ClaimContract`.
- **`ClaimContract` payload (corrected per Codex review):** not just `{understanding, languageIntent, selectedClaims, gate1}`. It carries the **full post-selection `CBClaimUnderstanding`** + `languageIntent` + preliminary evidence/seeds + distinct-events + inferred geography/language + Gate-1 stats + selection metadata (selected IDs + finality) — because research/boundary/aggregation read these (`research-orchestrator.ts:484, :1171`; `boundary-clustering-stage.ts:109`; `aggregation-stage.ts:476`). The canonical contract is **immutable** (it is what `claimContractHash` hashes); the variant gets a **mutable working copy**. The split must snapshot the *post-selection* `understanding` (selection mutates it at `claimboundary-pipeline.ts:891`).
- The control marker recorded on every report (§4) is `stage1.logicFingerprint = sha256(HEAD Stage-1 code+prompt+config)`. The per-run `claimContractHash` is also recorded but is **not** expected equal across variants.
- **Matrix runs (optional optimization):** Stage 1 *may* be run once per `inputGroupId` and the same `ClaimContract` shared across arms — cheaper, and removes claim variance as a confound. Not required; per-arm extraction is equally valid. Record `stage1.sharedOnce`.
- **Per-variant ClaimContract adapter:** a rebuilt historical variant's Stages 2–5 may expect an older claim shape; each variant module includes a structural adapter from HEAD's `ClaimContract` to its expected input (structural plumbing, no semantic re-interpretation).
- Stage-1 prompt sections and Stage-1 config are HEAD-pinned and **never** in a variant's override scope.

---

## 2. UCM config resolution

### 2.1 Files

| File | Role |
|---|---|
| `apps/web/configs/pipeline.default.json` | Base set — pipeline |
| `apps/web/configs/search.default.json` | Base set — search |
| `apps/web/configs/calculation.default.json` | Base set — calculation |
| `apps/web/configs/sr.default.json` | Base set — source reliability |
| `apps/web/configs/variants/<id>.override.json` | Per-variant sparse override (any subset of the four types) |

### 2.2 Resolution algorithm

```
resolveEffectiveConfig(variantId):
  base   = { pipeline, search, calculation, sr }  // read each *.default.json (cached by mtime)
  ovr    = readOverride(variantId) or {}          // configs/variants/<id>.override.json
  for type in [pipeline, search, calculation, sr]:
     merged[type] = deepMerge(base[type], ovr[type] or {})   // objects merge by key; arrays + scalars REPLACE
     effective[type] = ConfigSchema[type].parse(merged[type])  // Zod validate → throw on invalid
  hashes = {
     baseHashes:      { type -> sha256(canonicalJSON(base[type])) }
     overrideHash:    ovr present ? sha256(canonicalJSON(ovr)) : null
     effectiveHashes: { type -> sha256(canonicalJSON(effective[type])) }
     overriddenKeys:  { type -> keyPaths(ovr[type]) }          // dot-paths actually overridden
  }
  return { effective, hashes }
```

- **Deep-merge rule:** plain objects merge recursively by key; **arrays and scalars are replaced** by the override (predictable, no accidental concatenation). This rule is identical for all four types.
- Resolution is **structural plumbing** — no semantic text interpretation — so it complies with the AGENTS.md LLM-intelligence rule.
- Invalid override (unknown key, wrong type, schema violation) ⇒ resolution throws ⇒ job fails fast with a clear message naming the offending key. No silent fallback to base for a malformed override.
- **Caching:** cache base files by `(path, mtime, size)`; invalidate on change. No 30s/5min DB pointer/content TTLs (those belonged to the removed DB path). This makes agent/user file edits take effect on next job without a reseed step.

### 2.3 Replaces

- `config-loader.ts` `loadPipelineConfig` / `loadSearchConfig` / `loadCalcConfig` keep their **return shape** (`{ config, contentHash }`) but become thin wrappers over `resolveEffectiveConfig(variantId)[type]` — minimizing call-site churn — then the DB internals are deleted.
- `config-storage.ts` tables `config_blobs`, `config_active`, `config_usage` and their read/write/activation/history/rollback APIs are **removed** (`config-storage.ts:719, :891` et al.). `initializeDefaultConfigs()` (DB seeding) is removed.
- **Blast radius is larger than `loadXConfig` (expanded per Codex review)** — the removal also touches: admin config write/activate/history routes; the **job-level config + prompts endpoints** (`apps/web/src/app/api/fh/jobs/[id]/configs/route.ts:27`, `.../prompts/route.ts:31`); the **admin config editing UI** (`apps/web/src/app/admin/config/page.tsx`, ~3000+ lines); and the config drift/storage **tests**. Each is either deleted or re-pointed to the read-only inspector (§7). This is the phase's review focus.
- `config-snapshots.ts` / `job_config_snapshots` is **superseded** by embedded provenance (§4): remove both the read path (admin quality-config route) **and the write call** `captureConfigSnapshotAsync` at `claimboundary-pipeline.ts:656` (+ `config-snapshots.ts:71`).
- TS `DEFAULT_*_CONFIG` constants and `config-drift.test.ts` are **kept** (Zod defaults + fallback + parity guard); see Architecture §4.4.

---

## 3. Prompt profiles

Decided by the 2026-06-04 `/debate` (verdict MODIFY) — see Architecture §4.3a. **Phase 1 = Option A (wholesale per-variant); Option B (section base+override) is gated.**

### 3.1 Phase 1 — wholesale per-variant (Option A)

- Layout: `apps/web/prompts/<profile>/<name>.prompt.md`. The current `apps/web/prompts/claimboundary.prompt.md` becomes the `default` profile (either by moving it to `prompts/default/claimboundary.prompt.md` or by treating a flat file as profile `default` — Plan picks the lowest-churn option).
- Each variant's profile is a **complete, self-contained set of prompt files** — no inheritance, no merge. A new variant copies (or authors) a full profile.
- `PromptProfileHandle` wraps the existing `prompt-loader.ts` (`loadAndRenderSection`, `hashContent`) **bound to a profile**, so a variant only ever sees its own profile's prompts. `promptContentHash` per file is computed exactly as today (SHA-256, `prompt-loader.ts:498`).
- **Prompt-profile threading (correctness prerequisite — found by Codex review, parallel to config-threading).** There are **24 hardcoded `loadAndRenderSection("claimboundary", …)` call sites** across the analyzer stages (e.g. `research-query-stage.ts:181`, `research-extraction-stage.ts:116/279/512`, `scope-normalization.ts:133`, `boundary-clustering-stage.ts:280`, `verdict-generation-stage.ts:406`, `aggregation-stage.ts:718/869`, plus the Stage-1 sections in `claim-extraction-stage.ts`/`claim-selection-recommendation.ts`). These hardcode the profile, so a variant's prompt profile would be ignored. Each must resolve its profile from the run context — and the **Stage-1/Stages-2-5 split applies to prompts too**: Stage-1 sections (`CLAIM_EXTRACTION_*`, `CLAIM_SELECTION_*`, `CLAIM_CONTRACT_*`, `CLAIM_VALIDATION`, the Stage-1 `EXTRACT_EVIDENCE` at `claim-extraction-stage.ts:2019`) load from the **HEAD** profile; Stages-2-5 sections load from the **variant** profile (`ctx.prompt`). Note `EXTRACT_EVIDENCE` exists in both stages (`claim-extraction-stage.ts:2019` vs `research-extraction-stage.ts:279`), so binding must be by call-site/stage, not by section name.
- Prompts loaded **directly from files** (files authoritative); the DB-backed prompt seeding/reseed path is removed with the rest of the config DB.
- Prompt content edits still require explicit human approval + LLM Expert review (AGENTS.md) — unchanged.

### 3.2 Gated — section base + override (Option B)

Build **only after both gate conditions hold** (Architecture §4.3a):
1. **G1 pinned** — a variant-population table shows genuine section-level divergence (not config/model-only). If config/model-only, B is never built.
2. **Section-presence validator exists** — closes the gap the debate surfaced: a merged prompt must assert *every required section is present*, not merely well-formed. (Whole-section replacement catches malformed sections; a render/schema test catches malformed renders; **neither catches a silently-dropped base section** — e.g. an omitted neutrality/language directive that still renders valid schema.)

When built: base profile = the full section set; a variant override supplies **whole-section replacements only** (no partial/append merge — avoids additive-repair-drift). Resolution: `effectiveSection[name] = overrideSection[name] ?? baseSection[name]`. Editing a base section = a cross-variant prompt change → AGENTS prompt-review + LLM-Expert gate, scoped to inheriting variants. Aligns with the existing Prompt Split direction ([2026-04-20](2026-04-20_Prompt_Split_Plan.md)). Because A = B-with-no-base, the A→B move adds the resolver + validator without reworking existing wholesale profiles.

---

## 4. Provenance manifest and fingerprint

### 4.1 Report embedding — `ResultJson.meta.provenance`

Exact shape per Architecture §6.2. Built by the **runner** after `variant.entry()` returns, from the `ProvenanceStub` (hashes known pre-run) + resolved model map + commit. Written into `resultJson.meta.provenance` before persistence.

### 4.2 Fingerprint

```
fingerprint = sha256(canonicalJSON({
  variantId,
  codeCommit:       provenance.code.executedWebGitCommitHash,
  stage1Logic:      provenance.stage1.logicFingerprint,   // pinned HEAD claim-selection logic (NOT the claim output)
  promptHashes:     sortedContentHashes(provenance.prompt.files),  // variant-owned downstream sections
  effectiveHashes:  provenance.config.effectiveHashes,
  models:           provenance.models      // RESOLVED CONCRETE model ids (post-alias) — captures `*-latest`/tier drift
}))
```
`canonicalJSON` = stable key ordering, no insignificant whitespace. Deterministic given the tuple. It is a **setup fingerprint**: it uses `stage1.logicFingerprint` (not the per-run `claimContractHash`, so claim variance is not a setup difference) and resolved concrete model ids, and it **excludes** environment axes (current-date, search-provider availability/keys, search/SR cache state) which are recorded separately in `provenance.environment` (Architecture §6.2) for diagnosis. Equal fingerprints ⇒ same setup; check `environment` before attributing an output difference to pure variance. Must match Architecture §6.3.

### 4.3 API persistence — `JobEntity` columns

| Column | Status | Source |
|---|---|---|
| `PipelineVariant` | exists | submission |
| `ExecutedWebGitCommitHash` | exists | runner (`build-info.ts`) |
| `PromptContentHash` | exists | primary prompt file (back-compat) |
| `PipelineFingerprint` | **new** | `meta.provenance.fingerprint` |
| `ConfigEffectiveHash` | **new** | hash over `meta.provenance.config.effectiveHashes` |
| `MatrixRunId` | **new (nullable)** | matrix runs (§6) |
| `InputGroupId` | **new (nullable)** | matrix runs (§6) |

Extraction follows the existing pattern in `JobService.cs` (~lines 189–199) that reads `promptContentHash` out of `ResultJson.meta`. Columns are additive; historical rows keep NULL and remain readable.

### 4.4 Compatibility

- New `meta.provenance` is additive; existing `meta` fields (`pipeline`, `modelsUsed`, `searchProvider`, `promptContentHash`, `_schemaVersion`) are retained for back-compat. Diag scripts that read `ExecutedWebGitCommitHash` / `PromptContentHash` keep working and may additionally read `PipelineFingerprint`.

---

## 5. Submission & dispatch

### 5.1 API — `apps/api/Controllers/AnalyzeController.cs`

- `CreateJobRequest.pipelineVariant` validated against `listActiveVariantIds()` sourced from `configs/variants.json` (replace the hardcoded `["claimboundary"]` allowlist ~line 57). Default = manifest `defaultVariant`.
- **Retry path too (found by Codex review):** `JobsController.RetryJob` (`:206`/`:245`) accepts `pipelineVariant` with **no allowlist validation today** — apply the **same** validation there. Both acceptance surfaces (create + retry) must validate.
- Unknown/inactive id ⇒ 400 with the list of valid ids.
- **API ↔ web sync:** the API reads `configs/variants.json` directly (same repo). ⚠️ **Deployment-path caveat (Codex):** the C# API reading a file under `apps/web/configs/` is a *cross-app* path dependency — it must be proven readable in the **deployed** layout, not just dev. If the prod layout separates the apps, relocate the manifest to a shared path or inject the allowlist into the API at build/startup. Resolve before Phase 0 ships variant validation. (Same concern as the `configs/*.default.json` file-read gate — Plan risk register.)

### 5.2 Runner dispatcher — `apps/web/src/app/api/internal/run-job/route.ts` + queue

- Request shape (`{ jobId }`) unchanged; concurrency (`FH_RUNNER_MAX_CONCURRENCY`) unchanged.
- On drain, read the job's persisted `pipelineVariant`; `resolveVariant(id)`; build `PipelineRunContext` (resolve effective config, bind prompt profile, derive model policy, assemble provenance stub); call `entry(ctx)`; stamp provenance + fingerprint; persist.
- Unknown id at run time (e.g., variant removed after submission) ⇒ job fails with a clear, user-visible error (it does not silently fall back to default — that would misattribute provenance).

---

## 6. Matrix run (one input → N variants)

### 6.1 Model

- A matrix run = N ordinary jobs sharing `MatrixRunId` and `InputGroupId` (identical input across arms), each with a distinct `pipelineVariant`.
- Submission: `POST /v1/analyze/matrix` `{ inputType, inputValue, variants: [id…], inviteCode }` → creates N jobs, returns `{ matrixRunId, jobIds[] }`. Each child flows through the **identical** single-job dispatch path (no special-casing).
- Invite/credit accounting: N jobs consume N units (state explicitly; no hidden discount).
- **Two matrix-fairness levers (both optional, independent):** (a) **pin config** — resolve and pin each arm's effective config + hashes at submission so a mid-run file edit can't make arms diverge (else warn against edits in-flight; the provenance diff surfaces drift after the fact); (b) **share claims** — the Stage-1 `shareClaims` option (§1.4): run Stage 1 once and inject the same `ClaimContract` into every arm, removing claim variance as a confound. Neither is required for correctness (each arm always uses the same Stage-1 *logic*); both tighten attribution when you want it.

### 6.2 Comparison view

- Read endpoint: `GET /v1/matrix/{matrixRunId}` → the N job summaries + their `meta.provenance`.
- The view renders, per arm: verdict / truthPercentage / confidence; evidence-pool overlap; warnings; and a **provenance diff** highlighting which axes differ (code commit, prompt hashes, overridden config keys, model map). The provenance diff is the interpretive key: it distinguishes "verdict differs because of the axis under test" from "verdict differs because of an unrecorded confound."

---

## 7. Read-only config inspector

Replaces the editing/versioning surface under `apps/web/src/app/api/admin/config/`.

| Endpoint | Method | Returns |
|---|---|---|
| `/api/admin/config/effective/{variantId}` | GET | resolved effective config (4 types) + `overriddenKeys` + base/override/effective hashes |
| `/api/admin/config/provenance/{jobId}` | GET | the job's `meta.provenance` + fingerprint |
| `/api/admin/variants` | GET | parsed `configs/variants.json` + which ids have registry bindings |

- **Removed:** PUT (save version), POST activate/reseed/rollback, GET history, and all editing UI. (Confirmed: no sophisticated UCM editing UI.)
- The inspector is read-only and derives everything from files + embedded provenance.

---

## 8. Contract tests (no live jobs)

| Area | Test |
|---|---|
| Manifest ↔ registry | every active/experimental id has exactly one binding and vice-versa; `defaultVariant` is active |
| Manifest validation | id regex, unique ids, override file exists+parses, prompt profile exists |
| Config resolution | deep-merge by key; array/scalar replace; invalid override throws naming the key; effective validates against Zod |
| Hash/fingerprint | deterministic canonical JSON; identical tuple → identical fingerprint; any axis change → different fingerprint |
| Provenance embedding | `meta.provenance` present and well-formed for a stubbed run; Job columns extracted correctly |
| Back-compat | legacy reports without `meta.provenance` still read; new columns NULL-safe |
| Config drift | TS `DEFAULT_*_CONFIG` parity with JSON files retained |
| Dispatcher | unknown/inactive id fails fast; persisted variant beats current default |
| Behavior parity (Phase 0) | `claimboundary` via registry == direct `runClaimBoundaryAnalysis` on the same fixture (structural equality) |

Safe verification throughout: `npm test`, `npm -w apps/web run build`, focused contract tests, `git diff --check`. Live/expensive validation only at explicit gates with Captain-defined inputs (AGENTS.md cost discipline).

---

## 9. Out of scope (this spec)

- Re-implementing or "cleaning" the analysis stages (that is the separate May-12 rebuild track; an `analyzer-v2` entry would simply register as another variant here).
- Any prompt **content** changes (require approval + LLM Expert review).
- Updating the stale "Pipeline Variants" xWiki (flagged for a docs pass).
- Process-per-variant infrastructure (rejected; see Architecture §10).
