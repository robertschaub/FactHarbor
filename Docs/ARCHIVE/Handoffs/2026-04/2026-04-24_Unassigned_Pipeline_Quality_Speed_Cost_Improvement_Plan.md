---
### 2026-04-24 | Unassigned | Codex (GPT-5) | Pipeline Quality, Speed, And Cost Improvement Plan
**Task:** Build a solid plan to improve ClaimAssessmentBoundary pipeline analysis quality, report quality, speed, and cost without compromising report quality; read related docs, analyze code and prompts, use MCP/tools/skills, and run a debate where meaningful.
**Files touched:** `Docs/AGENTS/Handoffs/2026-04-24_Unassigned_Pipeline_Quality_Speed_Cost_Improvement_Plan.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Adopt the reconciled debate position: quality and integrity remain first, but the first quality work should be evidence-led and narrower than a broad Stage 1 or prompt rewrite. Live baseline evidence refines the first slice: Stage 2 evidence lifecycle/schema/provenance integrity comes first because it can fail open into verdicts; Stage 1 contract/salience reliability stays in the same near-term slice because it blocks reports and burns time. Safe speed/cost work may proceed only when it is exact reuse, telemetry-only, default-off experimentation, or structurally validated retry reduction with no semantic shortcutting.
**Open items:** Requires Captain approval before prompt edits, expensive validation, broad optimization, or default-on language-lane changes. Needs the current live queue to complete before report-quality conclusions are promoted. Needs implementation owners for the revised first slice and the six tracks below.
**Warnings:** Do not turn this into a large prompt-expansion wave. Do not add deterministic semantic regex/keyword/Jaccard rules to "stabilize" the pipeline. Do not run live batches against stale source, prompt, or config state. Several older docs still describe deterministic semantic filters as architecture; AGENTS.md now takes precedence and those paths should be reviewed before extension.
**For next agent:** Start with the "Implementation Order" section. The highest-impact first coding slice is observability plus Stage 2 fail-open counters/handling, followed by Stage 3 concentration stabilization. Treat older April 10 Stage 1 report-quality plans as partially superseded by later fixes; use them for residual Stage 1 contract/salience issues, not as today's whole execution order.
**Learnings:** no

# Scope And Method

This investigation used the repo skills/workflows for `/pipeline` and `/debate`, MCP discovery and the Node REPL MCP, the repo knowledge CLI fallback (`npm run fh-knowledge -- preflight-task ...`), targeted prompt reads, direct code inspection, backlog/status/WIP review, and a three-role debate:

- Advocate: quality/integrity before broad optimization.
- Challenger: modify the plan so Stage 2/3 measured failures outrank broad Stage 1 expansion, and do not freeze safe exact optimizations.
- Reconciler: modify and adopt.

No production code, prompt files, config, or tests were changed.

# Reconciled Decision

**Modify and adopt.** Quality and integrity stay first, but "quality first" means fixing the measured and verdict-impacting failure modes in order, not bundling every quality concern into one large wave.

The plan should not freeze all speed/cost work. It should allow exact same-job reuse, telemetry, cache accounting, prompt provenance, default-off experiments, and structurally validated retry reductions. It should block any optimization that changes evidence admission, clustering, verdict behavior, model allocation, or prompt behavior without a fresh baseline and Captain approval.

# Live Baseline Addendum - 2026-04-24

After the initial static audit, six Captain-defined live inputs were submitted through the UI. The browser visibly showed Preparation for the additional drafts, including `8579d2561156489b9d042cc4383220d3` at "Preparing the Stage 1 claim set" with Pass 2 refinement active. Two further approved inputs were not submitted because the current queue already contained enough distinct coverage and additional submissions would add cost without changing the first-slice decision.

Submitted drafts and jobs:
- `714efcd3a5f14401a102071aedc59148` - WWII/asylum comparison. Stage 1 failed closed after 116.3s with `contract_violated`; no final report was created.
- `de6a6ef049df48b8a64d4e5a8be7d6de` -> `2f76330b1fbb40139d4f5166e353cc8e` - Portuguese Bolsonaro legal/fair-trial claim. Stage 1 completed after 104.5s; final job succeeded with `LEANING-TRUE`, truth 59, confidence 55.
- `8268c7b02cbe48869725e72abd8e8c75` -> `5a8cea16a5ee41a3bebf7387e573aa09` - Plastic recycling. Stage 1 completed after 104.3s on retry; final job succeeded with `MOSTLY-FALSE`, truth 19, confidence 69.
- `3f1aed220280420c9ea7fc5c3cb104a2` -> `80c4d53f107b4a149751acc9a7c6c013` - German Bundesrat non-anchor wording. Stage 1 completed after 61.8s; final job succeeded with `TRUE`, truth 96, confidence 91.
- `016fbcf88e004ed487244edad42d4e60` -> `3ee578fb620d401cb293e830c2226c8b` - German Bundesrat wording with `rechtskräftig`. Stage 1 completed after 122.1s; final job queued.
- `8579d2561156489b9d042cc4383220d3` -> `044a250ac0b64019acc4b8956f649115` - Swiss asylum count. Stage 1 completed after 64.0s; final job succeeded with `TRUE`, truth 94, confidence 82.

Live findings that change the plan:

1. **Stage 2 evidence lifecycle/schema/provenance integrity is the first verdict-safety priority.** The Portuguese Bolsonaro run logged repeated extraction category normalizations/fallbacks, per-source cap drops, and iteration-level source reconciliation updating 16/107 evidence items after late additions. These are more dangerous than visible Stage 1 failures because they can silently affect completed verdicts.

2. **Applicability/provenance labels are sometimes internally inconsistent.** Irrelevant or zero-score sources were still labeled `jurisdiction: direct` in both the Portuguese and Swiss/German runs, even when discarded. This needs invariant instrumentation and warning materiality handling before any broad optimization.

3. **Stage 1 reliability remains a same-slice blocker.** One draft failed closed after the full retry/repair path, and several successful drafts still took 62-122s in preparation. The issue is both quality and cost: contract failures must not ship as reports, but retry/repair loops need sharper diagnostics, reuse, and fail-fast behavior.

4. **Gate/warning semantics need cleanup.** The non-anchor German Bundesrat run previously logged a Gate 1 specificity warning while auto-continuing. If the verdict would not materially differ, this belongs in admin-only diagnostics; if it can materially change the report, it needs user-visible warning routing through `warning-display.ts`.

5. **Do not start broad prompt edits yet.** The live evidence shows symptoms, not an approved prompt-change specification. Narrow prompt-contract repair stays available only after diagnostics prove LLM ambiguity and Captain approves the exact prompt delta.

6. **The markdown report artifact is confirmed incomplete on a real successful job.** The Portuguese job stored a large `ResultJson` with 105 evidence items, 6 ClaimAssessmentBoundaries, and 18 analysis warnings, but `ReportMarkdown` remained only `# ClaimAssessmentBoundary Analysis Report` plus `(Report generation not yet implemented)`. Report artifact completion remains a quality deliverable, not a polish task.

