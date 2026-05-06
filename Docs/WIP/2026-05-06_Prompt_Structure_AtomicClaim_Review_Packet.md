# Prompt Structure, Compactness, and AtomicClaim Definition Review Packet

**Date:** 2026-05-06
**Author:** Codex, Senior Developer
**Status:** Reviewed by Gemini / Claude-style reviewers; approved with blocking amendments captured below
**Related investigation:** `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`

## Purpose

This packet documents the consolidated agent assessment of three improvement ideas:

1. Structuring prompts better.
2. Making prompts more compact while keeping them precise.
3. Defining and enforcing `AtomicClaim` more strongly.

The target reviewers should assess whether the proposed direction is architecturally sound, whether the sequencing is correct, and whether any proposal risks violating FactHarbor's core rules: no domain-specific hardcoding, no deterministic semantic filters, multilingual robustness, UCM-managed analysis behavior, and prompt edits only with explicit Captain approval.

## Review Consolidation: 2026-05-06

Three independent reviews approved the direction with targeted amendments:

| Reviewer | Disposition | Blocking / required amendments |
|---|---|---|
| Gemini, Independent Senior Architect | Approve with conditions | Define exact audit JSON schema before implementation; strongly weight relation-claim exception to avoid over-splitting. |
| Lead Developer + LLM Expert | Approve with targeted amendments | Add scope-preservation clause; add `splitConfidence`; add `preservedRelationClaims`; specify audit placement after contract validation; add measurable over-splitting gate. |
| Senior Architect / LLM Expert | Approve with amendments | Operationalize atomicity via "different directional verdicts"; replace free-text `repairGuidance` with structured `splitRecommendation`; include Gate 1 re-entry; use `distinctEvents` as a structural pre-signal; add evidence schema-drift alignment before Stage 2 repair. |

Consolidated decision:

- Phase 1 may proceed only after the exact audit schema, placement, retry loop, and validation matrix below are accepted.
- Physical prompt splitting remains deferred.
- Prompt compaction remains deferred except for surgical schema-alignment edits.
- Stage 2 target-identity work may be designed in parallel, but should ship after Stage 1 so validation runs exercise improved claim shape.

## Accepted AtomicClaim Definition Amendment

The original definition was directionally correct but too abstract. Reviewers warned that "one primary truth condition" and "independently verifiable" can cause either under-splitting or over-splitting unless made operational.

Accepted definition for implementation planning:

> An `AtomicClaim` asserts one proposition about one target path: entity plus process/outcome plus standard or criterion. If two sub-propositions inside a claim can receive different directional verdicts from different evidence, they must be separate `AtomicClaim`s, even if they share the same entity, process, institution, or standard.

Scope-preservation clause:

> When the user's input explicitly treats a multi-phase process, multi-component system, or multi-actor institution as a single unit, the claim remains atomic at that granularity unless the components have materially different truth conditions. Different evidence sources, evaluation difficulty, or process phases alone do not force a split.

Relation-claim exception:

> A relation claim can remain atomic when the relation itself is the truth condition. The audit must distinguish a relation/comparison/temporal assertion from a conjunction of independent assessments. "A happened before B" or "A is more efficient than B" can be one atomic relation claim; "A was lawful and B was fair" is not one relation claim merely because both clauses share an entity or proceeding.

Operational test:

- Split when sub-propositions can be directionally evaluated differently.
- Preserve when the claim's truth depends on one relation or one whole-unit process assertion.
- Do not split solely because evidence sources differ.
- Do not drop low-yield or normative input-authored branches; extract them if thesis-central and let ACS decide recommendation.

## Accepted Audit Placement And Retry Loop

The multi-claim atomicity audit must be a **separate LLM call after contract validation passes**, not merged into `CLAIM_CONTRACT_VALIDATION`.

Reason:

- Contract validation asks whether the accepted claim set preserves the user's input contract.
- Atomicity audit asks whether each accepted claim is internally atomic.
- Combining both in one LLM call would add competing objectives to an already dense validation prompt.

Accepted flow:

