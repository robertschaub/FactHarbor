---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 2G Evidence Quality Reader Compatibility
**Task:** Continue V2 read-compatibility closure with the offline evidence-quality measurement script, avoiding analyzer runtime, API, UI, prompt, config, and live-job changes.

**Files touched:**
- `scripts/measure-evidence-quality.ts`
- `apps/web/test/unit/scripts/measure-evidence-quality.test.ts`

**Key decisions:**
- Added import-safe exports to `measure-evidence-quality.ts` so the parser can be fixture-tested without executing CLI behavior.
- Added a small standalone schema detector for this root TS script instead of importing the web TypeScript adapter, keeping it independent of Next aliases and runtime modules.
- V2 reads are schema-gated on `4.0.0-cb-shadow` / `4.0.0-cb` plus `meta.pipeline == "claimboundary-v2"` and extract canonical `evidence.evidenceItems` plus `sources.items`.
- V2 evidence `sourceType` is projected into the legacy measurement shape only for this offline metric reader, because the script historically measures `evidenceScope.sourceType`.
- Legacy V1 reads use `evidenceItems` and `sources`; unknown historical inputs preserve the old `facts` preference.
- A runtime-adjacent `metrics-integration.ts` experiment was reverted before this slice because deputy review did not fully agree on touching analyzer-adjacent metrics in Slice 2G.

**Open items:**
- `apps/web/src/lib/analyzer/metrics-integration.ts` remains a deferred V2 metrics-runtime compatibility question.
- `apps/web/scripts/baseline-runner.js` and `apps/web/test/scripts/regression-test.js` remain legacy live-job runners and were not modernized because they submit expensive/live jobs.
- No live evidence-quality baseline was run.

**Warnings:**
- This script is offline/read-only compatibility plumbing. It should not become the authority for evidence semantics or source-type classification.
- Do not reuse its standalone schema helper as a second product adapter unless a future script has the same root-node/runtime isolation constraint.
- If V2 canonical `EvidenceItem` changes source identity or source type placement, update this script's fixture tests with the result contract.

**For next agent:**
- Worktree: `C:\DEV\FactHarbor-pipeline-rebuild-spec`, branch `codex/pipeline-rebuild-spec`.
- Verification passed:
  - `npm -w apps/web test -- --run test/unit/scripts/measure-evidence-quality.test.ts`
  - `npx tsx scripts/measure-evidence-quality.ts --help`
  - `npm -w apps/web run build`
  - `npm test`
  - `git diff --check`
  - scope guard showed no changed analyzer, prompt, API, or job UI files.
- Next safe continuation: inspect remaining offline/historical result readers only. Escalate before touching analyzer runtime metrics, retiring old live runners, adding V2 shell routing, changing prompts/config, or running live/expensive validation.

**Learnings:** Not appended to `Role_Learnings.md`; this was implementation-specific compatibility work.