7. **Completed jobs show citation-integrity issues that must become a first-slice guard.** The Plastic job emitted `verdict_grounding_issue:info`: AC_02 cited a supporting evidence ID that challenge validation marked invalid. The Swiss asylum-count job emitted `verdict_direction_issue:info`: two contextual evidence items were cited as directional supporting evidence even though only direct applicability evidence should enter directional buckets. These are not merely report-writing issues; the final verdict object can contain structurally inconsistent evidence citations.

8. **Stage 3 concentration remains relevant but not the first live blocker.** Plastic completed with 66 evidence items and 6 boundaries, with no single overall boundary dominating. The non-anchor Bundesrat job had 49 evidence items and 4 boundaries, with overall max-boundary share around 0.63 and per-claim ledger max around 0.74. Keep Stage 3 concentration metrics in the first slice, but prioritize evidence/citation integrity before semantic boundary splitting.

Debate reconciliation after the live baseline: **MODIFY**. Verdict-integrity risk outranks throughput reliability. Therefore Stage 2 evidence lifecycle/schema/provenance invariants move to the top of the first slice; Stage 4/aggregation citation-integrity guards are added to that same first slice; Stage 1 contract/salience reliability remains immediately adjacent because it blocks reports and wastes substantial runtime.

# Key Evidence

1. Backlog already prioritizes active Phase 7b Stage 1 hardening, prompt rollout observability, UPQ Stage 3 boundary concentration, multilingual validation, and defers broad optimization until fresh baseline plus approval.
2. Phase B improved per-claim research coverage but exposed Stage 3 boundary concentration, including prior observed max-boundary shares of `1.00` for Plastik and `0.82` for Bolsonaro.
3. Cross-language quality spread remains unresolved, with prior Plastik analysis pointing to Stage 2 evidence-language bias rather than Stage 1 alone.
4. Current `reportMarkdown` is still a stub in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.
5. Stage 2 relevance/applicability failures can still fail open in `apps/web/src/lib/analyzer/research-extraction-stage.ts`.
6. Stage 3 clustering currently has risk points around truncated evidence statements, fallback `CB_GENERAL`, deterministic boundary merging, and concentration warning severity.
7. Stage 1 still has inline prompt guidance in code and salience uses the shared `understand` model lane.
8. Deterministic semantic hotspots remain in metric coverage/refinement routing, source-type mapping, anchor substring weighting, verdict direction rescue, and source-reliability truth/confidence adjustment.
9. SR core eval/refinement prompts are still TypeScript-built, while prompt architecture docs say production prompts should be UCM-managed.
10. The March speed/cost plan says low-risk parallelism is mostly consumed and remaining broad optimization is baseline-dependent.

