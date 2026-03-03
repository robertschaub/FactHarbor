# UCM Defaults Alignment — Post-Deployment Quality Fix

**Filed by:** Senior Developer (Claude Code, Opus 4.6)
**Date:** 2026-03-03
**Status:** 🔧 PLANNED — Awaiting Codex Senior Developer review before implementation
**Depends on:** Deployment completed 2026-03-02 (`app.factharbor.ch` live)
**Review requested from:** Captain Deputy (DONE), Codex Senior Developer (PENDING)

---

## Executive Summary

The deployed system at `app.factharbor.ch` produces **significantly worse analysis reports** than the localhost development environment, despite identical API keys and the same codebase. Root cause: **divergence between code defaults and file defaults** for two critical verdict validation policies, causing verdicts to be forcibly downgraded to 50%/24% on the deployed system.

**Impact:** Every analysis on the deployed system is affected. Verdicts that should be "Mostly False, 80%, High confidence" instead show "Unverified, 50%, 24% confidence".

**Fix scope:** 4 files, no architectural changes. Safe to deploy.

---

## Quality Preservation Constraint (MANDATORY)

**Nothing that could degrade report quality may change relative to the current localhost behavior.** The localhost UCM settings and runtime implementation are the quality reference. The deployed system must be brought to parity — producing equal reports.

Specifically:
- **All quality-affecting UCM values** must match the current localhost runtime values exactly.
- **Model resolution** must produce the same concrete model IDs as today (`claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`, `claude-opus-4-6`). Tier aliases are allowed in config ONLY because `model-resolver.ts` already resolves them to these exact IDs.
- **No new features, no behavioral changes.** This fix is strictly about making deployed = localhost.
- **The model version map in `model-resolver.ts` is NOT touched** by this fix. Updating it (e.g., sonnet → Sonnet 4.6) is a separate decision requiring quality testing.
- **Verdict validation still runs and logs warnings** — only the downgrade action is disabled, not the detection.

---

## 1. Issues Reported

### 1.1 Deployed reports are significantly worse than localhost

**Same claim, same time, same models, same API keys** — dramatically different results:

| Metric | Localhost | Deployed (`app.factharbor.ch`) |
|--------|-----------|-------------------------------|
| Verdict | Mostly False | Unverified |
| Truth % | 20% | 50% |
| Confidence | High | 24% (Insufficient) |
| Sources | 17 | 24 |
| Evidence items | 59 | 57 |
| Quality Gates | Passed | Issues Detected |

The deployed system actually found MORE sources but produced a WORSE verdict — indicating the problem is in verdict processing, not research.

### 1.2 UCM shows "6 fields customized from defaults" on localhost

The localhost admin/config page shows "6 fields customized from defaults (5%)" for a config the user never manually changed. The 6 fields are:
- `modelExtractEvidence`, `modelOpus`, `modelUnderstand`, `modelVerdict` — hardcoded model version strings instead of tier aliases
- `monolithicDynamicTimeoutMs`, `monolithicMaxEvidenceBeforeStop` — legacy fields from removed pipeline

### 1.3 `defaultPipelineVariant` should not exist

Only one pipeline variant exists (ClaimBoundary). The field is vestigial — schema allows only `"claimboundary"`, and the value is never used for routing.

### 1.4 Model fields use specific version strings instead of tier aliases

`DEFAULT_PIPELINE_CONFIG` uses `"claude-haiku-4-5-20251001"` instead of `"haiku"`. The `model-resolver.ts` already supports tier aliases and the file defaults (`pipeline.default.json`) already use them. The code defaults are inconsistent.

---

## 2. Investigation Findings

### 2.1 Root Cause: Code defaults vs file defaults divergence

There are **two sources of defaults** in the UCM system that have silently diverged:

| Source | Used by | Location |
|--------|---------|----------|
| `DEFAULT_PIPELINE_CONFIG` (code) | Schema `.transform()` at runtime for missing fields | `config-schemas.ts:767` |
| `pipeline.default.json` (file) | Initial DB seeding on fresh deployment | `configs/pipeline.default.json` |

