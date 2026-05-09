---
### 2026-05-09 | Senior Developer | Codex (GPT-5) | UCM Search Config Change Review

**Task:** Review commit `edeca59a` for the UCM search provider priority change and all-config reseed endpoint expansion.

**Files touched:** `Docs/AGENTS/Handoffs/2026-05-09_Senior_Developer_UCM_Search_Config_Review.md`; `Docs/AGENTS/Agent_Outputs.md`.

**Key decisions:** Review found blocking config drift: `DEFAULT_SR_CONFIG` and SR Zod defaults were changed to Serper primary, but `apps/web/configs/sr.default.json` still has Google CSE primary and zero quota. Because JSON files are authoritative for UCM reseed/runtime defaults, `sr/default` reseed does not apply the intended cost change and the existing drift test fails. Secondary risk: `search.default.json` still uses `autoMode: "accumulate"`, so Google CSE is not strictly fallback-only; it can run as a top-up provider when Serper returns fewer than `maxResults`, and `dailyQuotaLimit` remains metadata only, not app-enforced.

**Open items:** Fix `apps/web/configs/sr.default.json` to match `DEFAULT_SR_CONFIG`, then rerun `npm -w apps/web test -- config-drift`. Consider whether the intended main search behavior is true fallback-only (`first-success` or equivalent) or accumulate/top-up.

**Warnings:** The committed handoff note at `Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Report_Improvement_Static_Comparator_Packet.md` still says no reseed is needed and references an admin-owned config/hash, which conflicts with the stated system-owned forced reseed semantics.

**For next agent:** Primary anchors: `apps/web/configs/sr.default.json:22`, `apps/web/src/lib/config-schemas.ts:1337`, `apps/web/src/lib/config-schemas.ts:1398`, `apps/web/configs/search.default.json:6`, `apps/web/src/lib/web-search.ts:290`, and `apps/web/src/lib/config-schemas.ts:102`. Focused verifier already run and failed: `npm -w apps/web test -- config-drift`.

**Learnings:** Not appended. This is an instance of an existing rule: JSON config defaults must stay in sync with TypeScript constants.