1. Pass 1 / Pass 2 extraction produces candidate claims.
2. Gate 1 filters validity.
3. Contract validation confirms input-contract preservation.
4. Multi-claim atomicity audit runs on the accepted claim set, using accepted claims plus Pass 1 `distinctEvents` as structural context.
5. If any finding has `splitConfidence = "high"` and a valid `splitRecommendation`, feed the proposed subclaims as **seeds** into the existing Pass 2 retry/repair path.
6. Re-run Gate 1.
7. Re-run contract validation on the repaired set.
8. Re-run the atomicity audit once, with a bounded retry count. Do not loop indefinitely.

Medium- or low-confidence findings must not trigger automatic repair:

- `high`: triggers Pass 2 repair retry.
- `medium`: observability only; no automatic repair.
- `low`: log/ignore unless later evidence shows a repeated issue.

## Accepted Audit Output Contract

The audit output must be structured enough to avoid free-text repair becoming a hidden selector. `repairGuidance` is rejected as the primary contract.

Proposed JSON schema shape for implementation review:

```ts
type AtomicityAuditOutput = {
  auditDecision: "pass" | "repair_recommended" | "observe_only";
  structuralSignals: {
    acceptedClaimCount: number;
    distinctEventCount: number;
    distinctEventsExceededClaims: boolean;
  };
  bundledClaimFindings: Array<{
    originalClaimId: string;
    splitConfidence: "high" | "medium" | "low";
    issueType:
      | "bundled_subpropositions"
      | "fused_distinct_events"
      | "overbroad_target_path"
      | "relation_exception_considered";
    directionalVerdictRisk: "different_possible" | "same_truth_condition" | "unclear";
    propositionUnits: Array<{
      text: string;
      targetPath: string;
      standardOrCriterion?: string;
      processOrOutcomeDimension?: string;
      canReceiveDifferentDirectionalVerdict: boolean;
    }>;
    splitRecommendation?: {
      originalClaimId: string;
      proposedSubclaims: string[]; // candidate seed text, not final accepted claims
      splitReason: string;
    };
  }>;
  preservedRelationClaims: Array<{
    claimId: string;
    relationType: "comparison" | "temporal" | "whole_process" | "other";
    preservationReason: string;
  }>;
};
```

Implementation rules:

- `splitRecommendation.proposedSubclaims` are candidate seeds only.
- Pass 2 still performs extraction; the audit does not directly create final claims.
- `missingPropositionUnits` should remain primarily a contract-validation concern, not an atomicity-audit trigger, unless the missing unit is caused by fusing/bundling inside an accepted claim.
- `preservedRelationClaims` is required for false-positive tracking and relation-exception validation.

## Additional Required Amendments

### Evidence Schema Drift Step

Before or alongside Stage 2 directness/applicability repair, align `EXTRACT_EVIDENCE` prompt category labels with the runtime `EvidenceItem.category` enum values.

Rationale:

- The prompt audit found category labels such as `statistical_data` / `expert_testimony` while runtime code normalizes toward labels such as `statistic`, `expert_quote`, and `evidence`.
- This is a low-risk surgical prompt/schema alignment and should reduce hidden normalization noise before Stage 2 directness work.

This is not the first Stage 1 atomicity slice unless the implementer touches Stage 2 prompts. It is a prerequisite for credible Stage 2 applicability repair.

### Budget / Over-Splitting Guard

Over-splitting must be measured, not merely warned about.

Validation gate:

- On stable control inputs (`hydrogen-en`, `plastic-en`, `asylum-235000-de`), prepared claim count should not increase by more than 50% relative to the pre-audit baseline.
- These controls should normally preserve the same claim count.
- Any >50% increase is a regression signal requiring review before live expansion.

Configuration note:

- Budget enforcement should remain ACS's job.
- If the audit increases claim counts in legitimate broad inputs, the cap belongs in UCM/ACS configuration, not in a conservative semantic audit that hides real claim structure.
- If a new tunable is needed, use UCM rather than a hardcoded semantic cap.

### DistinctEvents Pre-Signal

The audit should consume Stage 1 `distinctEvents` as context.

Reason:

- `distinctEvents > acceptedClaims` is a strong structural hint of possible fusion.
- This is not a deterministic semantic decision; it is a structural pre-signal that helps the LLM focus its audit.
- The final split/no-split decision remains LLM-powered.

### Heartbeat Headroom