**Critical divergence:**

| Field | Code Default (runtime) | File Default (seeded to DB) | Impact |
|-------|----------------------|---------------------------|--------|
| `verdictGroundingPolicy` | `"disabled"` | `"safe_downgrade"` | **CRITICAL** — causes verdict downgrade |
| `verdictDirectionPolicy` | `"disabled"` | `"retry_once_then_safe_downgrade"` | **CRITICAL** — causes verdict downgrade |

### 2.2 How the divergence causes quality degradation

**On localhost (good quality):**
1. Config "clear-stale-overrides" was saved on 2/27 — does NOT contain `verdictGroundingPolicy` or `verdictDirectionPolicy`
2. At runtime, schema `.transform()` fills missing fields → `"disabled"` for both
3. Verdict validation runs but does NOT downgrade verdicts
4. Result: original "Mostly False, 80%" verdict survives

**On deployed system (bad quality):**
1. Config seeded on 3/2 from `pipeline.default.json` which HAS `verdictGroundingPolicy: "safe_downgrade"`
2. At runtime, value is `"safe_downgrade"` (from DB, not missing)
3. Verdict validation finds issues → `safeDowngradeVerdict()` triggers
4. Hard-sets: `truthPercentage = 50`, `confidence = min(original, 24)` (INSUFFICIENT_CONFIDENCE_MAX)
5. Result: "Unverified, 50%, 24%" — exactly matching the deployed screenshot

**Proof from `verdict-stage.ts:949-977`:**
```typescript
function safeDowngradeVerdict(verdict, reason, issues, warnings, mixedConfidenceThreshold) {
  const downgradedConfidence = Math.min(verdict.confidence, INSUFFICIENT_CONFIDENCE_MAX); // = 24
  return {
    ...verdict,
    truthPercentage: 50,                    // Hard-set to 50%
    confidence: downgradedConfidence,       // Capped at 24
    confidenceTier: "INSUFFICIENT",
  };
}
```

### 2.3 Evidence from localhost config.db

Direct SQLite query of the local active pipeline config blob:

```
verdictGroundingPolicy:          <MISSING>  → transform → "disabled"
verdictDirectionPolicy:          <MISSING>  → transform → "disabled"
debateModelProviders:            { "challenger": "openai" }
modelUnderstand:                 "claude-haiku-4-5-20251001"
modelExtractEvidence:            "claude-haiku-4-5-20251001"
modelVerdict:                    "claude-sonnet-4-5-20250929"
modelOpus:                       "claude-opus-4-6"
monolithicDynamicTimeoutMs:      150000     (legacy, not in schema)
monolithicMaxEvidenceBeforeStop: 8          (legacy, not in schema)
```

### 2.4 Comparison UI bug (masking the real difference)

The default-comparison endpoint (`/api/admin/config/default-comparison`) uses `mergeDefaults()` which fills MISSING fields from `pipeline.default.json` before comparing. But the runtime uses the schema `.transform()` which has DIFFERENT defaults.

Result: The UI says "only 6 fields customized" when there are actually 2 additional critical runtime differences (`verdictGroundingPolicy`, `verdictDirectionPolicy`) that are invisible because `mergeDefaults` masks them.

### 2.5 Additional divergences found (non-critical)

| Field | Code Default | File Default | Notes |
|-------|-------------|-------------|-------|
| `debateModelProviders` | not set (all inherit anthropic) | `{ "challenger": "openai" }` | Both envs have openai challenger from saved/seeded config. Not causing quality difference. |
| `maxIterationsPerContext` | 3 | 5 | Deprecated field, not enforced in ClaimBoundary pipeline |
| `sourceFetchTimeoutMs` | 20000 | not in file | Filled by transform at runtime |
| Several optional fields | set in code | missing from file | Filled by transform, no divergence at runtime |

### 2.6 Model version map note