# Still-Existing Problems

## Quality And Analysis

1. **Stage 2 semantic fail-open paths.**
   Relevance prompt load failures and LLM classification failures can admit all results at a neutral score; applicability prompt failures can keep all evidence. This is a direct report-quality risk because invalid evidence can reach Stage 3 and Stage 4.

2. **Stage 3 boundary concentration remains the strongest measured structural issue.**
   The clustering prompt already contains anti-mega-cluster rules, but code-level inputs and fallbacks can still make over-concentration likely. Concentration currently trends informational unless separately materialized.

3. **Multilingual evidence-language bias is not closed.**
   Language intent and the EN supplementary lane exist, but default-on promotion still needs A/B validation on Captain-defined inputs. Treat this as a Stage 2 acquisition/retrieval balance problem, not just an output-language problem.

4. **Stage 1 contract/salience hardening is still incomplete but should be targeted.**
   Residual work includes claim-to-anchor preservation mapping, validator audit-vs-binding separation, directness-aware contract validation, dedicated salience model routing if stronger salience is needed, and removal of hardcoded prompt guidance from TypeScript.

5. **Prompt governance drift persists.**
   `Prompt_Architecture.md` says runtime prompts are UCM-managed, but current code still contains prompt text in Stage 1 and SR eval/refinement builders. This is a compliance and tuning problem, especially for verdict-impacting prompts.

6. **Report artifact is not complete.**
   The rich `resultJson` exists, but the markdown report still says report generation is not implemented. Report output must preserve verdicts, evidence citations, ClaimAssessmentBoundaries, caveats, and warning severity.

7. **Warning severity needs materiality discipline.**
   Boundary concentration, verdict diagnostics, grounding diagnostics, and source quality issues should be mapped through the AGENTS materiality test: if the verdict would materially differ, the user-facing severity must reflect that; if not, keep it info/admin-only.

## Speed And Cost

1. **No fresh current-stack baseline.**
   Older March runtime/cost numbers are stale after parallelism, fetch short-circuiting, Stage 1 reuse, SR early exit, and quality fixes.

2. **Cost telemetry is still incomplete.**
   Backlog flags pricing-row/telemetry gaps. Without stage-level call counts, tokens, model, prompt hash, and cache accounting, optimization claims are weak.

3. **Remaining broad optimization is quality-sensitive.**
   Model downgrades, challenger/self-consistency reductions, and search pruning can alter analysis and must remain isolated experiments.

4. **Safe exact reuse still has room.**
   Same-job successful URL/content reuse with provenance and hit/miss telemetry is safe when it does not change semantic decisions. Failed, underlength, or partial fetches must not be sticky-cached.

# Implementation Order

## Phase 0 - Baseline And Observability

Goal: make quality and cost claims measurable before changing behavior broadly.

Do:
- Add or verify per-stage timing, LLM call count, model, token/cost estimate, prompt profile/hash, cache hit/miss, fetch counts, SR eval/refinement counts, Stage 2 fail-open counts, Stage 3 concentration metrics, and evidence-language mix.
- Add draft/preparation milestone visibility where Stage 1 still appears as a flat wait.
- Record whether prompts/config used at runtime came from active UCM, seed fallback, or TypeScript builder.
- Fix telemetry-only pricing gaps before making cost decisions.
- Add evidence lifecycle invariants: source identity, evidence item provenance, schema-normalization counts, cap-drop accounting, reconciliation delta counts, and explicit admission/drop reason.
- Add Stage 1 retry/repair diagnostics: contract field that failed, retry branch taken, validation/repair time, and whether the final output came from initial, retry, or repair.

Do not:
- Run expensive validation until Captain approves and source/prompt/config state is committed and refreshed.

Acceptance:
- A single job can be explained by stage time, stage cost, prompt provenance, warning materiality, evidence-language mix, and concentration metrics.

## Phase 1 - Stage 2 Fail-Open Evidence Admission

