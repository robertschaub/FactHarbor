---
### 2026-05-09 | Senior Developer | Codex (GPT-5) | UCM Search Config Repair

**Task:** Repair the UCM search config change after review of commit `edeca59a` found drift and fallback-only mismatches.

**Files touched:** `apps/web/configs/search.default.json`; `apps/web/configs/sr.default.json`; `apps/web/src/lib/config-schemas.ts`; `apps/web/src/lib/web-search.ts`; `apps/web/test/unit/lib/web-search.test.ts`; `Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Report_Improvement_Static_Comparator_Packet.md`; `Docs/AGENTS/Agent_Outputs.md`.

**Debt-guard result:** Classified as `introduced-config-drift` plus `stale-behavior-default`. Chosen path was `amend` rather than blanket revert: keep the useful Serper-primary/cost-reduction direction and all-config reseed capability, but repair authoritative JSON/TypeScript drift and default AUTO behavior. Rejected path was reverting the full prior change because it would restore the Google-CSE-primary cost problem.

**Changes made:** Synced SR evaluation-search JSON defaults with TypeScript (`serper.priority=1`, `googleCse.priority=2`, `googleCse.dailyQuotaLimit=100`). Changed default main-search `autoMode` from `accumulate` to `first-success` in JSON, Zod default, `DEFAULT_SEARCH_CONFIG`, and the provider-loop comment. Added a focused web-search test proving default AUTO search calls Serper and does not top up with Google CSE after Serper returns results. Updated the stale comparator-packet handoff note so it no longer describes an admin-owned active search config.

**Verification:** `npm -w apps/web test -- config-drift web-search` passed. `npm -w apps/web run build` passed and refreshed default `search` and `sr` configs from JSON. An initial full safe `npm test` had one timeout in `runner-concurrency-split.integration.test.ts`; the exact failing file passed immediately on focused rerun, and a subsequent full safe `npm test` passed. `git diff --check` passed after index regeneration.

**Follow-up DB verification:** The local `apps/web/config.db` has active DB rows for the four non-prompt default UCM types, but they are system-owned mirrors of the JSON defaults, not overrides. Active `calculation/default`, `pipeline/default`, `search/default`, and `sr/default` hashes all match the current file-backed default hashes. Active non-prompt override count is `0`; active non-system/non-seed override count across the active table is `0`.

**Warnings:** `dailyQuotaLimit` is still declared metadata in schema descriptions, not application-side quota enforcement. The true hard cap remains provider/billing-side controls unless quota tracking is implemented separately.

**Learnings:** Not appended. This reinforces existing project rules: UCM JSON defaults are authoritative and config-drift tests must guard every JSON/TypeScript default pair.
