# Lead Architect Review: 9e4d SRF Factchecking Investigation

## 1. Executive Summary
The proposed fix in the investigation handoff (2026-03-30_Senior_Developer_9e4d_SRF_Factchecking_Investigation.md) targets Stage 1 assertion extraction (Option A). This review overturns that recommendation. The core failure is a structural bug in Stage 4's verdict-integrity validation (Option B), where the LLM is fed the entire global evidence pool instead of claim-local evidence. This global scoping causes the LLM to cross-contaminate strong evidence from sibling claims into weakly-grounded claims, triggering false-positive erdict_integrity_failure downgrades.

## 2. What the job proves
- **Input:** "Die SRF leistet hervorragende Arbeit bei der Faktenprüfung"
- Stage 1 broke this down into three dimensions (quality, scope, transparency).
- AC_02 (scope) received 4 neutral evidence items and was initially graded at 50% truth / 24% confidence.
- Stage 4 direction validation flagged AC_02 for an integrity failure, hallucinating that a "global evidence mix (6 supports / 3 contradicts)" applied to it.
- This integrity failure downgraded AC_02 to UNVERIFIED / INSUFFICIENT.
- Stage 5 aggregation ran perfectly according to design: the UNVERIFIED status of a direct claim pulled the article confidence down to 24% (unresolved claims add uncertainty, never remove it). Article truth remained 58%.

## 3. Adjudication of competing explanations
**Primary Stage-1 explanation:**
*Verdict: Overruled as root cause.* While Stage 1 may have drifted slightly towards a proxy dimension ("scope of checking" vs "quality of checking"), this is an analytical drift, not a system failure. A claim with neutral evidence returning 50% truth is a *mathematically valid* and *healthy* leaf in the pipeline. It did not deserve to fail integrity.

**Primary downstream explanation:**
*Verdict: Upheld as root cause.* The direction validation step in Stage 4 explicitly leaked the 6 supports items from sibling claims into the validation context for AC_02. This global evidence pool allowed the LLM to misattribute evidence and falsely flag a perfectly sound middle-confidence verdict as an integrity failure.

## 4. Root cause hierarchy
1. **Primary Structural Bug (Stage 4 / Verdict Validation):** alidateVerdicts, alidateDirectionOnly, and ttemptDirectionRepair pass vidence.map({...}) (the complete boundary pool of evidence) into the prompt's videncePool variable.
2. **LLM Attention Flaw:** When presented with [verdict list] and [global evidence pool], the LLM checks the overall sentiment of the pool rather than strictly mapping erdict.supportingEvidenceIds to the items in that pool.
3. **Pipeline Reaction (Aggregation):** Works by design. Stage 5 clamped article confidence to 24% due to the dropped constraint from the false-positive integrity cascade.
4. **Minor Analytical Drift (Stage 1):** The ambiguous-single-claim decomposition extracted proxy dimensions. (Secondary, non-blocking).
5. **Recent ±10pp Clamp removal:** Irrelevant. Did not contribute to the bug. 58% article truth behavior is completely agnostic to this failure.

## 5. Recommended fix strategy
**Action:** Fix verdict-stage claim-local evidence scoping first (Option B).

**Design:**
Instead of passing the global videnceItem array as videncePool to unValidationCheckWithRetry, alidateDirectionOnly, and ttemptDirectionRepair, we must strict-scope the evidence.
- For bulk checks (unValidationCheckWithRetry): Redesign the prompt payload. Instead of passing separated arrays (erdicts array and videncePool array), embed the cited evidence *inside* the verdict object: erdicts: verdicts.map(v => ({ claimId, truthPercentage, citedEvidence: getCitedEvidenceMap(v, evidence) })). This prevents cross-claim hallucination natively.
- For isolated checks (alidateDirectionOnly and ttemptDirectionRepair): Explicitly filter videncePool to include only items that exist in citedIds. Never pass the global pool.

## 6. What not to change
- **No deterministic semantic heuristics:** Do not add heuristics to guess "proxy dimensions" in Stage 1.
- **No Stage 1 changes right now:** Fixing Stage 1 masks the Stage 4 bug. Let Stage 1 produce proxy claims for now so we can verify the Stage 4 structural fix handles uneven evidence distributions cleanly.
- **No ±10pp regression:** Do not restore the Stage 5 clamp.
- **No aggregation logic changes:** The confidence ceiling cascade worked perfectly as a structural watchdog.

## 7. Validation gate
- Stage 4 Unit / Integration Test: Mock an initial verdict array where AC_01 has 10 supports and AC_02 has 4 
eutrals with a 50% truth. Run validation. Assert that AC_02 does *not* trigger a erdict_direction_issue or erdict_integrity_failure.

## 8. Final judgment
**Claim-local verdict-scope fix justified**

**Recommended next task:** Fix Stage 4 Verdict Direction Validation Evidence Scoping
**Why this first:** The cross-contamination of global boundary evidence into individual claim integrity validation is a deterministic structural bug leading to false-positive UNVERIFIED cascades. Fixing Stage 1 proxy-extraction would only mask this fundamental Stage 4 bug, which will still trigger on any truly diverse evidence pool where sibling claims have varying support.
