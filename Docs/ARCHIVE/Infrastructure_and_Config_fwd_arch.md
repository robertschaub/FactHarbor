# Infrastructure & Config — Pending Items

**Created:** 2026-03-17 (extracted from WIP Consolidation #6)
**Status:** Active — forward-looking items from archived infrastructure documents

---

## 1. UCM Config Drift — Phase 2 Tuning (low priority)

**Source:** `ARCHIVE/UCM_Config_Drift_Review_2026-03-05.md`

Phase 1 fixes complete (JSON alignment, drift test, domainBlacklist). Phase 2 residual:
- Quality tuning decisions for several config parameters not yet reviewed against production data
- Most tuning recommendations now superseded by the SR weighting investigation and Combined Plan
- The config-drift CI test (`config-drift.test.ts`) is the lasting artifact — it catches future drift automatically

## 2. Job Events — Phase 2 Structured Data (deferred)

**Source:** `ARCHIVE/Job_Events_Readability_Plan_2026-03-16.md`

Analysis Timeline (Phase 1) fully implemented. Phase 2 deferred:
- Add structured `data: JsonObject` field to `JobEventEntity` (C# schema change in `apps/api`)
- Enables machine-readable event metadata (model names, provider info, timing) alongside human-readable messages
- Currently, structured data is encoded in the message string — works but not queryable

## 3. Search Accumulation — Fix C Provider Investigation (deferred)

**Source:** `ARCHIVE/Search_Accumulation_Restoration_Plan_2026-03-15.md`

Fix A (autoMode toggle) shipped. Fix B (SerpAPI) reverted. Fix C deferred:
- Investigate additional search providers beyond Google CSE + Serper
- SerpAPI circuit breaker is OPEN — needs root cause investigation before re-enablement
- Bing API, DuckDuckGo, or other providers could provide diversity

## 4. Multi-Source Evidence Retrieval — Detailed Pending Phases

**Source:** `ARCHIVE/Multi-Source_Evidence_Retrieval_Plan.md`

**Phase 3.2:** Add optional fields to `EvidenceItem`: `isFactCheckVerdict`, `factCheckRating`, `factCheckPublisher`, `linkedFactCheckId`, `isSuperseded`.

**Phase 3.3:** Add `NORMALIZE_FACTCHECK_RATING` prompt section to `claimboundary.prompt.md`.

**Phase 3.4:** `seedEvidenceFromFactCheckApi()` — call Fact Check API per AtomicClaim, batch-normalize ratings via Haiku, create EvidenceItems.

**Phase 3.5:** `preQualifiedUrls` + safeguards — age gate filtering (`maxAgeDays` default 365), linked evidence ID propagation.

**Phase 3.6:** Pipeline integration tests for age gate and linked IDs.

**Phase 4b:** UCM schema for `abstractMaxChars`, `rateLimitIntervalMs`, per-provider `timeoutMs`.

**Phase 4c:** Admin UI provider config form — all 7 providers in one pass.

**Key risk:** Semantic Scholar commercial license unclear — contact AI2 before production.

## 5. UCM Config Tuning — Blocked Items

**Source:** `ARCHIVE/UCM_Config_Drift_Review_2026-03-05.md`

| Item | Change | Unblock condition |
|------|--------|-------------------|
| 2b | `selfConsistencyTemperature` 0.4→0.2 | Propose co-adjusted spread thresholds calibrated at new temperature |
| 2e | `evidenceSufficiencyMinSourceTypes` 1→2 | Domain-diversity fallback confirmed stable (monitor 1-2 weeks post-deploy) |

Lower-priority tuning considerations:
- `maxResults` 10→12 (more search candidates, +20%, minimal cost)
- `maxSourcesPerIteration` 8→10 (better evidence coverage, ~25% more API calls)
- `contestationWeights.established` 0.5→0.6-0.65 (may double-penalize contested claims)
- `analysisMode` "quick"→"deep" (better reports but costs more — policy decision)

---

## Related Active Documents

- `STATUS/Backlog.md` — canonical task list
- `STATUS/Current_Status.md` — current system state