`ANTHROPIC_VERSIONS` in `model-resolver.ts` maps `sonnet` → `claude-sonnet-4-5-20250929` (Sonnet 4.5). The code default `DEFAULT_PIPELINE_CONFIG` had `modelVerdict: "claude-sonnet-4-6"` (Sonnet 4.6). Both current environments use Sonnet 4.5. Switching to tier alias `"sonnet"` keeps current behavior. Updating the version map to Sonnet 4.6 is a **separate decision** — should be tested independently for quality impact.

---

## 3. Fix Plan

Every change below is annotated with its quality impact. The rule: **deployed system must produce identical reports to localhost after the fix.**

### 3.1 Fix verdict policies in `pipeline.default.json` (CRITICAL — fixes deployed quality)

**File:** `apps/web/configs/pipeline.default.json`

| Field | Current (file) | Localhost runtime | New (file) | Quality impact |
|-------|---------------|-------------------|------------|---------------|
| `verdictGroundingPolicy` | `"safe_downgrade"` | `"disabled"` | `"disabled"` | **Restores quality** — stops false downgrades to 50%/24% |
| `verdictDirectionPolicy` | `"retry_once_then_safe_downgrade"` | `"disabled"` | `"disabled"` | **Restores quality** — same |
| `defaultPipelineVariant` | `"claimboundary"` | n/a | **remove line** | None — field unused at runtime |

Also add missing fields (values match what localhost already runs via schema transform — **zero quality change**):
- `parallelExtractionLimit`: 3
- `understandTemperature`: 0
- `understandMinClaimThreshold`: 4
- `verdictBatchSize`: 5
- `openaiTpmGuardEnabled`: true
- `openaiTpmGuardInputTokenThreshold`: 24000
- `openaiTpmGuardFallbackModel`: `"gpt-4.1-mini"`
- `researchTimeBudgetMs`: 600000
- `researchZeroYieldBreakThreshold`: 2
- `maxIterationsPerContext`: 3 (align to code default; field is deprecated/not enforced in CB pipeline)

### 3.2 Fix model fields in `DEFAULT_PIPELINE_CONFIG` (cosmetic — zero quality change)

**File:** `apps/web/src/lib/config-schemas.ts` (lines 769-774, 870)

| Field | Current (code default) | Tier alias | Alias resolves to | Quality impact |
|-------|----------------------|------------|-------------------|---------------|
| `modelUnderstand` | `"claude-haiku-4-5-20251001"` | `"haiku"` | `claude-haiku-4-5-20251001` | **None** — same model |
| `modelExtractEvidence` | `"claude-haiku-4-5-20251001"` | `"haiku"` | `claude-haiku-4-5-20251001` | **None** — same model |
| `modelVerdict` | `"claude-sonnet-4-6"` | `"sonnet"` | `claude-sonnet-4-5-20250929` | **None at runtime** — code default is only used when NO config exists in DB. Both localhost and deployed have DB configs that already use Sonnet 4.5. See §2.6 for version map note. |
| `modelOpus` | `"claude-opus-4-6"` | `"opus"` | `claude-opus-4-6` | **None** — same model |

**Note on `modelVerdict`:** The code default `"claude-sonnet-4-6"` (Sonnet 4.6) was never actually used in production — both environments have DB configs that resolve to `claude-sonnet-4-5-20250929` (Sonnet 4.5). Changing the code default to `"sonnet"` aligns it with what actually runs. The `ANTHROPIC_VERSIONS` map in `model-resolver.ts` is **NOT changed** by this fix. Updating it to Sonnet 4.6 is a separate decision.

### 3.3 Remove `defaultPipelineVariant` from schema (zero quality change)

**File:** `apps/web/src/lib/config-schemas.ts`
- Remove schema field (lines 503-506)
- Remove from `DEFAULT_PIPELINE_CONFIG` (line 870)

**File:** `apps/web/src/components/AboutBox.tsx`
- Remove `defaultPipelineVariant` from `PipelineConfig` type (line 33)
- Remove `formatPipelineVariant` helper function (lines 56-60)

**Quality impact:** None — this field is never read by the pipeline. Only one variant exists.

### 3.4 Fix comparison endpoint to prevent future masking (zero quality change)

