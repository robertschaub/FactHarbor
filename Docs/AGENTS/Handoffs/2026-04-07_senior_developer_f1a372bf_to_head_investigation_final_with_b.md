### 2026-04-07 | Senior Developer | Claude Code (Opus 4.6) | f1a372bf-to-HEAD Investigation — Final with Bundesrat Failures
**Task:** Deep dual-environment investigation of all jobs from baseline `f1a372bf` through HEAD `442a5450`, plus detailed Bundesrat EU-Vertrag failure analysis.
**Files touched:** `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md` (updated with 3 critical findings)
**Key findings:**

**Three critical Bundesrat failure modes (all on deployed `f1a372bf`, same input, 70pp spread):**

1. **Stage 1 keyword omission** (`094e88fc`): "rechtskräftig" silently dropped during decomposition → both atomic claims are trivially-true chronology → verdict TRUE 86. The user's core assertion (legally binding) goes unverified.
2. **Stage 5 aggregation underweighting** (`0afb2d88`): Stage 1 correctly extracts "rechtskräftig" as AC_03 (LEANING-FALSE 30/68), but trivially-true AC_01 (82) + AC_02 (85) outweigh it → verdict LT 70. Headline acknowledges the problem but the number doesn't reflect it.
3. **Stage 1 interpretation injection** (`b843fe70`): Stage 1 invents "verstößt gegen die verfassungsrechtliche Ordnung" — not in the input — then finds it false → drags verdict to MF 16.

Only one run (`0afb2d88`) decomposed correctly, but even that failed at aggregation.

**Other findings (unchanged from earlier entry):**
- Phase B validated (Bolsonaro MT 74/68, all claims researched)
- Boundary concentration amplified on Phase B (Plastik 1.00, Bolsonaro 0.82)
- Plastik 34pp local-vs-deployed gap is environmental variance
- Grounding warnings persist at ~65% of all jobs

**Priority order:**
1. Stage 1 predicate preservation — prevent keyword omission AND interpretation injection
2. Stage 5 aggregation — core-assertion weighting so trivially-true sub-claims don't bury the contested one
3. Phase C: Stage 3 boundary concentration
4. Deploy Phase B after fixes 1-2

**Open items:** Stage 1 prompt fix (CLAIM_EXTRACTION_PASS2 predicate preservation + anti-inference guard), Stage 5 VERDICT_NARRATIVE adjudication strengthening.
**Warnings:** The Bundesrat family demonstrates that a single input can hit three independent failure modes at two different pipeline layers, producing a 70pp spread. This is the highest-severity quality finding in the current investigation.
**For next agent:** Full investigation with all findings: `Docs/WIP/2026-04-07_f1a372bf_to_HEAD_Job_Quality_Investigation.md`. The three Bundesrat critical findings are documented with exact job IDs, per-claim evidence, and root-cause analysis. The fix targets are: (1) `apps/web/prompts/claimboundary.prompt.md` CLAIM_EXTRACTION_PASS2 section for predicate preservation + anti-inference, (2) `apps/web/src/lib/analyzer/aggregation-stage.ts` and VERDICT_NARRATIVE prompt for core-assertion weighting.
**Learnings:** No