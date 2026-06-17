### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Fact-Checking Query Seeding Stabilization
**Task:** Diagnose why job `bcfcaa1f99304c83a8ee3676170444dd` regressed back to `UNVERIFIED` for `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland`, implement a better fix, commit it, and ensure pending jobs run on the fixed pipeline.

**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

**Key decisions:** This was not prompt-rollout drift. Job `bcfcaa1f99304c83a8ee3676170444dd` and the earlier successful exact-input run `63f795860245464fafbf374fc9b01f91` used the same commit family (`caa03914...`) and same prompt family (`5b34870a...` at runtime), but Stage 1 and early Stage 2 framing diverged. The successful run seeded concrete ecosystem signals such as IFCN membership and Meta third-party participation, while the failing run stayed generic (`systematic`, `institutionalized`, `landscape`) and therefore seeded weaker preliminary evidence. I fixed that upstream rather than hardening verdict reconciliation again:

1. `CLAIM_EXTRACTION_PASS1` now requires `searchHint` to stay in the input language unless a foreign-language source-native label is needed, and to name the activity plus a concrete institutional signal route instead of broad abstractions like `system`, `infrastructure`, or `landscape`.
2. `CLAIM_EXTRACTION_PASS2` now requires `expectedEvidenceProfile` to prioritize side-specific institutional documentation and concrete ecosystem signals as the primary verification routes for comparative ecosystem claims.
3. `GENERATE_QUERIES` now requires at least one query per compared side to name a concrete ecosystem signal or source-native artifact, not just a route label.

This fix was committed as `3add5697` (`fix(prompt): stabilize comparative ecosystem query seeding`).

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- Result: `85 passed`
- `npm -w apps/web run reseed:prompts`
- Active `claimboundary` prompt hash in `apps/web/config.db`: `53232e79991d6005dbd19415edf0bd9cadafedc39a87c17ee07523acf5a47530`
- `http://localhost:3000/api/version` reports running web git SHA `3add5697b2c0f93d0cb348859dea72e8c9a08723+bdb0bd8a`

**Pending-job rollout confirmation:** I did not restart the stack because jobs were already running. Instead I confirmed the live queue advanced onto the fixed build. Job `12efc9df99364d7c97a219167926bc28` completed on `3add5697...+bdb0bd8a` with prompt hash `53232e79...`, and then queued jobs `ef358963506f4b0f9612c87a05e2e206` and `3a8dfd60611445a79b9f0ca74dd4d247` both entered `RUNNING` on the same executed git SHA. The exact Swiss rerun `f59f64d739be47fa9d5192c9d7fefc34` was still `QUEUED` at handoff time, but it is unbound and will inherit the current fixed build and active prompt hash when a runner slot opens.

**Open items:** The clean post-fix exact-input rerun `f59f64d739be47fa9d5192c9d7fefc34` has not completed yet, so there is still no final live verdict confirmation for the Swiss-vs-Germany claim on commit `3add5697`.

**Warnings:** The running app still reports a dirty suffix (`+bdb0bd8a`) because the worktree contains pre-existing meeting-note changes outside this task (`Docs/Meetings/...`). I did not touch or commit those files.

**For next agent:** Watch `f59f64d739be47fa9d5192c9d7fefc34` through completion and verify `ExecutedWebGitCommitHash` starts with `3add5697...` and `resultJson.meta.promptContentHash` is `53232e79...`. Then compare its verdict against `bcfcaa1f99304c83a8ee3676170444dd` and `63f795860245464fafbf374fc9b01f91` to determine whether the upstream seeding fix restored the prior `LEANING-TRUE` / `MOSTLY-TRUE` behavior.

**Learnings:** For comparative institutional/ecosystem claims, verdict instability can come from Stage 1 framing long before verdict reconciliation. If `searchHint` and `expectedEvidenceProfile` stay abstract, the pipeline can miss high-signal ecosystem artifacts even when the later-stage prompt logic is sound.