The runner heartbeat / stale-job fix must be designed with headroom for higher legitimate claim counts after atomicity repair. The Portuguese job showed that 103 normalized scopes plus long Stage 3/4 calls can trip stale detection while analysis continues.

## Consolidated Validation Matrix

The first implementation slice needs both focused unit/fixture tests and a small live canary. Captain-defined live inputs remain mandatory for live analysis jobs.

| Case | Input source | Purpose | Live job allowed? |
|---|---|---|---|
| `bolsonaro-en` | Captain-defined | Failing anchor; should split proceedings and verdicts. | Yes |
| `bolsonaro-pt` | Captain-defined | Multilingual control; already splits correctly and must not degrade. | Yes |
| `bundesrat-rechtskraftig` | Captain-defined | Relation/temporal claim preservation; should not shatter a before/after assertion into useless fragments. | Yes |
| `bundesrat-simple` | Captain-defined | German relation/temporal variant without `rechtskräftig` anchor. | Yes |
| `hydrogen-en` | Captain-defined | Stable control; claim count should not inflate. | Yes |
| `plastic-en` | Captain-defined | Stable broad evaluative control; detects over-splitting/Stage 4 collateral effects. | Yes |
| German compound-claim fixture | Unit/fixture only unless Captain defines a live input | Tests German coordinated-clause behavior beyond Bundesrat relation cases. | No, unless Captain approves exact live wording |
| Synthetic relation fixture | Unit/fixture only unless Captain defines a live input | Tests relation-claim exception with comparison/temporal relation. | No, unless Captain approves exact live wording |

Minimal live canary after implementation:

1. `bolsonaro-en`
2. `bolsonaro-pt`
3. `bundesrat-rechtskraftig`
4. `hydrogen-en` or `plastic-en`

Run more only if the first four classify cleanly.


## Current Context

Current local `main` contains the Lane 2/3 ACS observability and selected-claim admission/coverage work. The latest report-quality investigation concluded:

- Lane 2/3 should not be rolled back.
- Current Bolsonaro EN failures are not selected-claim starvation.
- Current bad Bolsonaro EN behavior shows at least two separate quality layers:
  - Stage 1 can bundle independently verifiable propositions inside one accepted claim.
  - Stage 2 can intermittently over-label collateral or opinion evidence as direct directional evidence.
- A Portuguese Bolsonaro preparation run showed Stage 1 can correctly split the same broad issue into three claims, but the final job failed later due to stale-job/heartbeat handling while analysis continued.

Important live-job anchors:

| Job | Commit | Input | Result | Key finding |
|---|---|---|---|---|
| `9ba14bc267a041ddb68d7db5e5caf031` | `1514c632` | `bolsonaro-en` | `LEANING-TRUE` 61/40 | Prepared only 2 claims; bundled proceedings + verdicts; selected claims searched; both claim verdicts `UNVERIFIED`. |
| `1ae07d6fa0fc441e9a2558fefddb9612` | `1514c632` | `bolsonaro-en` | `LEANING-FALSE` 32/59 | Same 2-claim preparation; no ACS starvation; severe direct-contradiction skew. |
| `91bf6083d26e407c98a474d89d2e618f` | `b5421841` | `bolsonaro-en` | `LEANING-TRUE` 63/52 | Best exact structural comparator; prepared/selected/final 3 claims: domestic law, proceedings fair-trial standards, verdicts fair-trial standards. |
| draft `440b29639f344361934ac45a3f01442e` -> job `5a11109215c54e95a0d5d1269d160ca3` | `1514c632` | `bolsonaro-pt` | final job failed | Preparation correctly produced 3 claims; ACS selected 2 objective compliance claims; final failed due to stale-job watchdog while analyzer continued. |

## Source Architecture Anchors

The known architectural gap is not simply "the prompt forgot to say split claims." The prompt already contains some atomicity language. The gap is enforcement coverage:

