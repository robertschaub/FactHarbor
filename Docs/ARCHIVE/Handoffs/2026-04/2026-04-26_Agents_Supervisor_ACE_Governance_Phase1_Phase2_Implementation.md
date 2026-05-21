---
roles: [Agents Supervisor]
topics: [ace, governance, tracked_index, collaboration_rules_audit, debt_guard]
files_touched:
  - scripts/build-index.mjs
  - package.json
  - apps/web/test/unit/lib/build-index.test.ts
  - Docs/AGENTS/index/handoff-index.json
  - Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md
  - Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md
  - Docs/AGENTS/Handoffs/2026-04-26_Agents_Supervisor_ACE_Governance_Phase1_Phase2_Implementation.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACE Governance Phase 1-2 Implementation

## Task

Continue implementing the committed ACE governance plan after `ab559315 docs(agents): stabilize ACE governance plan`.

## Done

- Added `--tracked-only` support to `scripts/build-index.mjs` so `handoff-index.json` can be regenerated from tracked/staged handoffs without sweeping unrelated untracked local handoff files into the committed index.
- Added root script `npm run index:tier2:tracked`.
- Added focused parser coverage for tracked handoff file derivation.
- Regenerated `Docs/AGENTS/index/handoff-index.json` with `npm run index:tier2:tracked`.
- Created `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md` with corpus counts, search patterns, false-positive handling, section classifications, and a proposed restructure package.
- Updated `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md` with Phase 1 and Phase 2 progress.

## Decisions

- Keep default `build-index.mjs` behavior unchanged so hook-time discovery still sees newly written untracked handoffs.
- Use `--tracked-only` for commit-quality generated indexes when unrelated local handoffs exist.
- Treat the collaboration-rules audit as a review artifact, not approval to restructure. Captain review is still required before moving sections.

## Warnings

- `Docs/AGENTS/index/stage-manifest.json` and `Docs/AGENTS/index/stage-map.json` still have unrelated generated diffs from prior analyzer state and were not part of this implementation slice.
- The audit found high-confidence obsolete material, but most large sections are `load-on-demand reference`, not deletion candidates.
- The tracked-only handoff index will include staged additions only after they are added to the git index.

## Learnings

- Generated handoff indexes need two modes: filesystem scan for immediate local discoverability, and tracked-only scan for clean committed artifacts.

## For next agent

Review `Docs/WIP/2026-04-26_Multi_Agent_Collaboration_Rules_Audit.md` before any rules restructure. If Captain approves, implement Phase 3 as a proposal that moves §3.4 + §4.5 to a procedure doc and replaces obsolete §4.4/§8 with pointers; do not delete hub-and-spoke material.

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend existing index generation path with opt-in tracked-only mode
Net mechanism count: unchanged
Verification: safe-local / `npm -w apps/web test -- build-index.test.ts`; `npm run index:tier2:tracked`; `git diff --check`
Residual debt: default hook-time index generation still scans the filesystem by design; use tracked-only mode for commit-quality regeneration
```
