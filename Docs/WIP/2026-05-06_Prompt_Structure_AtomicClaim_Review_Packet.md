# Prompt Structure, Compactness, and AtomicClaim Definition Review Packet

**Date:** 2026-05-06
**Author:** Codex, Senior Developer
**Status:** Ready for external architecture review by Claude and Gemini
**Related investigation:** `Docs/WIP/2026-05-05_Report_Expectations_vs_Post_Deployed_22_4_Comparison.md`

## Purpose

This packet documents the consolidated agent assessment of three improvement ideas:

1. Structuring prompts better.
2. Making prompts more compact while keeping them precise.
3. Defining and enforcing `AtomicClaim` more strongly.

The target reviewers should assess whether the proposed direction is architecturally sound, whether the sequencing is correct, and whether any proposal risks violating FactHarbor's core rules: no domain-specific hardcoding, no deterministic semantic filters, multilingual robustness, UCM-managed analysis behavior, and prompt edits only with explicit Captain approval.

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

> An `AtomicClaim` is one independently verifiable assertion with one primary truth condition. It must have a single main target object or target path, one principal standard or measurable criterion, and one event/process/outcome dimension. If two parts can be supported, contradicted, researched, or assessed differently, they must be separate AtomicClaims unless the user's assertion is explicitly about the relation between those parts.

Operational implications:

- "The proceedings met fair-trial standards" and "the verdicts met fair-trial standards" are separate when proceedings and verdicts can be independently evaluated.
- "The process respected procedural law and constitutional requirements" may need separate claims when those are independently verifiable legal standards.
- A relation claim can remain atomic when the claim's truth condition is the relation itself, for example a comparison or before/after assertion.
- Normative or low-verifiability branches should still be extracted when they are input-authored and thesis-central; ACS may later choose not to select them for Stage 2 if v1 recommendation rules deem them low-yield or opinion-like.

Recommended implementation direction:

- Add a generic LLM-powered multi-claim atomicity / coverage audit in Stage 1.
- Run it in or adjacent to contract validation, not only after Gate 1.
- It should inspect the whole accepted claim set and each individual accepted claim.
- It should return structured findings such as:
  - `bundledClaimIds`
  - `missingPropositionUnits`
  - `fusedPropositionUnits`
  - `independentlyVerifiableSubclaims`
  - `repairGuidance`
- Failed findings should feed the existing Pass 2 retry/repair path with topic-neutral guidance.

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

2. **Stage 2 directness / applicability repair second.**
   - Needed because some runs show direct contradiction over-admission even when selected claims are searched.
   - Should use an LLM target-identity bridge audit for high-impact directional evidence.

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

Implementation should not start from this packet until at least one independent review confirms or amends:

- the exact `AtomicClaim` definition,
- the audit placement,
- the structured output contract,
- the first validation set,
- and whether any prompt text should change in the first slice.