**File:** `apps/web/src/app/api/admin/config/default-comparison/route.ts`

Current `mergeDefaults()` fills missing fields from file defaults. Fix: parse both active config AND default config through `PipelineConfigSchema` before comparing, so the comparison reflects actual runtime-effective values.

```typescript
// In loadDefaults() function — parse through schema like runtime does
function loadDefaults(configType, fallback) {
  const content = loadDefaultConfigFromFile(configType);
  if (!content) return fallback;
  try {
    const raw = JSON.parse(content);
    if (configType === "pipeline") return PipelineConfigSchema.parse(raw);
    return raw;
  } catch { return fallback; }
}
```

Similarly, parse active config through schema before comparing:
```typescript
// Before finding differences — get runtime-effective values
const effectiveActive = configType === "pipeline"
  ? PipelineConfigSchema.parse(activeConfig)
  : mergeDefaults(defaultConfig, activeConfig);
```

**Quality impact:** None — this is a UI/admin display fix only. Does not affect the analysis pipeline.

---

## 4. Re-Deployment Procedure

### 4.1 Pre-deployment (local)

1. **Implement fixes** (§3.1–3.4)
2. **Run tests:** `npm test` (safe, no LLM calls)
3. **Build:** `npm -w apps/web run build` — verify compilation succeeds
4. **Commit:** `git add` changed files, commit with `fix(ucm): align pipeline defaults with runtime behavior`
5. **Push to main:** `git push origin main`

### 4.2 Deploy to VPS

Per `scripts/DEPLOYMENT.md` (corrected by Captain Deputy — original had wrong SSH user, wrong npm ci directory, missing static copy, missing API rebuild):

```bash
# SSH into VPS
ssh -i ~/.ssh/fh ubuntu@83.228.221.114

# Pull latest code
cd /opt/factharbor
git pull origin main

# Rebuild .NET API
cd apps/api && dotnet publish -c Release -o /opt/factharbor/deploy/api

# Rebuild Next.js (npm ci MUST run from project root — sqlite pkg is in root package.json)
cd /opt/factharbor && npm ci && npm -w apps/web run build

# Copy static assets into standalone output (required for Next.js standalone mode)
cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

# Restart services
sudo systemctl restart factharbor-api factharbor-web

# Verify
sleep 3
curl -s http://localhost:5000/health
curl -s http://localhost:3000/api/health
```

### 4.3 Post-deployment: Reset UCM config on deployed system

**Captain Deputy finding — Auto-reseed likely handles this automatically:**

`ensureDefaultConfig()` in `config-storage.ts:1205` runs at every service startup (called from `initDb()` at line 401). It checks: if the active config was created by `"system"` with label `"Initial default config"` AND content differs from the file → auto-refreshes. Since the VPS config was system-seeded during initial deployment, restarting the service after deploying the updated `pipeline.default.json` should auto-reseed.

**Verify auto-reseed worked:**
```bash
sudo journalctl -u factharbor-web --no-pager -n 30 | grep -i "refreshed\|default"
# Expected: "[Config-Storage] Refreshed default pipeline config"
```

If auto-reseed did NOT fire (e.g., config was manually edited via Admin UI, changing `created_by`), use manual reset:

**Option A — Reset via Admin UI:**
1. Go to `https://app.factharbor.ch/admin/config`
2. Select Pipeline tab
3. Click "Edit" → Delete the current config
4. The system will re-seed from the updated `pipeline.default.json` on next load

**Option B — Reset via API:**
```bash
# Delete the active pipeline config to force re-seed
curl -X DELETE "https://app.factharbor.ch/api/admin/config/pipeline/default" \
  -H "X-Admin-Key: $FH_ADMIN_KEY"
```