| Area | Current source anchor | Observation |
|---|---|---|
| Prompt section registry | `apps/web/prompts/claimboundary.prompt.md` frontmatter includes `CLAIM_CONTRACT_VALIDATION`, `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`, and binding appendix sections. | The structure exists; the issue is not absence of a section. |
| Contract validation prompt | `apps/web/prompts/claimboundary.prompt.md` `CLAIM_CONTRACT_VALIDATION` | It warns against non-atomic bundling, but current English runs still approve a bundled claim inside a multi-claim set. |
| Single-claim validator prompt | `apps/web/prompts/claimboundary.prompt.md` `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` | Good targeted tool for one-claim collapse, but by design does not cover multi-claim sets. |
| Runtime guard | `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `runSingleClaimAtomicityValidationWithRecheck(...)` | The function returns early when `claims.length !== 1`. |
| Runtime contract validation | `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `runClaimContractValidation(...)` | Contract validation is the likely place to add a generic multi-claim atomicity / coverage audit. |
| Prompt loading | `apps/web/src/lib/analyzer/prompt-loader.ts`, `loadAndRenderSection(...)` | Runtime renders a named section. Physical file split would not itself change the model input for a section. |
| Prompt split plan | `Docs/WIP/2026-04-20_Prompt_Split_Plan.md` | Option E targeted reads are implemented; physical split is explicitly deferred unless the file grows, concurrent editing becomes costly, section-level admin versioning is needed, or model context limits shrink. |

## Consolidated Agent Assessment

### 1. Better Prompt Structure

**Potential:** High for maintainability, review quality, drift detection, and debugging. Low as a direct quality fix by itself.

The agents agree that better structure would help humans and reviewers reason about the prompt system. The strongest practical improvements are:

- A section manifest that maps prompt sections to pipeline stages, runtime callers, schemas, and model tasks.
- Section hashes and section-size reporting for prompt provenance/debugging.
- Tests that detect prompt/runtime schema drift, especially where prompt outputs use labels that code later normalizes.
- An invariant map linking the same doctrine across sections, for example Stage 1 atomicity, Stage 2 directness, and Stage 4 citation discipline.

**Recommendation:** Improve prompt governance and section-level documentation first. Do not physically split `claimboundary.prompt.md` as part of the report-quality fix.

**Why not physical split now:** The current failure does not come from agents reading too much file text. Runtime already loads sections. Physical splitting would touch UCM seeding, prompt hash provenance, admin diff/export/versioning, tests, and old line references without changing the failing model instructions.

**Risks:**

- UCM/provenance breakage if physical split changes how one prompt profile hash is computed.
- Admin UI and reseed complexity.
- Reviewers might mistake file organization for behavior change.
- Old line references in handoffs and investigation docs become stale.

### 2. Compact But Precise Prompts

**Potential:** Medium to high. Compacting prompts can reduce ambiguity, schema drift, and token cost, but only if each section keeps the local instructions needed by that specific LLM call.

The prompt audit found that `claimboundary.prompt.md` is not merely long; it contains cross-stage redundancy because each model call sees only one section. Some redundancy is intentional. Removing it globally can make a section locally under-specified even if another section still says the rule.

Good candidates for compactness work:

- Remove or consolidate duplicated wording inside a single section.
- Replace long prose with tighter decision tables where schema outputs are already structured.
- Align prompt category labels with runtime enums to reduce normalization noise.
- Move repeated invariant wording into a shared appendix only when the runtime actually includes that appendix in the relevant calls.

Bad candidates for compactness work:

- Broad rewrite of all prompt sections in one slice.
- Removing repeated safety/invariant language merely because it appears elsewhere in the same file.
- Compressing multilingual or generic-hygiene instructions until edge-case behavior becomes implicit.

**Recommendation:** Do surgical section-level compaction only after a concrete failing artifact identifies the section. Every prompt edit should remain topic-neutral and should be validated against at least one target input and one control input.

**Risks:**

- Over-compression can lose edge-case protections.
- Section-local instructions may become incomplete because runtime does not send the full file to the model.
- Smaller prompts can become less precise if the removed words encoded important distinctions.
- Large rewrites make it hard to attribute improvements or regressions.

### 3. Better AtomicClaim Definition

**Potential:** Very high. The agents rated this as the most important near-term report-quality lever.

Current failure pattern:

- The system can correctly identify multiple distinct events or salience anchors.
- It can still accept a claim that bundles independently verifiable proposition units when the overall returned claim set contains more than one claim.
- The existing single-claim atomicity validator does not apply to this case because it only runs for one-claim sets.

Proposed stronger definition:

