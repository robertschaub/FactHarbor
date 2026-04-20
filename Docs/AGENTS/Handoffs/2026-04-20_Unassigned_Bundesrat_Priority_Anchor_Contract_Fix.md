---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Bundesrat Priority-Anchor Contract Fix
**Task:** Fix the Bundesrat Stage 1 atomicity regression for job family `1bd1493808044dd583b4a0933dd11f4b` without hardcoding `rechtskräftig`, have other agents review the approach, consolidate yesterday/today job and commit attribution, then prepare a clean commit-and-rerun path.

**Files touched:**
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `Docs/AGENTS/Agent_Outputs.md`

**Other-agent review inputs:**
- Prompt-design review: `Docs/AGENTS/Handoffs/2026-04-20_Unassigned_Bundesrat_Stage1_Prompt_Review.md`
- Commit/job attribution review:
  - best improvement sequence: `24dac263` -> `dd9a222f` -> `3c740f28` prompt-side decomposition improvements, then `bbdf6c73` repair-path collapse fix, then `6edbc457` + `f287e427` single-claim atomicity enforcement
  - main regression pattern: clean jobs on `fd4d6abf` and `adff6e0b` still allowed a bundled single claim to survive
- Safety review outcome after fixes: safe enough to validate once the contract validator consumed the same salience payload as the prompt and the detached-modifier repair preference was removed

**Key decisions:**
- Kept the fix generic. No keyword rule for `rechtskräftig` was added. The invariant is now: truth-condition-bearing finality/binding-effect qualifiers become priority anchors when salience succeeds, and coordinated-branch decomposition must preserve those anchors fused to the same main act/state rather than externalizing them.
- Strengthened prompt doctrine across all relevant Stage 1 surfaces:
  - `CLAIM_SALIENCE_COMMITMENT`: emit a priority anchor when a finality/binding-effect/completion-status qualifier could be buried by coordinated decomposition
  - `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX`: when coordinated decomposition is required, preserving the priority anchor in each branch outranks keeping one bundled near-verbatim sentence
  - `CLAIM_CONTRACT_VALIDATION`: added an explicit precommitted priority-anchor guard
  - `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`: now receives and uses the precommitted salience context directly
- Aligned runtime plumbing with prompt doctrine:
  - the single-claim atomicity validator now receives the salience payload
  - the contract validator now receives the same salience payload, including `priorityAnchors`
  - the post-approval single-claim binding challenge remains narrow and only runs after the existing atomicity pass succeeds
- Removed an unsafe intermediate change: repair-anchor selection no longer hard-prefers a sole detached `modal_illocutionary` span when broader missing anchor content is still unresolved. That behavior made the repair path too eager to chase `rechtskräftig` alone instead of preserving the fused proposition.
- Updated the pipeline test that encoded the old call sequence. Audit mode still drives the base contract validation prompt, but approved single-claim outputs now intentionally trigger a follow-up binding challenger, so the test now asserts that sequence instead of forbidding any binding appendix load.

**Verification:**
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/repair-anchor-selection.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `npm -w apps/web run build`

**Post-commit runtime validation:**
- Main fix commit: `ccb5336e` `fix(stage1): enforce priority-anchor contract for single-claim checks`
- Clean runtime `HEAD` after housekeeping: `8e3d9542` `chore(repo): refresh indexes and normalize lockfile metadata`
- Services restarted cleanly before submissions.
- Clean reruns submitted on `8e3d9542`:
  - `7810fa9f1a0d4e10bc89f929fc5c3166`
  - `0487ca351dbb40948ece1b70ca31dfc3`
  - `46e6eec5b373489287136193bf2f181b`
- Results:
  - `7810fa9f...`: `SUCCEEDED`, executed commit `8e3d95421fa4bb006150d8ab9d2b3fcfcc79e9cf`, `claimCount: 2`
  - `0487ca35...`: `SUCCEEDED`, executed commit `8e3d95421fa4bb006150d8ab9d2b3fcfcc79e9cf`, `claimCount: 2`
  - both exact-input reruns produced the same two Stage 1 claims:
    - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Parlament darüber entschieden hat.`
    - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig, bevor das Volk darüber entschieden hat.`
  - `46e6eec5...` (sibling without `rechtskräftig`) failed before result generation because the Anthropic API reported insufficient credit during Pass 1; this did not produce a clean comparator run.
- Important note: the two successful exact-input reruns still ended with fallback `UNVERIFIED 50 / 0` overall because Stage 4 verdict generation later hit provider-credit failure. That does not change the Stage 1 atomicity result above.

**Warnings:**
- A pre-existing tracked `package-lock.json` diff was already present before this fix work. It is unrelated to the analyzer change but blocks truly clean commit-linked reruns unless it is either committed or explicitly removed.
- The current fix improves the Stage 1 contract path, but the Bundesrat family historically showed some nondeterminism even after earlier fixes. Validation should use the exact Captain-defined input on a clean restarted commit and should be repeated at least twice.
- Runtime validation is currently limited by Anthropic credit exhaustion. The exact-input reruns got far enough to confirm the Stage 1 split twice, but the sibling comparator input failed in Pass 1 for billing reasons and the completed exact-input jobs fell back to `UNVERIFIED` later in Stage 4 for the same reason.
- The untracked agent worktree under `.claude/worktrees/` was explicitly removed after the external reviews to avoid dirty-hash pollution.

**For next agent:**
- Before claiming success, restart services on the committed SHA and rerun:
  - `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
  - the same input a second time on the same clean commit
  - `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
- For each rerun, inspect the job detail and verify:
  - clean executed commit hash with no dirty suffix
  - `claimCount: 2` for the `rechtskräftig` input
  - both claims preserve the modifier fused into the branch claim
  - no whole-proposition carrier plus partial subclaim shape reappears

**Learnings:**
- The safest generic fix was not “split on `rechtskräftig`”. It was “treat finality/binding-effect qualifiers as priority anchors and enforce their preservation consistently across salience, contract validation, and atomicity checks.”