**Option C — Direct DB reset (if API route doesn't exist):**
```bash
# On VPS — NOTE: runtime DB is at /opt/factharbor/data/config.db (NOT apps/web/config.db)
# The apps/web/config.db is an orphan written by postbuild reseed (shell lacks FH_CONFIG_DB_PATH)
sqlite3 /opt/factharbor/data/config.db \
  "DELETE FROM config_active WHERE config_type='pipeline' AND profile_key='default';"
sudo systemctl restart factharbor-web
```

**Note on postbuild reseed:** During `npm run build`, the postbuild script seeds into `apps/web/config.db` because the build shell doesn't have `FH_CONFIG_DB_PATH` set (it's only in the systemd service env). The runtime reads from `/opt/factharbor/data/config.db`. The postbuild reseed on VPS is effectively a no-op for the production config.

### 4.4 Post-deployment: Reset localhost config (optional)

The localhost config "clear-stale-overrides" has stale hardcoded model IDs and legacy monolithic fields. After the code fix, reset to pick up clean defaults:

1. Go to `http://localhost:3000/admin/config`
2. Pipeline tab → Edit → load from defaults (or delete and let re-seed)

### 4.5 Verification

After re-deployment and config reset:

1. **Check admin/config:** Verify "Using default configuration" (green banner, 0 customized fields)
2. **Run a test analysis** with the same claim ("A person's sexual orientation is determined after birth")
3. **Compare results** — should now show strong verdicts similar to localhost (not Unverified/50%/24%)
4. **Check admin/test-config** — all services should be healthy

---

## 5. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Quality degradation from any change** | **None** | — | Every change annotated with quality impact (§3). Only quality-restoring change is verdict policies → `"disabled"` which matches proven localhost behavior. Model-resolver map untouched. |
| Verdict policies `"disabled"` removes a safety net | Low — the safety net was producing false negatives (downgrading correct verdicts), not catching real issues | Reduced integrity gating | Validation still runs and logs warnings — only downgrade action disabled. Monitor deployed results. Can re-enable per-field if genuine integrity issues emerge in production. |
| Model tier alias change in code default affects resolution | None | — | `"haiku"` → `claude-haiku-4-5-20251001`, `"sonnet"` → `claude-sonnet-4-5-20250929`, `"opus"` → `claude-opus-4-6`. Verified in `model-resolver.ts` ANTHROPIC_VERSIONS map. Same models as today. |
| Comparison endpoint change breaks UI | Low | Admin UI only | Schema parsing is additive. Existing comparison logic preserved as fallback for non-pipeline types. |
| **DB config not reset after deploy** | **Low** (was Medium) | **Old safe_downgrade config persists, quality stays degraded** | Auto-reseed on service restart handles this for system-seeded configs (see §4.3 Captain Deputy finding). Manual reset only needed if config was edited via Admin UI. Verification in §4.5 catches this. |
| `defaultPipelineVariant` removal breaks existing saved configs | None | — | Schema field is `.optional()`. Saved configs with this field still parse fine (Zod ignores unknown keys in `.passthrough()` mode; field is removed from schema but harmless if present in stored JSON). |

---

## 6. Files Modified

| File | Changes |
|------|---------|
| `apps/web/configs/pipeline.default.json` | Fix verdict policies, remove defaultPipelineVariant, add missing fields |
| `apps/web/src/lib/config-schemas.ts` | Model tier aliases, remove defaultPipelineVariant from schema + DEFAULT_PIPELINE_CONFIG |
| `apps/web/src/components/AboutBox.tsx` | Remove defaultPipelineVariant type + helper |
| `apps/web/src/app/api/admin/config/default-comparison/route.ts` | Schema-aware comparison |

---

## 7. Open Questions for Captain

1. **Verdict validation policies:** Captain has confirmed `"disabled"` is the desired default to match localhost quality. Note for record: `safe_downgrade` was added in Inverse Claim Asymmetry Plan (Phase 2) as an integrity safeguard. With `"disabled"`, validation still runs and logs warnings but does NOT auto-downgrade verdicts. This can be re-enabled per-field later if needed after the grounding/direction validation logic is improved to avoid false positives.

