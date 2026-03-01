## Investigation Report: Potential Report Quality Degradation

**Date:** 2026-02-24
**Investigator:** Code Reviewer (Claude Code, Opus 4.6)
**Status:** F1 resolved, F2 resolved, F3 open, F4–F6 monitor

### Methodology

Compared: (1) live UCM config in `config.db` vs seed files vs code defaults, (2) recent code changes to evidence pipeline, verdict stage, and debate configuration, (3) config loading resolution order.

---

### Finding 1 — CRITICAL: Live UCM pipeline config missing production challenger provider

**Status: RESOLVED (2026-02-24T09:39:45Z)**

**Impact: Debate quality reduced — all 5 debate roles used the same LLM provider**

The live UCM pipeline config (activated by "codex" for "calibration-baseline-run") had no `debateModelProviders` field. All debate roles inherited the global `llmProvider: "anthropic"`, producing a degenerate debate with no structural independence between advocate and challenger.

The seed file (`pipeline.default.json`) correctly has `"debateModelProviders": { "challenger": "openai" }` — the intended production configuration. However, the reseed script (`reseed-all-prompts.ts`) protects agent/user-activated configs by design (only overwrites `activated_by === "system"`), so it could not auto-fix this.

The config also contained an orphaned `debateProfile: "baseline"` field — `debateProfile` was removed as a code/config entity (commit `9d9ce84`) and now exists only as a conceptual guide in documentation for selecting per-role configurations.

**Root cause:** An agent set the config to the all-Anthropic baseline profile for a calibration run and never restored the production profile afterward.

**Resolution:** UCM pipeline config updated directly:
- Removed orphaned `debateProfile: "baseline"`
- Added `debateModelProviders: { "challenger": "openai" }`
- Activated by: `claude-code` / reason: `restore-production-profile`

**Prevention:** Agents running calibration with non-production configs should restore the production profile upon completion, or document the config change in their Agent_Outputs.md entry.

---

### Finding 2 — HIGH: `DEFAULT_PIPELINE_CONFIG` in code uses Opus for verdicts, live/seed uses Sonnet

**Status: RESOLVED (2026-02-24T10:55:00Z)**

**Impact: If UCM fails, fallback uses expensive Opus model instead of production Sonnet**

| Field          | `DEFAULT_PIPELINE_CONFIG` (code fallback) | `pipeline.default.json` (seed) | Live UCM                     |
| -------------- | ----------------------------------------- | ------------------------------ | ---------------------------- |
| `modelVerdict` | `claude-opus-4-6`                         | `claude-sonnet-4-5-20250929`   | `claude-sonnet-4-5-20250929` |
| `llmTiering`   | `false`                                   | `true`                         | `true`                       |

The code default at `apps/web/src/lib/config-schemas.ts:756` had `modelVerdict: "claude-opus-4-6"` — this would be used if the UCM database is missing or corrupted. While Opus may produce higher quality, this is a 10x cost increase and the mismatch means the fallback doesn't match production behavior.

**Resolution:**
- Updated `DEFAULT_PIPELINE_CONFIG` to match the seed file: `llmTiering: true`, `modelVerdict: "claude-sonnet-4-5-20250929"`
- Added drift-detection unit test (`config-schemas.test.ts`) that verifies 6 critical fields (`llmProvider`, `llmTiering`, `modelUnderstand`, `modelExtractEvidence`, `modelVerdict`, `defaultPipelineVariant`) match between `DEFAULT_PIPELINE_CONFIG` and `pipeline.default.json`
- Updated 4 downstream test assertions that expected the old values
- All 1053 tests passing

---

### Finding 3 — MEDIUM: Live search config is minimal — missing `providers`, `cache`, `queryGeneration`, `factCheckApi` sections

**Status: OPEN**

**Impact: Functional but not optimal — search cache and new providers not configurable via UCM**

The live search config in UCM has only 9 flat fields. It's missing:

* `providers` (per-provider enabled/priority) — new providers can't be enabled via UCM
* `cache` — search caching falls back to module-level defaults (enabled, 7 days) — works but not tunable
* `circuitBreaker` — falls back to module-level defaults (enabled, threshold=3) — works but not tunable
* `queryGeneration` — falls back to code defaults — works but not tunable
* `factCheckApi` — pipeline direct seeding not configurable

All of these are handled gracefully by optional chaining and fallback defaults, so **no crash or broken behavior**. But the UCM doesn't reflect the full config shape, so admin can't tune these via the UI.

**Fix:** Reseed the search config from the seed file. Since the search config is `activated_by: "system"` with reason `"refresh-default"`, running `reseed-all-prompts.ts` should overwrite it with the full default. However, the current seed file (`search.default.json`) is also minimal (only 9 fields) — it needs to be updated to include the full `DEFAULT_SEARCH_CONFIG` structure before reseeding.