> See the accepted reviewed definition in "Accepted AtomicClaim Definition Amendment" above. The authoritative operational test is whether sub-propositions inside a claim can receive different directional verdicts from different evidence, with explicit scope-preservation and relation-claim exceptions.

Operational implications:

- "The proceedings met fair-trial standards" and "the verdicts met fair-trial standards" are separate when proceedings and verdicts can be independently evaluated.
- "The process respected procedural law and constitutional requirements" may need separate claims when those are independently verifiable legal standards.
- A relation claim can remain atomic when the claim's truth condition is the relation itself, for example a comparison or before/after assertion.
- Normative or low-verifiability branches should still be extracted when they are input-authored and thesis-central; ACS may later choose not to select them for Stage 2 if v1 recommendation rules deem them low-yield or opinion-like.

Recommended implementation direction:

- Add a generic LLM-powered multi-claim atomicity / coverage audit in Stage 1.
- Run it as a separate LLM call after contract validation passes.
- It should inspect the whole accepted claim set and each individual accepted claim.
- It should return structured findings such as:
  - `bundledClaimIds`
  - `fusedPropositionUnits`
  - `splitConfidence`
  - `splitRecommendation`
  - `preservedRelationClaims`
- High-confidence failed findings should feed candidate split seeds into the existing Pass 2 retry/repair path, then re-enter Gate 1 and contract validation.

**Do not implement this as deterministic text logic.** The audit is semantic and must be LLM-powered.

**Risks:**

- Over-splitting increases claim count and can create budget pressure.
- Splitting normative claims too aggressively can produce claims that are low-yield or not fact-check-worthy; ACS must remain the post-Gate-1 recommendation authority.
- Poorly worded repairs can create a second selector or hidden claim dropping. The audit must preserve Stage 1 as extraction/validity authority and ACS as recommendation authority.
- Multilingual behavior must be validated; the Portuguese comparator shows better Stage 1 behavior than English, so the fix must not degrade PT.

## Recommended Sequencing

1. **AtomicClaim definition and Stage 1 audit first.**
   - Highest expected quality impact.
   - Directly addresses the stable English Bolsonaro structural defect.
   - Must be generic and LLM-powered.
   - Must use the reviewed schema and retry loop above.

2. **Stage 2 directness / applicability repair second.**
   - Needed because some runs show direct contradiction over-admission even when selected claims are searched.
   - Should use an LLM target-identity bridge audit for high-impact directional evidence.
   - Design may run in parallel with Stage 1, but shipping should wait until Stage 1 claim-shape validation is available.
   - Evidence extraction category-label drift should be aligned before or alongside this work.

3. **Runner heartbeat / long-call hardening third.**
   - Needed because the Portuguese final job failed from stale detection while analyzer continued.
   - This should be treated as runtime reliability, not prompt quality.

4. **Prompt governance structure in parallel or after the first fix.**
   - Section manifest, caller map, section hashes, schema-drift checks.
   - Avoid physical split until there is a concrete UCM/admin/concurrency reason.

5. **Prompt compaction only after section-local root cause is proven.**
   - Avoid broad rewrite.
   - Validate each compacted section with targeted tests and live canaries if quality-affecting.

## Review Questions For Claude And Gemini

1. Is the stronger `AtomicClaim` definition precise enough to prevent bundling without causing systematic over-splitting?
2. Is the proposed Stage 1 multi-claim atomicity / coverage audit the right enforcement point, or should it live elsewhere?
3. Does the proposed audit preserve the boundary between Stage 1 extraction/validity and ACS recommendation authority?
4. What structured output fields are necessary and sufficient for the audit to drive Pass 2 repair without introducing brittle logic?
5. Should any part of this be handled by prompt-only changes, or is runtime orchestration required?
6. Is the recommendation to defer physical prompt splitting still correct?
7. Which prompt-structure improvements are safe now, and which should wait until after report-quality fixes?
8. What validation set is sufficient for the first implementation slice?
9. What are the main regression risks for multilingual inputs, broad PDFs, and budget-aware selection?
10. Are there any hidden dependencies or prerequisites missing from this plan?

## Review Prompt For Claude

Use this prompt for Claude Opus/Sonnet:

