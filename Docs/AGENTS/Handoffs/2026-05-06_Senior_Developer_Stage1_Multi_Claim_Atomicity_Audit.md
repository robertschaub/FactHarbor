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
- No live analysis jobs have been submitted from this slice yet. Per live-job discipline, commit first, restart/reseed, then run the Captain-defined validation inputs.
- Evidence category schema-drift alignment remains a prerequisite before Stage 2 directness/applicability repair.
- Runner heartbeat hardening and Stage 4 verdict repair remain separate held lanes.
**Warnings:**
- This adds one extra LLM call for multi-claim sets that already passed contract validation. Cost/latency should be monitored during live canaries.
- Over-splitting risk is controlled by high-confidence gating and relation/scope exceptions, but must be validated multilingual: Bolsonaro EN/PT, German relation/control, and a simple control before broad PDF expansion.
- If the audit finds high-confidence bundling but the bounded repair loop fails, Stage 1 marks the contract state failed rather than silently shipping the bundled set.
**For next agent:** Review `validateMultiClaimAtomicity`, `getHighConfidenceMultiClaimAtomicityRepairs`, and the new `CLAIM_MULTI_CLAIM_ATOMICITY_*` sections. Live validation should start only after commit/restart/reseed and should compare prepared claim counts and claim-level verdicts against the expectation doc.
**Learnings:** Not appended to `Role_Learnings.md`; no durable role-level rule beyond the already documented reviewed plan.

```text
DEBT-GUARD RESULT
Task classification: bugfix/regression quality fix, Full Path applied.
Root cause: existing Stage 1 contract validation and single-claim atomicity machinery did not audit internal bundling inside multi-claim accepted sets; the single-claim validator intentionally exits for `claims.length !== 1`.
Options considered: revert/quarantine prior changes (rejected; no prior change caused this), extend deterministic structural logic (rejected; semantic text decision), add one bounded LLM audit mechanism reusing existing Stage 1 retry path (chosen).
Complexity budget: one new Stage 1 audit call, one new repair-guidance section, one bounded retry/re-audit path, focused tests only.
Validation: targeted schema/prompt/pipeline tests passed, full safe `npm test` passed, `npm -w apps/web run build` passed.
Residual risk: live report quality unvalidated; added LLM call may affect cost/latency and over-splitting must be checked in canaries.
```
