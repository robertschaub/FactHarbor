### 2026-04-08 | Senior Developer | Claude Code (Opus 4.6) | Fix 1 Strengthened Measurement — Modifier Preservation Still Failing + CH Regression
**Task:** Run 5 Bundesrat canaries (3 RK + 2 CH) on strengthened Fix 1 build `70d4b9b3` and measure against invariants.
**Files touched:** None (measurement only)
**Key findings:**

**Modifier preservation: still 1/3 — unchanged from first Fix 1 round.**
- RK-1: dropped "rechtskräftig", validator hallucinated approval (cited non-existent AC_03) → MT 78
- RK-2: preserved in both claims, validator honest → FALSE 11 (analytically correct)
- RK-3: dropped "rechtskräftig" → LF 31

**Anti-inference: 2/2 clean.** No normative claims injected on chronology variant. This part continues to work.

**NEW REGRESSION: chronology variant collapsed from TRUE 88-89 to FALSE 14 / MF 27.**
- CH-1: FALSE 14/74 — AC_01 truth=15, misleadingness=highly_misleading
- CH-2: MF 27/58 — AC_01 truth=15, misleadingness=highly_misleading
- On the first Fix 1 build (`6b2f3df8`), CH runs were TRUE 88/77 and TRUE 89/84
- The strengthened prompt appears to have caused Stage 4 to treat Bundesrat chronology claims as inherently misleading, penalizing truth scores on factually correct assertions

**Diagnosis:**
1. The modifier preservation prompt rules are insufficient to change LLM behavior on "rechtskräftig" — the LLM consistently treats it as non-essential German legal jargon rather than a truth-condition-bearing modifier
2. The contract validator's structured `truthConditionAnchor` output did not prevent hallucination — the validator fabricated citations to non-existent claims
3. The chronology regression suggests the strengthened Stage 1 prompt is having unintended downstream effects on Stage 4 verdict behavior, likely through the claim extraction framing influencing how the advocate assesses the topic

**Invariant scorecard:**
- Modifier preserved: 1/3 → **FAIL**
- No injection: 2/2 → **PASS**
- Zero hallucinations: 1/3 hallucinated → **FAIL**
- Direction stable: 67pp spread → **FAIL**
- CH factually correct: FALSE 14 / MF 27 (should be TRUE ~88) → **FAIL — regression**

**Open items:** The strengthened prompt approach is not working for modifier preservation. The chronology regression must be investigated before further iteration. Two possible paths: (1) revert the strengthening and keep only the anti-inference rule, (2) try a structural code-level post-check instead of more prompt rules.
**Warnings:** The chronology regression (TRUE 88 → FALSE 14) is the most concerning finding. It may indicate that stronger Stage 1 rules are creating a framing effect that bleeds into Stage 4 truth assessment.
**For next agent:** Full measurement data in this entry. The decision is: revert the strengthening, keep the first Fix 1 (which had anti-inference working + 1/3 preservation), and consider whether a code-level structural check is needed for modifier preservation.
**Learnings:** Prompt-level modifier preservation rules at the tested strength are insufficient to reliably change Haiku/Sonnet behavior on German legal qualifiers. The LLM treats "rechtskräftig" as a stylistic intensifier rather than a truth-condition modifier. Strengthening the prompt further risks downstream regression (observed: chronology variant collapsed).