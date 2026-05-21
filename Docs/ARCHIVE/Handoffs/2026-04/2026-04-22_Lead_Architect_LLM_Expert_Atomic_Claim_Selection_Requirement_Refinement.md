---
### 2026-04-22 | Lead Architect / LLM Expert | Codex (GPT-5) | Atomic Claim Selection Requirement Refinement
**Task:** Refine the requirement for a user-facing Atomic Claim selection step before analysis continues beyond Stage 1.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_LLM_Expert_Atomic_Claim_Selection_Requirement_Refinement.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The chooser must sit after the current Stage 1 final claim set is produced and before Stage 2 research begins; the candidate list must be the exact same final `understanding.atomicClaims` the pipeline would otherwise analyze today; LLM recommendation is required for semantic preselection/ranking; `Other` is a restart-before-claim-extraction path, not an in-place mutation of the existing Stage 1 output.
**Open items:** Decide rollout default (`interactive` vs `automatic`); decide whether `Other` should create a fresh job or a fresh attempt on the same job ID; define the exact UX/state name for waiting on user selection; decide whether the report page should show unselected claims as audit-only metadata.
**Warnings:** Do not overload the existing system-health/job `PAUSED` semantics for this feature; do not let the chooser change claim extraction semantics; do not silently fall back to a deterministic semantic ranking if the recommendation LLM call fails.
**For next agent:** Start from the improved requirement below. The key runtime contract today is `CBClaimUnderstanding.atomicClaims` in `apps/web/src/lib/analyzer/types.ts`, populated by Stage 1 in `apps/web/src/lib/analyzer/claim-extraction-stage.ts` and currently submitted from `apps/web/src/app/analyze/page.tsx` as a single raw `inputValue`. Public example anchor: hosted job `a59e4a6e1e184c22ad8055e34a52beeb` produced 22 Stage 1 atomic claims but only 6 non-`UNVERIFIED` verdicts, which is the clearest motivating case for a user-selection gate.
**Learnings:** no

## Improved Requirement

### Goal

Allow the user to decide which extracted `AtomicClaims` proceed into research and verdict generation, without changing the current Stage 1 claim-extraction semantics.

### Functional Requirement

1. After the current Stage 1 flow has completed, and before Stage 2 research begins, the system shall enter an **Atomic Claim Selection** step.
2. The candidate list shown in this step shall be **exactly** the final `CBClaimUnderstanding.atomicClaims` that the current pipeline would otherwise send into analysis today.
3. The selection step shall not create, remove, merge, split, rewrite, or reinterpret claims. It only decides which of the already-produced claims proceed to Stage 2+.
4. The system shall use an **LLM recommendation step** to rank the candidate claims and mark the claims that are most meaningful to analyze.
5. The recommendation criteria shall be generic and LLM-evaluated, including:
   - directness to the input thesis
   - independent check-worthiness
   - expected evidence yield / analyzability
   - coverage of distinct relevant dimensions
   - avoidance of redundant overlap
6. The UI shall preselect **at most 3** claims from the LLM recommendation.
7. The user may manually change the selection, but may select **no more than 5** claims in total.
8. The chooser shall include an **`Other`** option.
9. When `Other` is selected:
   - all claim selections shall be cleared and disabled
   - a free-input field shall be enabled
   - the newly entered input shall replace the original submission
   - the analysis shall restart from the beginning, **before claim extraction**
10. The replacement input entered through `Other` shall follow the same input parsing and validation rules as the current `/analyze` submission flow, including text/URL detection and input validation limits.
11. The system shall support a **non-interactive user configuration**.
12. In non-interactive mode, the chooser UI shall be skipped and the system shall automatically continue using the LLM-recommended selection.
13. In non-interactive mode, `Other` is not offered because no user interaction occurs.
14. The system shall persist, for auditability:
   - the full Stage 1 candidate claim set
   - the LLM-recommended claim IDs
   - the final selected claim IDs
   - the selection mode (`interactive` or `automatic`)
   - whether the input was restarted via `Other`

### Explicit Scope Boundary

- v1 of this feature applies only to the current Stage 1 final `atomicClaims`.
- It does **not** introduce or depend on `topLevelProposition`.
- It does **not** change how Stage 1 extracts or validates claims.
- It does **not** change report aggregation semantics by itself; it only changes which claims proceed into the existing downstream stages.

### Acceptance Anchors

- For hosted job `a59e4a6e1e184c22ad8055e34a52beeb` (Iran / WMD article, created 2026-04-22), the chooser must show the same final 22 atomic claims that the current run analyzed today, not a new or reduced decomposition.
- For hosted job `3469b32536004b369501b4cdd11e7dd5` (Bolsonaro fairness input, created 2026-04-21), the chooser must show the same 3 final atomic claims.
- For hosted job `26432b9bb47f409c97155a148b65566c` (Bundesrat input, created 2026-04-21), the chooser must show the same single final atomic claim.

## Recommended Architecture Clarifications

- Prefer a dedicated user-action-required job state such as `AWAITING_CLAIM_SELECTION`; do not reuse the current system `PAUSED` semantics.
- Prefer treating `Other` as a fresh analysis attempt from the user’s perspective; the backend may implement this as a new job/attempt, but the observable behavior must be a full restart before Stage 1.
- For rollout safety, keep `interactive` vs `automatic` behind explicit configuration, because the current public submission flow is single-step and synchronous from the user perspective.
