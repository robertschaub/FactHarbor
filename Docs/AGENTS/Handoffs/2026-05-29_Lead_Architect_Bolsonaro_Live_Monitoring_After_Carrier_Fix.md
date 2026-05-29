---
### 2026-05-29 | Lead Architect + LLM Expert | Codex (GPT-5) | Bolsonaro Live Monitoring After Carrier Fix

**Task:** Monitor the approved Bolsonaro live validation jobs after the Stage 1 contract-carrier preservation fix, stop after 2 clearly bad reports, and analyze root signals while the jobs ran.

**Files touched:**
- `Docs/AGENTS/Handoffs/2026-05-29_Lead_Architect_Bolsonaro_Live_Monitoring_After_Carrier_Fix.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Submitted one additional Captain-defined input after the prior three completed because the bad-report counter was still 0.
- Did not submit beyond the four approved Bolsonaro-family validation jobs.
- Classified "clearly bad" narrowly as `report_damaged`, `verdict_integrity_failure`, zero-evidence/zero-confidence abort, or Stage 1 dropping the proceedings/verdict branch before research. None of the four completed jobs crossed that bar.
- Treated job-level warnings as root-cause evidence rather than immediate deployment approval.

**Live jobs observed:**
- `4da55d6227f8487597b1ccd20cbd5693`: English question input, `LEANING-TRUE` 61/54, 3/3 claims preserved, no OAS/IACHR final source, no query-budget warning, cache read/create tokens 0/0.
- `80a5e9301b6f4d5898873f91e6d17023`: English positive procedural/fair-trial input, `MIXED` 54/55, 3/3 claims preserved, OAS/IACHR admitted with 4 evidence items, query-budget exhausted, cache 0/0.
- `0450eb95582045398d1bd7c4fd073747`: English inverse input, `LEANING-FALSE` 40/38, 3/3 claims preserved, OAS/IACHR admitted with 3 evidence items, query-budget exhausted, cache 0/0.
- `36a4c93c27034eb588a01c942d57395e`: Portuguese Captain-defined input, `LEANING-TRUE` 65/64, detected `pt`, 3/3 claims preserved, no OAS/IACHR final source, no query-budget warning, cache 0/0.

**Findings:**
- The Stage 1 root fix appears effective for this family: all four jobs classified as `multi_assertion_input`, preserved all thesis-direct contract carriers, and selected 3 of 3 claims for research. The previous hard missing-branch failure did not recur.
- Prompt caching stayed off in the observed metrics: all four jobs reported `cacheReadInputTokens=0` and `cacheCreationInputTokens=0`.
- OAS/IACHR handling is unstable. The same or equivalent OAS/CIDH material was sometimes admitted as contextual and extracted, sometimes rejected below threshold, and in the Portuguese run the Spanish OAS/CIDH report was classified as `foreign_reaction` at 0.35 and capped/rejected. This points to a generic relevance-classification gap around international or regional oversight bodies, not a Bolsonaro-specific source issue.
- Stage 4 still has citation/grounding discipline problems. Across runs, verdict validation reported direction arrays containing non-direct evidence, polarity-misaligned citations, invalid challenge evidence IDs, and reasoning that used claim-local context while directional arrays were empty or incomplete. Several verdicts were accepted via stable self-consistency after normalization rather than fully clean citation repair.
- Research convergence remains fragile for the English legal-standard variants. Jobs 2 and 3 exhausted the per-claim query budget; all runs had source-fetch degradation/info warnings. Job 4 avoided budget exhaustion but still missed OAS/IACHR in final sources despite better domestic-law coverage.

**Open items:**
- Fix OAS/IACHR-style relevance generically in the UCM prompt: international, regional, multilateral, judicial, quasi-judicial, or human-rights oversight bodies should not be treated as foreign-government political reactions unless the result is actually a foreign state legislative/executive action.
- Fix Stage 4 citation/validation root causes: reconciled verdicts should not retain non-direct evidence in directional arrays, challenge context should not surface invalid evidence IDs as if usable, and validation should produce a clean repaired verdict or explicit non-publishability reason rather than relying on self-consistency rescue for citation defects.
- Investigate query-budget exhaustion for English legal/fair-trial inputs after the relevance fix, because the budget issue may partly be a symptom of high-value oversight sources being under-admitted.

**Warnings:**
- These four jobs are encouraging for the Stage 1 carrier fix, but they do not prove full release readiness. The downstream warnings are real root signals.
- Do not re-enable Anthropic prompt caching. The observed current-stack jobs stayed cache-off.
- Do not add Bolsonaro/domain/source hardcoding. The next fix should be a generic prompt/config improvement and citation-contract repair.

**For next agent:**
- Start with `apps/web/prompts/claimboundary.prompt.md` sections `RELEVANCE_CLASSIFICATION`, `VERDICT_RECONCILIATION`, `VERDICT_GROUNDING_VALIDATION`, and `VERDICT_DIRECTION_VALIDATION`; then inspect `apps/web/src/lib/analyzer/research-extraction-stage.ts` and `apps/web/src/lib/analyzer/verdict-stage.ts`.
- Preserve the successful Stage 1 carrier mechanism in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; the current evidence points away from further Stage 1 repair layering.
- Use the four job IDs above as current-stack cache-off comparators and compare against the earlier historical `86462618095c431ca7a84e82630b296a` only as a legacy report.

**Learnings:** Not appended to `Role_Learnings.md`; this is a task-specific validation handoff rather than a durable role-process lesson.
