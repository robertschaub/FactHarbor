---
roles: [Agents Supervisor]
topics: [ace_governance, handoff_index, generated_at, hooks]
files_touched:
  - scripts/build-index.mjs
  - apps/web/test/unit/lib/build-index.test.ts
  - Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md
  - Docs/AGENTS/index/handoff-index.json
---

# Index GeneratedAt Stability

**Task:** Continue ACE governance implementation by closing the post-commit handoff-index churn left after tracked-only indexing.

**Done:**

- `scripts/build-index.mjs:50` now exposes `comparableIndexJson(...)`, which removes top-level `generatedAt` before comparing generated index payloads.
- `scripts/build-index.mjs:62` now skips `writeAtomic(...)` when the existing file and next generated JSON differ only by top-level `generatedAt`.
- `apps/web/test/unit/lib/build-index.test.ts:137` covers the generatedAt-only equality case and verifies substantive index changes still compare differently.
- `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md:54` records the timestamp-churn stabilization in the operative ACE governance plan.

**Decisions:**

- Chose to amend the existing writer instead of special-casing the post-commit hook. This keeps the behavior local to generated-index writes and preserves tracked-only handoff indexing.
- Limited the comparison exemption to top-level `generatedAt`; nested content changes and count/entry changes still write normally.

**Warnings:**

- This does not clean unrelated existing generated diffs in `stage-map.json` or `stage-manifest.json`; those remain outside this ACE governance slice.
- Full filesystem index runs still include local untracked handoffs by design. Use `npm run index:tier2:tracked` for committed handoff-index updates.

**Learnings:**

- For generated committed indexes, timestamp fields should not be the write/no-write discriminator. Compare semantic payload first, then write only when discoverability content changed.

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend existing generated-index writer
Net mechanism count: unchanged
Verification: safe-local / `npm -w apps/web test -- build-index.test.ts`; `npm run index:tier2:tracked`; `git diff --check`
Residual debt: none for timestamp-only churn; unrelated generated stage index diffs remain intentionally untouched
```

**For next agent:** `handoff-index.json` should no longer become dirty after post-commit tracked-only regeneration when only `generatedAt` changes. Continue ACE governance work from `Docs/WIP/2026-04-26_ACE_Governance_Implementation_Plan.md`; review the Phase 2 audit before proposing any `Multi_Agent_Collaboration_Rules.md` restructure.
