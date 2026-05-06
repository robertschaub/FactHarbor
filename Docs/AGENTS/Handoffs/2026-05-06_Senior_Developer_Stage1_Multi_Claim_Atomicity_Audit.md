---
### 2026-05-06 | Senior Developer | Codex (GPT-5) | Stage 1 Multi-Claim Atomicity Audit
**Task:** Implement the reviewed Phase 1 Stage 1 multi-claim atomicity audit from `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md`.
**Files touched:**
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md`
- `Docs/AGENTS/Handoffs/2026-05-06_Senior_Developer_Stage1_Multi_Claim_Atomicity_Audit.md`
- `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Implemented the audit as a separate post-contract-validation Stage 1 LLM call, not as more rules inside `CLAIM_CONTRACT_VALIDATION`.
- Used the reviewed directional-verdict test, scope-preservation clause, and relation/comparison/temporal/whole-process exceptions.
- Used structured `splitRecommendation` candidate seeds, `splitConfidence`, `directionalVerdictRisk`, and `preservedRelationClaims`; no free-text repair instruction drives acceptance directly.
- High-confidence findings route through Pass 2, Gate 1, contract validation, and one bounded re-audit. Medium/low findings are observational only.
- `distinctEvents` is passed as advisory structural context only; it is not ground truth and does not authorize new claims.
- No Stage 2, Stage 3, Stage 4, ACS selection, physical prompt split, broad prompt compaction, or deterministic semantic text logic was added.
**Open items:**
- Live canaries have been submitted. Stage 1 claim-shape target is improved, but Bolsonaro EN final verdict remains wrong and should move to Stage 2/Stage 4 quality lanes.
- Evidence category schema-drift alignment remains a prerequisite before Stage 2 directness/applicability repair.
- Runner heartbeat hardening and Stage 4 verdict repair remain separate held lanes.
**Warnings:**
- This adds one extra LLM call for multi-claim sets that already passed contract validation. Cost/latency should be monitored during live canaries.
- Over-splitting risk was live-observed on the Hydrogen control in commit `5a744b1e`; commit `ba266a69` adds the `inputAuthoredSplitBasis` / derived-submetric guard and Hydrogen rerun passed preparation.
- If the audit finds high-confidence bundling but the bounded repair loop fails, Stage 1 marks the contract state failed rather than silently shipping the bundled set.
**For next agent:** Review `validateMultiClaimAtomicity`, `getHighConfidenceMultiClaimAtomicityRepairs`, and the new `CLAIM_MULTI_CLAIM_ATOMICITY_*` sections. The critical guard is that high-confidence repair now requires `inputAuthoredSplitBasis === "explicit_subpropositions"`. Remaining work should not add more Stage 1 atomicity logic before addressing Bolsonaro EN Stage 2/Stage 4 quality.
**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level rule beyond the already documented reviewed plan.

**Live canary results:**

| Input | Draft / job | Commit / prompt hash | Prepared / selected | Audit result | Final result | Assessment |
|---|---|---|---:|---|---|---|
| Bolsonaro EN | `cf1b26f...` / `febfd467...` | `5a744b1e` / `36898dc4...` | 3 / 3 | `observe_only`, high 0, medium 2 | `LEANING-FALSE` 39/44 | Claim separation fixed; verdict remains a separate Stage 2/Stage 4 issue. |
| Bolsonaro PT | `21061bb...` / `ef775c57...` | `5a744b1e` / `36898dc4...` | 3 / 2 | `observe_only`, high 0, medium 3 | `LEANING-TRUE` 67/66 | Multilingual claim-shape control passed. |
| Bundesrat rechtskraeftig | `ea446985...` / `a8db0a8c...` | `ba266a69` / `0b31c2df...` | 2 / 2 | `pass` | `MIXED` 52/77 | German temporal/relation control did not over-split. |
| Hydrogen initial | `016865c...` / none | `5a744b1e` / `36898dc4...` | 2 / 0 | `repair_recommended`, retry failed | Draft `FAILED` | Exposed derived-submetric over-splitting. |
| Hydrogen rerun | `9458631...` / `2c4e29cb...` | `ba266a69` / `0b31c2df...` | 2 / 2 | `pass` | `FALSE` 11/68 | Over-splitting preparation regression fixed. |

```text
DEBT-GUARD RESULT
Task classification: bugfix/regression quality fix, Full Path applied.
Root cause: existing Stage 1 contract validation and single-claim atomicity machinery did not audit internal bundling inside multi-claim accepted sets; the single-claim validator intentionally exits for `claims.length !== 1`.
Options considered: revert/quarantine prior changes (rejected; no prior change caused this), extend deterministic structural logic (rejected; semantic text decision), add one bounded LLM audit mechanism reusing existing Stage 1 retry path (chosen).
Complexity budget: one new Stage 1 audit call, one new repair-guidance section, one bounded retry/re-audit path, focused tests only.
Validation: targeted schema/prompt/pipeline tests passed, full safe `npm test` passed, `npm -w apps/web run build` passed.
Failed-attempt recovery: live Hydrogen control failed under `5a744b1e`; classified as keep + amend, not revert. `ba266a69` adds LLM-output structural guard `inputAuthoredSplitBasis` and prompt guidance against derived-submetric repairs.
Validation after amendment: targeted schema/prompt/pipeline tests passed, full safe `npm test` passed, `npm -w apps/web run build` passed, Hydrogen rerun passed preparation and final report.
Residual risk: Bolsonaro EN verdict remains wrong despite fixed claim separation; investigate Stage 2 applicability/directness and Stage 4 verdict aggregation next.
```
