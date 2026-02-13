# Phase 2 Prompt-Change Approval Patch (2026-02-13)

## Purpose
Request explicit approval to update orchestrated analysis prompts for:
- Direction-validation reasoning quality (reduce false-positive mismatch warnings)
- Qualifier preservation in claim decomposition (prevent loss of critical conditions like negation/modality)

No runtime code changes are included in this patch. This is prompt text only.

## Why This Patch Is Needed
- Current direction-validation warnings can misread implication chains on nuanced claims.
- Sub-claim decomposition can drop critical qualifiers from the thesis, making downstream validation ambiguous.
- Phase 1 handled source-acquisition warning coverage; this patch addresses Phase 2 semantic-quality gaps.

## Files and Sections Proposed
- File: `apps/web/prompts/orchestrated.prompt.md`
- Sections:
  - `VERDICT_DIRECTION_VALIDATION_BATCH_USER`
  - `UNDERSTAND`
  - `SUPPLEMENTAL_CLAIMS`

## Proposed Changes (Exact Text)

## 1) `VERDICT_DIRECTION_VALIDATION_BATCH_USER`

### Add block after current alignment bullets and before `${VERDICT_DIRECTION_PAIRS}`:

```markdown
### SEMANTIC INTERPRETATION RULES (CRITICAL)

Evaluate meaning through explicit inference chains, not keyword matching.

1. Requirement evidence vs. outcome evidence:
   - If evidence says a process REQUIRES verification/corroboration, that supports claims that verification is needed.
   - The same evidence contradicts claims that reliability exists WITHOUT verification/corroboration.

2. Verification mechanisms count as corroboration:
   - Peer review, independent checks, quality controls, audits, and formal verification mechanisms are forms of corroboration.
   - Do not treat "has verification mechanisms" as evidence that corroboration is unnecessary.

3. Preserve claim qualifiers:
   - Respect qualifiers such as "without", "only if", "requires", "independent", "in all cases", and time qualifiers.
   - A verdict is misaligned if those qualifiers are ignored in the support/contradiction assessment.

4. Contestation vs contradiction:
   - Dispute over interpretation can reduce confidence but does not automatically invert factual direction.
   - Only direct factual contradiction should drive low-direction judgments.

### ABSTRACT EXAMPLES

Example A:
- Claim: "Entity outputs are reliable without independent verification."
- Evidence: "Formal standards require independent verification and peer review."
- Correct directional reading: evidence CONTRADICTS the claim.

Example B:
- Claim: "Entity outputs require corroboration to be considered reliable."
- Evidence: "Standards mandate peer review, independence safeguards, and documentation checks."
- Correct directional reading: evidence SUPPORTS the claim.
```

## 2) `UNDERSTAND`

### Add block under claim decomposition guidance (`CRITICAL: BREAK DOWN COMPOUND STATEMENTS INTO ATOMIC CLAIMS`):

```markdown
### QUALIFIER PRESERVATION (CRITICAL)

When decomposing into atomic claims, preserve the thesis-critical qualifiers exactly.

Do NOT drop or weaken qualifiers such as:
- negation/absence: "without", "no", "never"
- modality/requirement: "requires", "must", "only if"
- scope/universality: "always", "all", "in general"
- independence qualifiers: "independent", "external"
- temporal qualifiers: "current", "recent", date-bound scope

If a qualifier changes truth conditions, it must appear in at least one direct/core sub-claim.
```

## 3) `SUPPLEMENTAL_CLAIMS`

### Add bullet to existing rules list:

```markdown
- **CRITICAL**: Preserve thesis-critical qualifiers from the input (e.g., negation, requirement, independence, temporal scope). Do not generate replacement claims that remove these constraints.
```

## Safety/Compatibility Notes
- Changes are generic and multilingual-safe at semantic level.
- No domain-specific entities, dates, regions, or test-case terms are introduced.
- No schema/output contract changes are proposed in this phase.

## Validation Plan After Approval
- Re-run the two target jobs:
  - `5ccd80a70b16482297fe483b8d53ddeb`
  - `2cf7906206c740a9b1abec24758d419c`
- Compare:
  - `verdict_direction_mismatch` warning count and rationale quality
  - Whether core sub-claims preserve critical qualifiers from thesis/implied claim
  - Stability of verdict direction vs evidence interpretation

## Approval Request
Approve prompt-only updates in `apps/web/prompts/orchestrated.prompt.md` for the three sections above.

