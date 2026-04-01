# Stage 1 Narrow Hardening - Architect Review

## 1. Executive summary
This review assesses two narrow post-rollback Stage-1 hardening changes against the Apr 1 baseline: 
1. Remove the restored single_atomic_claim -> isDimensionDecomposition fallback.
2. Add a narrow re-validation guard before accepting a contract-correction retry output.

These changes surgically address structural weakness in the current rollback baseline without reintroducing the volatile candidate-selection logic of the reverted d04fc750/fff7a508 packages.

## 2. Assessment of change A
Remove the restored single_atomic_claim fallback.
Justified: Yes. The current heuristic (inputClassification === single_atomic_claim + high-centrality supporting claims) exempts fragmented claims from Gate 1 fidelity filtering. Because the Pass2OutputSchema defaults missing classifications to single_atomic_claim, omitted or pre-2.2 outputs falsely inherit this label, triggering over-fragmentation.
Low-risk: Yes. Trusting solely explicit ambiguous_single_claim restores strict fidelity gating for normal claims and forces the LLM to explicitly declare dimension intent.
Action: Remove this fallback from all three tagging sites in claim-extraction-stage.ts.

## 3. Assessment of change B
Add a narrow re-validation guard before accepting a contract-correction retry output.
Justified: Yes. Currently, if the first pass fails contract validation, it attempts a retry and unconditionally accepts the result. This risks accepting a retry that hallucinated worse splits or still violates the contract.
Low-risk: Yes. The proposed re-validation checks purely against the contract standard. If validateClaimContract(retryPass2).rePromptRequired is false, the retry succeeds. If true or undefined, the pipeline retains the original pass2 output (which at least survived initial Parse).
Action: Insert a single validateClaimContract check on the retry output. Do not include candidate comparisons, evidence-separability tie-breakers, or fewer-claims logic.

## 4. Recommended order
These changes cover mutual exclusive scopes within claim-extraction-stage.ts and address distinct pipeline weaknesses. They can and should be implemented simultaneously in a single commit, keeping the blast radius constrained.

## 5. Validation gate
- claim-contract-validation.test.ts (requires tests ensuring retry re-validation fallback to original).
- 5 validation jobs covering: SRG class (8640 family) for fragmentation, Bolsonaro controls, and standard single_atomic_claim throughput.

## 6. What not to do
- Do NOT reintroduce evidence-separability tiebreaks or candidate-scoring models.
- Do NOT implement deterministic semantic logic.
- Do NOT modify distinctEvents processing or prompts.
- Do NOT increase the number of retry loops.

## 7. Final judgment
Both narrow Stage-1 hardening changes justified