---

### Finding 4 — MEDIUM: Evidence sufficiency gate may produce UNVERIFIED verdicts for legitimate claims

**Status: MONITOR**

**Impact: Claims with sparse evidence get `truthPercentage: 50, confidence: 0` instead of an assessed verdict**

The D5 sufficiency gate at `apps/web/src/lib/analyzer/claimboundary-pipeline.ts:303-325` requires:

* `evidenceSufficiencyMinItems: 3` (at least 3 evidence items per claim)
* `evidenceSufficiencyMinSourceTypes: 2` (at least 2 distinct source types)

If a claim's evidence doesn't meet these thresholds, it gets a hardcoded UNVERIFIED verdict with `confidence: 0` and `reasoning: "Insufficient evidence..."`. The gate filters by `e.relevantClaimIds?.includes(claim.id)` — if `relevantClaimIds` isn't populated on evidence items (it's optional per the schema at line 656), the filter returns zero items for every claim.

This is a **new behavior** from the D5 implementation. The `relevantClaimIds` field IS populated during evidence extraction (line 1162), so it should work. But for edge cases (older evidence formats, failed extraction), this could silently suppress verdicts.

**Fix:** No code change needed if `relevantClaimIds` is reliably populated. To verify: run a test analysis and check how many claims hit the sufficiency gate. If many claims are getting UNVERIFIED, consider lowering `evidenceSufficiencyMinItems` to 2 or adding a fallback that counts all evidence when `relevantClaimIds` is empty.

---

### Finding 5 — MEDIUM: Baseless challenge enforcement now reverts more aggressively

**Status: MONITOR**

**Impact: Verdicts may be less nuanced — more challenger adjustments get reverted**

Recent changes to `enforceBaselessChallengePolicy` in `apps/web/src/lib/analyzer/verdict-stage.ts`:

* Mixed provenance (some valid, some baseless challenge points) now triggers a **full revert** to advocate position (previously advisory-only)
* Cross-claim evidence (evidence scoped to a different claim via `relevantClaimIds`) is now treated as invalid
* Missing claim blocks trigger revert

This is the safer approach per AGENTS.md ("baseless challenges MUST NOT reduce truth%"), but it means legitimately contested claims may have their challenger adjustments reverted if even one challenge point is baseless. The net effect: **verdicts trend toward the advocate's position** more often.

**Fix:** This is by design (safety > nuance). Monitor by checking `baseless_challenge_blocked` warnings in analysis results. If too many verdicts are being reverted, the root cause is likely the challenger LLM producing poor challenge evidence — which loops back to cross-provider diversity (Finding 1, now resolved).

---

### Finding 6 — LOW: Evidence partitioning may create unbalanced debates

**Status: MONITOR**

**Impact: Challenger may get less evidence than advocate**

With `evidencePartitioningEnabled: true`, institutional sources (peer-reviewed, fact-check, government, statistical, organization reports) go to advocate, while general sources (news, expert statements, etc.) go to challenger. The fallback threshold is only 2 items per partition.

For academic/scientific claims, most evidence is institutional → advocate gets the bulk, challenger gets scraps. This creates asymmetric debates where the advocate has stronger evidence by design.

**Fix:** This is working as intended (institutional evidence is more reliable for advocacy). But if reports show one-sided verdicts, consider whether the partitioning thresholds need adjustment or if `evidencePartitioningEnabled` should be `false` for certain claim types.

---

### Recommended Action Priority

| Priority        | Finding                             | Action                                                                                                              | Status       |
| --------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------ |
| **1 (now)**     | F1: Missing `debateModelProviders`  | Add `"debateModelProviders": { "challenger": "openai" }` to live UCM pipeline config                                | **RESOLVED** |
| **2 (now)**     | F3: Minimal search config           | Update `search.default.json` seed to full structure, then reseed                                                    | OPEN         |
| **3 (soon)**    | F2: Code default divergence         | Update `DEFAULT_PIPELINE_CONFIG` to match seed file (modelVerdict → Sonnet, llmTiering → true) + drift-detection test | **RESOLVED** |
| **4 (monitor)** | F4: Sufficiency gate                | Run a test analysis, check for `insufficient_evidence` warnings                                                     | MONITOR      |
| **5 (monitor)** | F5: Baseless enforcement            | Check `baseless_challenge_blocked` warnings in recent reports                                                        | MONITOR      |
| **6 (low)**     | F6: Evidence partitioning           | Monitor for one-sided verdict patterns                                                                              | MONITOR      |