2. **Model version map — SEPARATE follow-up (DO NOT include in this fix):** `ANTHROPIC_VERSIONS.sonnet` in `model-resolver.ts` maps to Sonnet 4.5 (`claude-sonnet-4-5-20250929`). Sonnet 4.6 (`claude-sonnet-4-6`) exists and was referenced in the code default but was never actually used at runtime. Updating the version map is a **quality-affecting change** that must be tested independently. Not part of this fix.

3. **Re-deployment ownership:** Who executes the VPS deployment (§4.2-4.3)? Captain Deputy who did the initial deployment, or should deployment instructions be handed to Codex?
   > **Captain Deputy answer:** Captain Deputy should execute. Reasons: (a) built the VPS setup, knows exact paths/service names/gotchas; (b) config DB path subtlety (postbuild → `apps/web/config.db` vs runtime → `data/config.db`) requires VPS-specific knowledge; (c) original §4.2 had 4 errors that would trip up an agent following it blindly; (d) Codex doesn't have SSH access.

4. **Zod `.strip()` behavior:** Verify that `PipelineConfigSchema.parse()` does not strip unknown fields from stored blobs (e.g., legacy `monolithicDynamic*` fields). This matters for the comparison endpoint fix (§3.4). If Zod strips them, the comparison would need to handle that. Default Zod behavior is `.strip()` which removes unknown keys — this is fine for comparison (we only want to compare known fields) but the endpoint should NOT write the stripped result back to the DB.
   > **Captain Deputy answer:** Confirmed — Zod default is `.strip()`. This is safe for read-only comparison (§3.4 only displays differences, doesn't persist). The comparison endpoint must NOT write the parsed/stripped result back to DB, as it would destroy legacy fields like `monolithicDynamicTimeoutMs`. The §3.4 implementation is read-only by design — safe to proceed.

---

## 8. Captain Deputy Review (2026-03-03)

**Reviewer:** Captain Deputy (Claude Code, Opus 4.6) — built the VPS deployment on 2026-03-02
**Verdict:** APPROVED with corrections (applied inline above)

### Corrections applied to this document

1. **§4.2 — 4 errors fixed:** Wrong SSH user (`factharbor` → `ubuntu`), npm ci from wrong directory, missing static asset copy, missing API rebuild. Commands now match `scripts/DEPLOYMENT.md`.
2. **§4.3 — Auto-reseed discovery:** `ensureDefaultConfig()` runs at every service startup via `initDb()`. System-seeded configs auto-refresh when file defaults change. Manual reset likely unnecessary — verify in logs after restart.
3. **§4.3 Option C — Wrong DB path:** Changed from `apps/web/config.db` (orphan postbuild DB) to `/opt/factharbor/data/config.db` (runtime DB set via `FH_CONFIG_DB_PATH`).
4. **§4.3 — Postbuild reseed note:** Documented that postbuild reseed on VPS writes to wrong DB (shell lacks `FH_CONFIG_DB_PATH` env var). This is a no-op for production config.
5. **§5 Risk table — DB reset risk downgraded:** Low (was Medium) due to auto-reseed behavior.
6. **§7 Q3 answered:** Captain Deputy should execute deployment.
7. **§7 Q4 answered:** Zod `.strip()` is safe for read-only comparison.

### Additional observations

- **Postbuild reseed path divergence** is worth a follow-up fix: export `FH_CONFIG_DB_PATH` in the build shell on VPS to avoid orphan `apps/web/config.db`. Not blocking for this fix.
- **§3.1 adding missing fields** to `pipeline.default.json` will trigger auto-reseed on every deploy where content differs. This is expected and safe, but increases deploy log noise. Consider whether all missing fields are truly needed in the file vs. being adequately covered by schema `.transform()`.

### Recommendation

Root cause analysis is correct. Fix plan is sound. Ready for Codex Senior Developer review, then implementation.

## 9. Codex Senior Developer Review (2026-03-03)

**Reviewer:** Senior Developer (Codex, GPT-5)
**Verdict:** APPROVED WITH CHANGES

### Review item 1 — §3.1 `pipeline.default.json` changes

**Assessment:** Approved.

- `verdictGroundingPolicy: "disabled"` and `verdictDirectionPolicy: "disabled"` are correct for parity with current localhost runtime behavior and with `DEFAULT_PIPELINE_CONFIG`/verdict-stage defaults.
- The proposed additional fields and values match `DEFAULT_PIPELINE_CONFIG`:
  - `parallelExtractionLimit: 3`
  - `understandTemperature: 0`
  - `understandMinClaimThreshold: 4`
  - `verdictBatchSize: 5`
  - `openaiTpmGuardEnabled: true`
  - `openaiTpmGuardInputTokenThreshold: 24000`
  - `openaiTpmGuardFallbackModel: "gpt-4.1-mini"`
  - `researchTimeBudgetMs: 600000`
  - `researchZeroYieldBreakThreshold: 2`
  - `maxIterationsPerContext: 3` (deprecated/not enforced in CB pipeline, but safe for alignment)
- `defaultPipelineVariant` removal from file is correct.

### Review item 2 — §3.2 `config-schemas.ts` model tier aliases

**Assessment:** Approved.

- `getModelForTask()` in `apps/web/src/lib/analyzer/llm.ts` correctly supports aliases via `isModelTier()` + `resolveModel()`.
- `model-resolver.ts` maps resolve to expected concrete IDs:
  - `haiku` -> `claude-haiku-4-5-20251001`
  - `sonnet` -> `claude-sonnet-4-5-20250929`
  - `opus` -> `claude-opus-4-6`
- Quality-preservation condition holds if the version map is unchanged (as already stated in §2/§3).

### Review item 3 — §3.3 `defaultPipelineVariant` removal

**Assessment:** Approved.

- Code references are limited to:
  - `apps/web/src/lib/config-schemas.ts`
  - `apps/web/src/components/AboutBox.tsx`
- No other runtime references exist.
- Stored configs that still contain `defaultPipelineVariant` are safe:
  - In schema-parse paths (`parseTypedConfig`), Zod object parsing strips unknown keys by default.
  - In raw JSON loader paths, the field may still be present in memory, but it is harmless because no runtime consumer uses it.

### Review item 4 — §3.4 default comparison endpoint fix

**Assessment:** Approved with one hardening change.

- The proposed schema-aware comparison approach is directionally correct and fixes the masking problem.
- It remains read-only (GET-only route, no save/activate/write calls), satisfying the no-write requirement.
- **Required hardening:** use `safeParse` with fallback to current behavior to prevent avoidable 500s from malformed legacy blobs.

**Exact code-level correction (recommended implementation pattern):**

```ts
// apps/web/src/app/api/admin/config/default-comparison/route.ts
import { PipelineConfigSchema } from "@/lib/config-schemas";

function toEffectivePipelineConfig(input: unknown, fallback: any) {
  const parsed = PipelineConfigSchema.safeParse(input);
  if (parsed.success) return parsed.data;

  // Fallback keeps endpoint operational for malformed legacy data
  return mergeDefaults(fallback, input);
}

// In pipeline branch:
const result = await loadPipelineConfig(profileKey);
activeConfig = result.config;
defaultConfig = loadDefaults("pipeline", DEFAULT_PIPELINE_CONFIG);

const effectiveDefault = toEffectivePipelineConfig(defaultConfig, DEFAULT_PIPELINE_CONFIG);
const effectiveActive = toEffectivePipelineConfig(activeConfig, effectiveDefault);
const customizedFields = findDifferences(effectiveDefault, effectiveActive);
```

### Review item 5 — General quality-preservation check

**Assessment:** Approved.

- No §3 change introduces report-quality degradation relative to current localhost behavior.
- The only quality-affecting fix (`safe_downgrade` -> `disabled` for verdict grounding/direction policies) is the intended parity restoration.
- Endpoint and cleanup changes are admin/read-path only; they do not alter analysis pipeline outputs.

### Final recommendation

Proceed with implementation of §3.1–§3.4, applying the §3.4 `safeParse` hardening above. After deploy, verify parity with one known claim pair (localhost vs deployed) and confirm verdicts no longer collapse to `50% / 24%`.