Goal: stop failed semantic classifiers from silently admitting evidence as if validated.

Do:
- Replace "accept all" relevance/applicability failure behavior with an explicit degraded path that is visible in analysis warnings when verdict materiality may be affected.
- Keep deterministic code structural only: missing prompt, schema failure, timeout, and retry state are structural; relevance/applicability meaning remains LLM-owned.
- Batch classifier retries where possible, and avoid repeated reasoning for identical inputs.
- Add tests for prompt-missing, LLM-failure, and schema-failure branches.

Acceptance:
- Failed relevance/applicability classification cannot silently inflate the evidence pool.
- User-visible warning severity follows the verdict-materiality test.
- No new deterministic keyword or regex semantic fallback is introduced.

## Phase 1b - Verdict Citation Integrity Guard

Goal: prevent final verdict objects from citing evidence that the pipeline already knows is invalid, non-direct for directional use, missing, or inconsistent with the evidence registry.

Do:
- Add a structural pre-store validation pass over `claimVerdicts[*].supportingEvidenceIds`, `contradictingEvidenceIds`, cited evidence registries, challenge validation results, and applicability labels.
- Block or repair structural citation contradictions: invalid evidence IDs must not appear in directional support; contextual/foreign-reaction evidence must not be cited as direct supporting or contradicting evidence unless the verdict explicitly marks it as contextual caveat rather than directional proof.
- Escalate material citation conflicts through warning materiality rules. If a cited-evidence conflict could change a claim verdict or confidence tier, it should not remain admin-only `info`.
- Keep semantic judgment LLM-owned; the guard is structural consistency over already-produced IDs, labels, and validation fields.

Acceptance:
- No final verdict cites an evidence ID that is absent, challenge-invalid, or ineligible for the cited directional role.
- Directional buckets contain only structurally eligible evidence.
- Material citation conflicts either trigger a bounded LLM repair/reconciliation pass or downgrade/block publication with a registered warning.

## Phase 2 - Stage 3 ClaimAssessmentBoundary Concentration Stabilization

Goal: prevent evidence from collapsing into overbroad ClaimAssessmentBoundaries while preserving evidence-emergent boundaries.

Do:
- Improve clustering payload quality so the LLM receives enough EvidenceScope and evidence-statement context to separate methodology, temporal, geographic, and comparator differences.
- Add a concentration audit when one boundary dominates beyond configured thresholds; use LLM review for semantic split decisions, not Jaccard or keyword rules.
- Revisit fallback `CB_GENERAL` behavior so fallback is explicit degradation rather than an invisible normal boundary when it can materially affect the verdict.
- Keep threshold and behavior UCM-configurable.

Acceptance:
- No single boundary concentration regression on benchmark families without an explicit warning and documented reason.
- Plastik/Bolsonaro-style concentration does not return to prior max-share behavior in validation.
- Boundary changes do not reduce evidence count by hiding valid evidence.

## Phase 3 - Multilingual Evidence-Language Balance

Goal: reduce input-language-driven evidence pool bias without forcing translation or weakening report quality.

Do:
- A/B the existing EN supplementary lane under default-off UCM config on Captain-defined inputs only.
- Measure evidence-language mix, source quality, verdict direction/confidence, citation grounding, and boundary concentration.
- Promote only if it improves coverage/diversity without causing direction, confidence-tier, or citation-quality regressions.

Acceptance:
- Cross-language twin inputs move toward stable verdict direction/confidence without a hidden English-only assumption.
- Original-language report behavior remains intact.

## Phase 4 - Targeted Stage 1 Contract And Salience Hardening

Goal: finish the remaining Stage 1 trust work without reopening a broad prompt expansion.

Do:
- Implement claim-to-anchor preservation mapping and validator audit-vs-binding separation where still open.
- Pass directness context and final accepted claim IDs into contract validation; keep code-side validation structural.
- Move inline Pass 2, retry, language, and context prompt text into UCM-governed prompt/config paths.
- Add a dedicated salience model config key if salience quality needs a stronger tier; default it to current behavior until validated.
- Remove or quarantine substring-based anchor checks that influence analysis outcomes; rely on LLM-preserved IDs plus structural ID validation.

Acceptance:
- Contract failures do not ship as normal reports.
- Stage 1 hardening adds no new deterministic semantic checks.
- Prompt changes are explicitly approved and UCM-visible.

## Phase 5 - Report Artifact And Warning Quality

Goal: make the report artifact trustworthy, complete, and consistent with the internal result.

