# LLM Prompt Improvement Plan — Anti-Hallucination & Quality

**Status:** In Progress
**Created:** 2026-02-10
**Based on:** `Anti_Hallucination_Strategies.md` risk matrix (M1-M10)

## Problem Statement

FactHarbor's analysis pipeline uses LLMs at multiple stages (Understand → Extract Evidence → Verdict). The `Anti_Hallucination_Strategies.md` risk matrix identified 10 measures (M1-M10), with P0 measures (M1: negative prompting, M4: evidence-over-priors) flagged as "zero cost, do now" — but they were never implemented.

Deep investigation of the actual prompt files revealed 9 specific gaps.

## Key Findings

### F1: M1 negative prompting — NOT in verdict prompts
The verdict prompt says "Use ONLY provided evidence" but never says what to do when evidence is insufficient. No "bounce-back" protection against confident fabricated reasoning.

### F2: M4 evidence-over-priors — too weak
Knowledge Cutoff Awareness addresses recency only, not contradictions between web evidence and training knowledge.

### F3: UNDERSTAND phase ignores `allowModelKnowledge`
The `OrchestratedUnderstandVariables` interface has no `allowModelKnowledge` field. LLM can use training data to bias claim decomposition and AnalysisContext creation even in evidence-only mode.

### F4: EXTRACT_EVIDENCE has no anti-fabrication instructions
No "do not fabricate", "do not use training knowledge", or "extract ONLY from source text" instructions exist.

### F5: Confidence guidance is minimal
Inline verdict prompts say only "A NUMBER from 0-100" — no calibration bands (which exist in verdict-base.ts but not in the inline prompts actually used).

### F6: `allowModelKnowledge` has 8 injection sites with inconsistent wording
Three parallel prompt-building paths with different wording at each site.

### F7: No post-verdict grounding validation (M2)
`supportingEvidenceIds` are required in output but never validated against reasoning.

### F8: No grounding_ratio for confidence calibration (M3)
Zero matches for grounding ratio anywhere in the codebase.

### F9: No CoT problem (good news)
No "think step by step" patterns. Correct per research showing CoT has declining effectiveness.

## Phase A: Zero-Cost Prompt Edits

| ID | Change | Files | Addresses |
|----|--------|-------|-----------|
| A1 | Add M1 negative prompting + M4 evidence-over-priors to verdict | `orchestrated.ts` (getKnowledgeInstruction), `verdict-base.ts`, `knowledge-mode.ts` | F1, F2 |
| A2 | Add anti-fabrication to EXTRACT_EVIDENCE | `orchestrated.prompt.md`, `extract-evidence-base.ts` | F4 |
| A3 | Add `allowModelKnowledge` to UNDERSTAND phase | `orchestrated-understand.ts`, `orchestrated.ts` | F3 |
| A4 | Add confidence calibration bands to inline verdict prompts | `orchestrated.ts` (2 sites) | F5 |
| A5 | Consolidate `allowModelKnowledge` injection (replace 2 inline ternaries) | `orchestrated.ts` | F6 |
| A6 | Add FINAL VALIDATION checklist to verdict prompt | `orchestrated.ts`, `verdict-base.ts` | F1, F7 |

## Phase B: Low-Cost Post-Processing

| ID | Change | Files | Addresses |
|----|--------|-------|-----------|
| B1 | Post-verdict grounding check (heuristic) | New: `grounding-check.ts` or inline in `orchestrated.ts` | F7 |
| B2 | Grounding ratio → confidence adjustment (5th layer) | `confidence-calibration.ts` | F8 |
| B3 | Add `allowModelKnowledge` to UNDERSTAND interface (code) | `orchestrated-understand.ts` | F3 |

## Research Evidence

| Recommendation | Grade | Source |
|---|---|---|
| M1 negative prompting | A | FactHarbor risk matrix; anti-hallucination research |
| M4 evidence-over-priors | A | FactHarbor risk matrix; temporal blindness research |
| Self-verification checklist | B | ClaimVer: 31-35% factuality improvement |
| Confidence calibration bands | B | ICLR 2024: LLMs are overconfident |
| Post-verdict grounding | B | AGREE framework; FACTS benchmark |
| No CoT for verdict | B | Wharton 2025: Decreasing Value of CoT |
| Extract-evidence anti-fabrication | C | Best practice consensus |

## Verification

1. `npm -w apps/web run build` — must pass
2. Manual test: Run analysis with `allowModelKnowledge=false` on a time-sensitive claim
3. Check verdict doesn't contain unsupported reasoning
4. Update `Anti_Hallucination_Strategies.md` to mark M1, M4 as IMPLEMENTED