```text
Role: Senior Architect and LLM Pipeline Reviewer.

Review `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md` and the referenced investigation doc `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`.

Assess the proposed direction for:
1. Better prompt structure.
2. More compact but precise prompts.
3. A stronger AtomicClaim definition and generic Stage 1 multi-claim atomicity / coverage audit.

Please check architecture boundaries, especially:
- no domain-specific hardcoding,
- no deterministic semantic filters,
- multilingual robustness,
- Stage 1 remains extraction/validity authority,
- ACS remains post-Gate-1 recommendation authority,
- prompt edits require Captain approval,
- UCM/provenance implications of any prompt restructuring.

Return findings by severity, then design decision assessment, missing evidence, recommended changes to the plan, and final disposition.
```

## Review Prompt For Gemini

Use this prompt for Gemini Architect:

```text
Role: Independent Senior Architect, multilingual LLM quality reviewer.

Review `Docs/WIP/2026-05-06_Prompt_Structure_AtomicClaim_Review_Packet.md`.

Focus on whether the plan correctly separates:
- prompt organization/governance,
- prompt compactness/precision,
- AtomicClaim semantics and enforcement,
- Stage 2 evidence directness/applicability,
- runner heartbeat/runtime reliability.

Challenge the proposed sequencing and risks. In particular:
- Would the proposed AtomicClaim definition over-split or under-split?
- Is a Stage 1 LLM-powered multi-claim audit the right mechanism?
- Should physical prompt splitting remain deferred?
- What minimal validation would prove the first slice?

Return blockers, non-blocking findings, architecture assessment, risk/opportunity analysis, and a concise recommendation.
```

## Current Disposition

The three independent reviews have confirmed the direction and amended the plan. Implementation may proceed from this packet only if the implementer uses the consolidated reviewed plan above, not the original pre-review sketch.

Implementation gates:

- Use the reviewed `AtomicClaim` definition with directional-verdict test, scope-preservation clause, and relation-claim exception.
- Implement the audit as a separate post-contract-validation LLM call.
- Use structured `splitRecommendation` seeds, not free-text repair guidance.
- Re-enter Pass 2, Gate 1, contract validation, and one bounded re-audit after high-confidence findings.
- Include `splitConfidence` and `preservedRelationClaims`.
- Feed `distinctEvents` into the audit as structural context.
- Validate against the consolidated matrix before live expansion.
- Do not physically split prompts in this slice.

## Implementation Status: 2026-05-06

Status: implemented in source and prompt contracts; not yet live-canary validated.

Implemented:

- Added a separate Stage 1 multi-claim atomicity audit after contract validation succeeds and the accepted claim set has more than one claim.
- Added structured audit output with `splitConfidence`, `directionalVerdictRisk`, `splitRecommendation`, and `preservedRelationClaims`.
- Added high-confidence repair routing through Pass 2 candidate seeds, Gate 1, contract validation, and one bounded re-audit.
- Added contract summary observability for audit decision, finding counts, repaired claim IDs, preserved relation claim IDs, retry trigger, retry acceptance, and structural signals.
- Added prompt sections `CLAIM_MULTI_CLAIM_ATOMICITY_AUDIT` and `CLAIM_MULTI_CLAIM_ATOMICITY_REPAIR_GUIDANCE` to `claimboundary.prompt.md`.
- Added focused schema/helper tests, prompt contract tests, frontmatter drift coverage, and updated Stage 1 pipeline tests for the new audit call.

Deliberately not changed:

- No physical prompt split.
- No broad prompt compaction.
- No Stage 2 directness/applicability repair.
- No evidence category schema-drift alignment yet.
- No Stage 3/runner heartbeat hardening.
- No Stage 4 verdict repair.
- No deterministic semantic text rules.
- No live analysis jobs from this slice yet.

Verification run:

- `npm -w apps/web test -- test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `npm -w apps/web test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `npm -w apps/web test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `npm test`
- `npm -w apps/web run build`

Next review focus:

- Confirm the new audit remains a Stage 1 validity/atomicity authority and does not become a selector.
- Check that high-confidence repair gating is strict enough to avoid speculative over-splitting.
- Check that relation, temporal, comparison, and whole-process exceptions are prominent enough in the audit prompt.
- After commit/restart/reseed, live validation should start with the Captain-defined Bolsonaro EN/PT, a German relation/control input, and a simple control input before broad PDF expansion.