Do:
- Replace the markdown stub with a generated report from `resultJson`, including overall verdict, AtomicClaim verdicts, ClaimAssessmentBoundaries, cited supporting/contradicting evidence IDs, limitations, warnings, and provenance.
- Ensure citation sanitation and warning display rules apply to both UI and exported/markdown report.
- Fix generic English fallback narratives if they can appear in non-English reports; if fallback occurs, surface it according to materiality.
- Keep matrix/report-honesty work aligned with the April 10 count-only recommendation unless a newer product decision supersedes it.

Acceptance:
- Markdown/export no longer loses citations, warnings, or boundary caveats.
- No phantom evidence IDs appear in report text.
- User-visible warnings are centrally registered and materiality-justified.

## Phase 6 - Prompt And SR Governance Closure

Goal: make verdict-impacting prompt and SR behavior configurable and auditable.

Do:
- Move SR core eval/refinement prompt text into UCM/file prompt governance or explicitly document a Captain-approved exception.
- Audit runtime use of text-analysis prompt profiles and remove stale prompt surfaces that are not called.
- Reconcile prompt docs with the current ClaimAssessmentBoundary runtime.
- Review deterministic SR truth/confidence adjustment as an architecture decision because it can move verdicts.

Acceptance:
- Every verdict-impacting prompt path has active provenance in job/config snapshots.
- No stale prompt file is presented as live if runtime code does not call it.
- SR weighting behavior is either LLM-led, structural-only, or explicitly approved as a fixed calculation.

## Phase 7 - Safe Speed And Cost Work

Goal: reduce latency and spend without compromising report quality.

Allowed immediately:
- Exact same-job successful URL/content reuse with provenance.
- Cache hit/miss telemetry and avoided-call accounting.
- SR sparse early-exit observation.
- SR insufficient-data caching only with evidence-pack fingerprint, short TTL, and visible avoided-refinement metrics.
- Default-off Haiku/self-consistency/model-route experiments through UCM.
- Removing redundant LLM retries only where structural schema validation proves the previous output is usable.

Not allowed until baseline and approval:
- Broad model downgrades.
- Search pruning or source skipping based on deterministic semantic heuristics.
- Default-on EN supplementary lane.
- Semantic dedupe beyond exact URL/content identity.
- Reducing advocate/challenger/reconciler coverage without before/after quality evidence.

Acceptance:
- Any cost saving preserves verdict direction, confidence tier, citation grounding, evidence transparency, and warning correctness.
- Runtime/cost improvements are reported by stage, not as one global number.

# Validation Gates

For implementation PRs:
- Run `npm test`.
- Run `npm -w apps/web run build`.
- If config defaults change, ensure JSON defaults and TypeScript schema defaults remain synchronized.
- Add focused unit tests for each changed failure branch.

For analysis-affecting changes:
- Use only Captain-defined inputs.
- Commit first, refresh runtime/prompt/config state, then submit live jobs if approved.
- Include multilingual validation where the change touches retrieval, prompts, claim extraction, evidence classification, boundaries, verdicts, or report language.
- Compare against a fresh baseline on verdict direction, truth percentage, confidence tier, evidence count, source quality, evidence-language mix, boundary concentration, citation grounding, warnings, latency, LLM calls, tokens, and estimated cost.

For prompt changes:
- Get explicit human approval before editing `apps/web/prompts/`.
- Use topic-neutral wording and no test-case terms.
- Verify active UCM prompt hashes after reseed/activation.

# Recommended First Slice

Start with a small, reviewable integrity and observability slice:

1. Add Stage 2 evidence lifecycle invariants: source identity, evidence item provenance, category/schema normalization counts, per-source cap-drop accounting, reconciliation deltas, and explicit admission/drop reasons.
2. Add Stage 4/aggregation citation-integrity validation for missing, invalid, non-direct, or challenge-invalid evidence IDs before storing final verdicts.
3. Add Stage 2 relevance/applicability failure counters and warning materiality plumbing so semantic classifier failure cannot silently admit evidence.
4. Add Stage 1 contract/retry diagnostics and fail-fast accounting for contract violations, including retry/repair time and final branch attribution.
5. Add Stage 3 concentration metrics to job output/debug traces without changing clustering yet.
6. Add per-stage cost/timing fields where currently missing.
7. Add tests proving failed relevance/applicability classification no longer silently expands the evidence pool, final verdicts cannot cite structurally invalid evidence, and Stage 1 contract failures do not auto-continue into final jobs.

This slice creates the measurement surface needed for Stage 2 and Stage 3 fixes, captures the now-observed Stage 1 retry waste, and avoids changing prompts or model policy before the baseline exists.
