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

---

## Related Active Documents

- `STATUS/Backlog.md` — canonical task list
- `STATUS/Current_Status.md` — current system state
