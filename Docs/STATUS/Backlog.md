# FactHarbor Backlog

**Purpose**: Single canonical task list for FactHarbor. Keep this list current; keep `Docs/STATUS/Current_Status.md` high-level and link here.

**Last Updated**: 2026-04-15

**Ordering**: Sorted by **Urgency** (high → med → low), then **Importance** (high → med → low).

**Phase note**: **POC is complete** (tagged `v1.0.0-poc`). FactHarbor is now in **Alpha phase**. Security/cost-control items remain **low urgency** during Alpha but are **high importance**. Reclassify to **high urgency** before any production/public exposure.

**See Also**:
- `Docs/STATUS/Current_Status.md` for the current high-level snapshot
- `Docs/WIP/2026-03-25_Report_Quality_Root_Causes_and_Stabilization_Plan.md` for the current root-cause summary and next-step plan

---

## Immediate Priorities (2026-04-15)

Phase 7 is now the active bounded engineering track. The 2026-04-14/15 commits shipped the first binding-mode groundwork plus the narrow prompt/Stage-1 hardening slice: audit-vs-binding mode separation/persistence groundwork, binding-anchor plumbing, contract-repair restoration, prompt contract cleanup, and fidelity-drift pruning on the treaty canaries. The immediate gate is no longer “discover the Phase 7 problem.” It is: (1) finish the next bounded Shape B slice, (2) close the remaining Phase 7 observability / prompt-rollout gaps, and (3) keep the broader neutrality/upstream quality tracks visible without mixing them into this Stage-1 slice.

| Item | Description | Domain | Urgency | Importance | Status | Notes |
|------|-------------|--------|---------|------------|--------|-------|
| **PHASE7B-0** | **Phase 7b narrow prompt/Stage-1 hardening slice**: shipped. Restored `CLAIM_CONTRACT_REPAIR`, aligned thesis-direct anchor-carrier wording, tightened binding appendix fallback/tiebreak semantics, clarified salience finality/binding-effect handling, added chronology anti-inference wording, and pruned fidelity-drift extras when a clean anchor carrier survives. Fresh treaty jobs on the fixed prompt hash confirm the intended single-claim behavior. | Analyzer / Prompt / Quality | — | high | DONE | `97fb7141`, `9a79bc91`, `Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_New_Report_Investigation.md` |
| **PHASE7B-1** | **Next bounded Shape B slice**: move from prompt/test hardening to explicit claim-to-anchor preservation mapping and validator evolution from discovery to audit, while preserving clear audit-vs-binding separation. | Analyzer / Prompt / Architecture | high | high | ACTIVE | `Docs/WIP/2026-04-15_Phase7b_Prompt_Blocker_Implementation_Charter.md`, `Docs/WIP/2026-04-14_Phase7_Step1_Pains_Issues_Needs.md` |
| **PHASE7B-OBS** | **Phase 7 observability + prompt rollout hygiene**: verify per-environment prompt activation because runtime prompt resolution is DB-first/UCM-managed, not file-first. Keep distinguishing `system-seed` vs admin-owned prompts. Persisted telemetry also still understates some Stage-1 pruning and broader recovery provenance events. | Analyzer / Config / Observability | high | high | ACTIVE | `Docs/AGENTS/Handoffs/2026-04-15_Unassigned_ClaimBoundary_Prompt_UCM_Propagation_Review.md`, `Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_New_Report_Investigation.md` |
| **PHASE7B-MODEL** | **Dedicated salience model routing**: salience still rides the shared `understand` lane. If salience quality needs a stronger model, add isolated `modelSalience` / task routing instead of broadening `modelUnderstand` or reusing `context_refinement`. | Analyzer / LLM Routing | med | high | DESIGN | `Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Salience_Model_Tier_Design_Review.md` |
| **OBS-1** | **Per-job metrics isolation**: replaced module-global collector with AsyncLocalStorage. Concurrent jobs no longer share metrics state. | Analyzer / Observability | — | — | DONE | `6e402208` |
| **VAL-2** | **Jobs-list progress/verdict sync race**: verdict badge gated on terminal status; monotonic progress guard prevents backward progress. | Web / API / Runner | — | — | DONE | `f86811fe` |
| **QLT-1** | **Stage 1 predicate-strength stabilization**: materially successful. Plastik DE 47pp→22pp. Monitor mode. | Analyzer / Quality | low | high | MONITOR | `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Full_Validation_Report.md` |
| **QLT-3** | **Muslims-family Stage-1 facet-consistency fix**: materially successful. Claim count stabilized (3/3/3/3/3), direction stabilized (all `supports_thesis`), counter-narrative claims eliminated. Spread 27pp→21pp. Remaining variance is evidence-driven. Monitor mode. | Analyzer / Quality | low | high | MONITOR | `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md` |
| **QLT-2** | **Residual broad-evaluative instability characterization**: COMPLETE. Split root cause identified and both branches addressed (QLT-1 for Plastik, QLT-3 for Muslims). | Analyzer / Quality | — | — | DONE | `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md` |
| **QLT-4** | **Per-claim contrarian retrieval experiment**: CLOSED and removed. Feature was implemented, tested, and found to target a non-existent root cause (per-claim direction scarcity). Experimental code, UCM config fields, and tests reverted from codebase. Historical design context in `Docs/AGENTS/Handoffs/`. | Analyzer / Quality | — | — | CLOSED | `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Code_Revert.md` |
| **GATE1-REF** | **Gate 1 thesis-direct rescue refinement**: REVIEWED AND DECLINED (2026-03-26). Two-agent debate found the UNVERIFIED was evidence-driven (balance 0.38 vs 0.76), not Gate-1-driven. Over-filtering risk for legitimate evaluative questions too high. A 3-claim run with fairness dimension produced LEANING-TRUE, disproving the causal hypothesis. | Analyzer / Quality | — | — | DECLINED | `Docs/WIP/2026-03-26_Gate1_Rescue_Refinement_Debate.md` |
| **OBS-2** | **Persist Stage-1 diagnostic fields**: `inputClassification` and `contractValidationSummary` now stored in result JSON. | Analyzer / Observability | — | — | DONE | `d6090f76` |
| **DIV-1** | **Diversity-aware Stage-2 sufficiency**: promoted to default-on after 8-run validation. Stage 2 now aligns with D5 item-count + diversity thresholds. Bolsonaro confidence spread 23pp→5pp, zero UNVERIFIED. Flag `diversityAwareSufficiency` available for rollback. | Analyzer / Quality | — | high | DONE | `83a47aad`, `23d8576c`, `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_Diversity_Aware_Sufficiency_Validation.md` |
| **FLOOD-1** | **Single-source flooding mitigation (Fix 1 + Fix 2)**: Claim-local source portfolios in verdict prompts + `maxEvidenceItemsPerSource: 5` cap. Live-validated and operational. Fix 3 (same-source LLM consolidation) deferred. | Analyzer / Quality / SR | — | high | DONE | `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md` |
| **NEUTRALITY-1** | **Cross-linguistic neutrality gap**: Plastik recycling shows 58pp max spread across languages (DE 33% / EN 72% / FR 13%). Proposal 2 implementation is now shipped and review-clean: `LanguageIntent`, report-language threading, and an experimental default-off EN supplementary lane. Next gate is live A/B validation and a promotion decision. | Quality / Policy / Analyzer | high | high | VALIDATION | `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`, `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` |
| **FLAT-EARTH-1** | **Flat-Earth false-ambiguity fix**: review-approved prompt-only narrowing for direct factual-property questions. "Is X flat?" should default to `single_atomic_claim`. Contract validation backup against representational drift. | Analyzer / Quality | med | med | REVIEW-READY | `Docs/WIP/2026-03-30_Flat_Earth_False_Ambiguity_Reviewer_Notes.md` |
| **PIPE-INT-1** | **All-insufficient D5→Stage-4 integrity fix (`2705/e407`)**: IMPLEMENTED. Assessable-claims path, verdict uniqueness invariant, report matrix over all claims, LLM article adjudication via VERDICT_NARRATIVE with pure LLM truth adjustment, confidence ceiling, and deterministic fallback only. | Analyzer / Integrity / UI | — | — | DONE | `03387283` + follow-up policy patch |
| **DIR-1** | **Direction-integrity citation-carriage**: code fix shipped in `e1f2c551`. Citation arrays now carried through reconciliation. Remeasurement on post-fix stack pending. | Analyzer / Verdict | low | high | MONITOR | `Docs/WIP/2026-03-29_1bfb_Direction_Integrity_Architect_Review.md` |
| **GRND-1** | **Grounding false-positive root fix**: claim-local grounding scope (`b7783872`), prompt false-positive refinement (`ec7a8de8`), and single-citation-channel Stage-4 contract plus source-ID backfill / context expansion (`d9194303`). Local Meta + Plastik canaries on prompt hash `79f7e76f...` are clean. Next gate: first 7+ run monitoring, grounding token-cost watch, deployed validation, then removal of the temporary defensive legacy rules once the transition is stable. | Analyzer / Verdict / Quality | low | high | MONITOR | `Docs/WIP/2026-04-04_Boundary_Concentration_and_Grounding_Stabilization_Plan.md`, `Docs/AGENTS/Agent_Outputs.md` |
| **NARR-1** | **Stage-5 Cross-Boundary Tension calibration**: first-pass cleanup is shipped and post-fix canaries are good enough to defer further narrative work. `08220154` wires the stale `${aggregation}` / `${evidenceSummary}` variables and tightens `boundaryDisagreements` to material directional divergence only; `2acc4545` closes the review follow-ups by counting unique `sourceUrl` values for `sourceCount` and adding a dedicated Stage-5 prompt-contract test. Swiss and misinformation-tools now sit at `0` tensions; remaining Bolsonaro / Plastik tensions look substantive. Keep Fix 2 only as fallback path B if future runs again show misclassified caveat noise. | Analyzer / Aggregation / Quality | low | high | MONITOR | `Docs/WIP/2026-04-06_Cross_Boundary_Tensions_Current_vs_Previous_Deployment_Investigation.md`, `Docs/WIP/2026-04-06_Cross_Boundary_Tension_Investigation.md` |
| **UPQ-1** | **Stage 2/3 upstream report quality stabilization**: active. Phase A-1 (`existingEvidenceSummary`) remains provisional after canary remeasurement: no proven positive or negative effect, and Phase A-2 telemetry shows no cross-claim reallocation signal. The strongest new root cause is **seeded-evidence dominance**: some claims satisfy Stage 2 sufficiency from seeded evidence alone and never receive a researched iteration (e.g. Plastik AC_01 `41 seeded / 0 researched`). Next bounded slice: investigate seeded-evidence sufficiency interaction, with a per-claim researched-iteration floor preferred over globally excluding seeded evidence. Current local `b130d00c` is an observability win, not yet a clear quality-based deploy candidate versus deployed `f1a372bf`. | Analyzer / Quality | high | high | ACTIVE | `Docs/WIP/2026-04-06_Upstream_Report_Quality_Workstream_Proposal.md`, `Docs/WIP/2026-04-07_UPQ1_Phase_A2_Canary_Measurement.md` |
| **STG1-DECOMP** | **SRG/SRF over-fragmentation (effizient/wirksam split)**: Pre-existing Stage-1 decomposition instability. `fff7a508` (evidence-separability approach) was attempted and **REVERTED** — caused Plastik UNVERIFIED regression and SRG contract-validation fail-open. 17-run post-rollback validation confirmed baseline restored. A revised approach must avoid regressing broad-evaluative families. 61pp within-family spread, 11% contract fail-open rate for SRG. | Analyzer / Quality | med | high | OPEN | `Docs/ARCHIVE/2026-04-01_Post_Rollback_Validation_Report.md`, `Docs/WIP/2026-03-29_b8e6_8640_cd4501_Claim_Decomposition_Architect_Review.md` |
| **REMAP-1** | **Seeded preliminary-evidence LLM remap promoted to default-on** (`b5fad127`). Captain approved after current-stack A/B validation. Rollback flag `preliminaryEvidenceLlmRemapEnabled` available. The initial Homeopathy confidence anomaly did not reproduce on post-promotion confirmation runs and is now routine watchlist context only. | Analyzer / Quality | — | high | DONE | `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md` |
| **METRICS-2** | **Anthropic standard-tier pricing parity**: the current metrics surface still needs the `claude-sonnet-4-6` pricing row committed, otherwise estimated cost can understate recent Anthropic standard usage. This is telemetry-only, not analysis behavior. | Metrics / Observability | low | med | OPEN | `Docs/AGENTS/Handoffs/2026-04-15_Unassigned_Daily_Bug_Scan_Metrics_Pricing_Fix.md` |
| **OPT-GATE** | **Keep optimization secondary**: `P1-B` is already shipped; Stage-2 fetch runtime hardening (`W15` + per-domain 401/403 short-circuit) is also part of the current baseline. Any reopening of the remaining optimization track (`P1-A`, `P2-*`, `P3-*`) requires explicit Captain approval plus a fresh post-March-31 runtime/cost baseline. Secondary to current trust/observability work. | Planning / Governance | med | high | DEFERRED | Requires explicit approval |

## Deferred / Long-Horizon CB Items

These are still valid, but they are not the current gate.

| Item | Description | Source |
|------|-------------|--------|
| Gate 1 retry loop | Re-extract claims when >50% fail specificity check | Architecture §8.1.5 |
| CLAIM_GROUPING | Haiku call to group claims for UI display when ≥4 claims | Architecture §18 Q1 |
| Advanced triangulation | Cross-boundary correlation analysis | Architecture §8.5.2 |
| Contestation weight reduction | Requires `factualBasis` field on CBClaimVerdict | Legacy getClaimWeight() incompatibility |
| Derivative detection improvements | Enhanced derivative source identification | Architecture §8.5.3 |

---

## Deferred Design / Proposal Tracks

These are still-open future-facing tracks that remain relevant, but they are not part of the current validation gate.

| Item | Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|---|
| **REF-1** | **Residual refactor streams (`WS-5`/`WS-6`/`WS-7`)**: jobs report page decomposition, admin config page decomposition, and low-priority admin route boilerplate cleanup remain as deferred structural work. | Web / API / Refactoring | low | med | `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md` |
| **EVD-1** | **Acceptable-variance policy**: APPROVED. Operative Alpha-phase quality governance. 5 input classes (A–E) with green/amber/red bands. Analyzer work in monitor mode — new implementation only if red threshold breached. Revisit before Beta. | Quality / Governance | — | high | APPROVED | `Docs/WIP/2026-03-25_EVD1_Acceptable_Variance_Policy.md` |
| **SEARCH-1** | **Deep supplementary-provider integration**: Wikipedia supplementary completion is DONE (bounded `always_if_enabled`, language threading, UCM control). Remaining: pipeline-aware Semantic Scholar / Fact Check usage, provider-specific query variants. | Search / Analyzer | low | med | `Docs/WIP/2026-03-03_Wikipedia_SemanticScholar_Integration_Concept.md`, `Docs/ARCHIVE/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md` |
| **SR-1** | **Stage 4.5 SR calibration experiment**: feature-flagged/off in code; only reopen after the current fixed-stack validation gate closes. | Analyzer / SR / Quality | low | med | `Docs/WIP/2026-03-19_SR_LLM_Calibration_Plan.md` |
| **AGG-1** | **LLM-assessed triangulation / derivative weighting**: replace remaining deterministic aggregation heuristics that make analytical judgments. | Analyzer / Architecture | low | med | `Docs/WIP/LLM_Triangulation_Assessment_Plan_2026-03-17.md` |
| **LLMINT-2** | **Deterministic analysis hotspot review and migration**: review and replace the top remaining deterministic analyzer behaviors that still influence analytical outcomes. Current ranked hotspots: (1) Stage-1 truth-condition anchor preservation override, (2) Stage-4 verdict direction plausibility/rescue, (3) SR truth weighting, (4) input-type routing, (5) scope-quality classification. Prioritize the first two as the clearest remaining semantic deterministic logic; treat SR truth weighting as an explicit architecture decision rather than background math. | Analyzer / Architecture / Quality | low | high | `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md` |
| **RESILIENCE-1** | **Outage resilience follow-on**: A-track is shipped (network failures feed breaker, Stage-4 preflight probe, damaged-job abort, network-only auto-resume). Remaining future work is Option B/C only: pipeline hold/resume for short outages and checkpoint/resume for long outages or restarts. | Analyzer / Reliability / Runner | low | med | `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md` |
| **LIVE-1** | **LiveCheck / Innosuisse future track**: funding and research proposal line for live audio/video fact-checking. Keep distinct from the current Alpha validation track. | Product / Research / Funding | low | med | `Docs/Knowledge/Innosuisse_Antrag_LiveCheck_ReviewReady_2026-03-18.md`, `Docs/Knowledge/LiveCheck_State_of_the_Art_Research_2026-03-18.md` |
| **PROV-1** | **Source Provenance Tracking**: Trace evidence back to original creator (person/org) to detect single-source amplification, propaganda, and attribution washing. Design complete (v2, post-GPT review). 3 phases: Phase 1 extraction + telemetry, Phase 1.5 challenger/reconciler prompt integration, Phase 2 LLM entity resolution. Integrates with existing `sourcePortfolioByClaim` and `independence_concern`. Implementation parked. | Analyzer / Quality / SR | low | high | `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md` |

---

## Recently Completed (April 14-15, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Phase 7b audit/binding groundwork**: salience mode separation/persistence groundwork, binding anchors wired into Pass 2 and contract audit, and audit-mode regression coverage. | Analyzer / Stage 1 / Phase 7 | 2026-04-14 | `f48af7bf`, `4adf6f17`, `d8bce23d` |
| ✅ **Contract repair pass restored**: `CLAIM_CONTRACT_REPAIR` is again part of the live prompt/runtime surface with focused prompt-contract coverage. | Analyzer / Prompt / Stage 1 | 2026-04-14 | `97fb7141`, `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts` |
| ✅ **Stage-1 anchor-preservation hardening and pruning**: prompt/runtime drift tightened, fidelity-drift extras pruned when a clean anchor carrier survives, and fresh treaty jobs confirm the intended single-claim behavior on the fixed prompt hash. | Analyzer / Prompt / Quality | 2026-04-15 | `9a79bc91`, `Docs/AGENTS/Handoffs/2026-04-15_Lead_Developer_LLM_Expert_New_Report_Investigation.md` |
| ✅ **Anthropic Haiku model ID fix**: non-existent `claude-haiku-4-5-latest` alias replaced with the pinned valid model ID `claude-haiku-4-5-20251001`. | Analyzer / Models | 2026-04-15 | `c7a5ed78` |

---

## Recently Completed (March 22 – April 13, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Stage-4 JSON recovery hardening**: array-aware parsing, multi-strategy extraction, contract alignment for advocate/challenger/reconciler payloads. | Analyzer / Verdict | 2026-04-03 | `3eb2fd83`, `e0cf6752` |
| ✅ **Runner false orphan requeue fix**: stale drain snapshot no longer causes false requeue of running jobs. | Runner / Reliability | 2026-04-03 | `fc864a7f` |
| ✅ **Ghost boundary sanitization**: `advocateVerdict()` now filters `boundaryFindings` against claim-local valid boundary IDs from coverage matrix. | Analyzer / Verdict | 2026-03-31 | `ef98a07a` |
| ✅ **Grounding validation source portfolio**: `VERDICT_GROUNDING_VALIDATION` now receives source portfolio (sourceId, domain, trackRecordScore, confidence, evidenceCount) to prevent false-positive warnings on SR references. | Analyzer / Verdict | 2026-03-31 | `3d7f6c85` |
| ✅ **Grounding false-positive root fix**: claim-local scoping, prompt false-positive refinement, source-ID backfill for late-added evidence, richer boundary/challenge grounding context, and a single-citation-channel Stage-4 contract that removes raw machine IDs from verdict/challenge prose. Local Meta + Plastik canaries clean on prompt hash `79f7e76f...`; now in monitor mode. | Analyzer / Verdict / Quality | 2026-04-05 | `b7783872`, `ec7a8de8`, `d9194303` |
| ✅ **Stage-5 narrative tension first-pass cleanup**: stale `${aggregation}` / `${evidenceSummary}` variables wired, `boundaryDisagreements` narrowed to material directional divergence, Stage-5 `sourceCount` corrected to use unique `sourceUrl` values, and dedicated `VERDICT_NARRATIVE` prompt-contract tests added. Canary remeasurement is now the gate. | Analyzer / Aggregation / Quality | 2026-04-06 | `08220154`, `2acc4545` |
| ✅ **Claim-local verdict direction scoping**: direction validation and repair now use claim-local evidence instead of global pool. Prevents cross-claim contamination. | Analyzer / Verdict | 2026-03-30 | `17da5b84` |
| ✅ **Article truth clamp removal**: ±10pp deterministic clamp removed; article truth is now LLM-led within 0-100 range. Confidence ceiling (structural invariant) retained. | Analyzer / Aggregation | 2026-03-30 | `7fdf2b44` |
| ✅ **Stage-1 decomposition fix REVERTED**: `fff7a508` evidence-separability approach caused Plastik/SRG regressions. Rolled back cleanly (`a1c5caf5`, `ad62334f`, `11019788`). Post-rollback 17-run validation confirmed baseline restored. | Analyzer / Quality | 2026-04-01 | `Docs/ARCHIVE/2026-04-01_Post_Rollback_Validation_Report.md` |
| ✅ **Wikipedia supplementary completion**: bounded `always_if_enabled` mode, detected-language threading into Wikipedia subdomain, generic `supplementaryProviders` UCM block, Admin UI controls. Validated on 5 scenarios (DE/EN/control/disabled/fallback_only). | Analyzer / Search / Multilingual | 2026-04-04 | `Docs/ARCHIVE/2026-04-03_Wikipedia_Supplementary_Completion_Plan.md` |
| ✅ **Direction-validator false-positive rescue hardening**: stable self-consistency rescue shipped, `direction_rescue_plausible` observability added on both initial and repaired paths, and Rule 2's mixed-evidence floor is now UCM-backed via `directionMixedEvidenceFloor`. | Analyzer / Verdict | 2026-03-27 | `db7cdcf8`, `Docs/ARCHIVE/2026-03-27_Direction_Validator_False_Positive_Investigation.md` |
| ✅ **Outage-resilience A-track completed**: clear network outages now count toward LLM provider failure, Stage 4 preflights connectivity, paused systems abort damaged jobs instead of fabricating fallback verdicts, and watchdog auto-resume is restricted to network-caused pauses. | Analyzer / Reliability / Runner | 2026-03-27 | `ba80a919`, `83a50d8c`, `4ac43609`, `bb40e441`, `Docs/WIP/2026-03-27_Internet_Outage_Resilience_Plan.md` |
| ✅ **Proposal 2 multilingual output/search groundwork shipped**: `LanguageIntent`, explicit `reportLanguage` threading through Stage 4/5, prompt-language contracts, and result JSON auditability. | Analyzer / Multilingual | 2026-04-01 | `8641f56c`, `1281f7d4` |
| ✅ **Experimental EN supplementary retrieval lane shipped default-off and hardened**: UCM-controlled coverage-expansion lane for non-English inputs under native-language scarcity. Follow-up review findings are fixed; the remaining gate is live validation before any promotion. | Analyzer / Search / Multilingual | 2026-04-01 | `e9002e9c`, `06fab2e5`, `8f9d4fae`, `ac51975c`, `Docs/AGENTS/Handoffs/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md` |
| ✅ **PIPE-INT-1 all-insufficient root fix + report matrix + LLM article adjudication**: assessable-claims path, verdict uniqueness invariant, report matrix over all claims, VERDICT_NARRATIVE adjudication extension, deterministic truth clamp removed (confidence ceiling retained). | Analyzer / Integrity / UI | 2026-03-30 | `03387283` + follow-up policy patch |
| ✅ **Quality evolution deep analysis**: 100 jobs across 12 families, 8 change waves. Cross-linguistic neutrality gap identified (Plastik 58pp). | Quality / Analysis | 2026-03-30 | `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` |
| ✅ **Source-fetch failure reduction**: Stage-2 acquisition now applies per-domain 401/403 blocking-streak short-circuiting within each `fetchSources()` call (`fetchDomainSkipThreshold`, default `2`) and enriches `source_fetch_failure` warnings with human-readable error summaries. Skipped URLs excluded from `attempted` metrics; no warning-policy change. | Analyzer / Reliability | 2026-03-31 | `Docs/ARCHIVE/2026-03-31_Source_Fetch_Failure_Reduction_Plan.md` |
| ✅ **W15 domain-aware fetch batching**: same-domain requests staggered within fetch batches. UCM `fetchSameDomainDelayMs` (default 500). | Analyzer / Reliability | 2026-03-26 | `5942eba5` |
| ✅ **P1-B preliminary search parallelism**: 3-level parallelization across claims, queries, and source fetches. | Analyzer / Performance | 2026-03-26 | `756dded0` |
| ✅ **REMAP-1 seeded-evidence LLM remap promoted to default-on** (`b5fad127`): post-Pass-2 Haiku remap recovers claim-local attribution for semantic-slug seeded items. Current-stack A/B validated: Bolsonaro 0%→88% seeded mapping, same verdict direction, controls stable. Captain approved. Rollback flag available. The initial Homeopathy monitor signal did not reproduce on post-promotion confirmation runs. | Analyzer / Quality | 2026-03-27 | `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md` |
| ✅ **DIV-1 diversity-aware Stage-2 sufficiency promoted to default**: Validated on 8 runs — 0/8 UNVERIFIED, Bolsonaro confidence spread 23pp→5pp, no regressions. Stage 2 now aligns sufficiency with D5 item-count + diversity thresholds. | Analyzer / Quality | 2026-03-26 | `83a47aad`, `23d8576c` |
| ✅ **UCM-1 to UCM-5 complete**: All hardcoded analysis-affecting parameters moved to UCM. 6 research depth params, 10 per-task temperatures, recency internals, temporal guard ceiling. | Config / UCM | 2026-03-26 | `fb5395b0` |
| ✅ **OBS-2 Stage-1 observability**: `inputClassification` and `contractValidationSummary` persisted in result JSON. | Analyzer / Observability | 2026-03-26 | `d6090f76` |
| ✅ **Post-spread verdict-label staleness fixed**: `percentageToClaimVerdict()` now called after spread adjustment. | Analyzer / Verdict | 2026-03-26 | `289afa1c` |
| ✅ **B1 claim-contract validation**: LLM-backed predicate preservation + no-proxy-rephrasing enforcement with single retry. | Analyzer / Quality | 2026-03-26 | Prompt `CLAIM_CONTRACT_VALIDATION` |
| ✅ **Stage 4.5 SR calibration confidence_only validated**: Experimentally validated on 5-claim control set. Feature remains behind flag. | Analyzer / SR | 2026-03-26 | `Docs/AGENTS/Agent_Outputs.md` |
| ✅ **Preliminary-evidence multi-claim mapping fix**: Seeded evidence preserves full `relevantClaimIds[]` into Stage 2. | Analyzer / Quality | 2026-03-26 | `31aea55d` |
| ✅ **QLT-4 per-claim contrarian retrieval experiment closed and removed**: Feature implemented but never triggered on real data. Preflight confirmed Plastik EN per-claim evidence is already directionally balanced. Experimental code, UCM config fields, and tests reverted from codebase. | Analyzer / Quality | 2026-03-26 | `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Code_Revert.md` |
| ✅ **OBS-1 per-job metrics isolation**: replaced module-global collector with AsyncLocalStorage; concurrent jobs no longer share metrics. | Analyzer / Observability | 2026-03-25 | `6e402208` |
| ✅ **VAL-2 jobs-list sync race fixed**: verdict badge gated on terminal status; monotonic progress guard prevents backward progress. | Web / API / Runner | 2026-03-25 | `f86811fe` |
| ✅ **QLT-3 facet-consistency fix**: Muslims-family claim count stabilized (2-3→3-3), `claimDirection` all `supports_thesis`, counter-narrative/media claims eliminated. Truth spread 27pp→21pp. | Analyzer / Quality | 2026-03-25 | `317319fb`, `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT3_Facet_Consistency_Fix.md` |
| ✅ **QLT-2 characterization**: 13-job batch found split root cause — Plastik EN evidence-driven, Muslims Stage-1 unstable. | Analyzer / Quality | 2026-03-25 | `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT2_Characterization.md` |
| ✅ **QLT-1 validation**: Plastik DE predicate-strength stabilization confirmed (47pp→22pp), all anchors clean. | Analyzer / Quality | 2026-03-25 | `Docs/AGENTS/Handoffs/2026-03-25_Senior_Developer_QLT1_Full_Validation_Report.md` |
| ✅ **Config provenance repair**: ClaimBoundary jobs now persist reliable per-job config provenance and snapshot data again. | Analyzer / Observability | 2026-03-22 | `1cb9b9cc`, `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Config_Provenance_Repair.md` |
| ✅ **WS-2 completed end-to-end**: full Stage 2 research-loop deconstruction finished; `claimboundary-pipeline.ts` reduced to a slim orchestrator. | Analyzer / Refactoring | 2026-03-23 | `27fc325c`, `Docs/ARCHIVE/2026-03-23_Stage_2_Research_Loop_Deconstruction_Design.md` |
| ✅ **WS-3 / WS-4 complete**: `evaluate-source` decomposed into request-scoped modules; search-provider clone boilerplate consolidated. | API / Web / Refactoring | 2026-03-23 | `25e4f633`, `04efbd19` |
| ✅ **Stage-4 incident visibility + provider guard hardening**: fallback verdict failures now surface correctly, and the verdict path uses lane-aware backpressure aligned to provider docs. | Analyzer / Reliability | 2026-03-23 | `31aee703`, `75416ce8`, `aa123936` |
| ✅ **Stage-4 reliability validation passed**: concurrent local control batch no longer reproduced `Stage4LLMCallError` / `VERDICT_ADVOCATE` collapse. | Analyzer / Reliability | 2026-03-23 | `Docs/AGENTS/Agent_Outputs.md` (2026-03-23 Stage 4 Provider Guard — Live Validation PASSED) |
| ✅ **Stage-1 `claimDirection` prompt fix**: clarified that thesis direction is relative to the user's position, not to reality or consensus. | Analyzer / Prompt Quality | 2026-03-24 | `1e7e2c57`, `Docs/AGENTS/Agent_Outputs.md` |
| ✅ **Preliminary-evidence multi-claim mapping fix**: preserved `relevantClaimIds[]` into Stage 2 seeding to repair boundary coverage leakage. | Analyzer / Quality | 2026-03-24 | `31aea55d`, `Docs/AGENTS/Agent_Outputs.md` |
| ✅ **VAL-1 validation gate closed**: 7 control jobs across Earth/Hydrogen/Bolsonaro/Plastik — all directionally correct, zero infrastructure failures, sanity guard working. | Analyzer / Quality | 2026-03-24 | `Docs/AGENTS/Agent_Outputs.md` |
| ✅ **Verdict-direction plausibility narrowed**: Rule 2 no longer auto-passes 31-69% truth with one-sided evidence; evidence bucketing uses verdict's own ID partition. | Analyzer / Verdict | 2026-03-24 | `460be546` |
| ✅ **Plastik instability root-caused to Stage 1**: 5× identical-input comparison confirmed claim count, facet, and predicate strength variation as primary instability source (47pp spread). | Analyzer / Quality | 2026-03-24 | `Docs/AGENTS/Handoffs/2026-03-24_Senior_Developer_Plastik_Decomposition_Comparison.md` |

---

## UCM Configuration Completeness — DONE

All 5 UCM gaps identified in the 2026-03-13 audit are now implemented (`fb5395b0`).

| Item | Description | Status |
|------|-------------|--------|
| **UCM-1** | Research depth params (6 fields) in pipeline config with mode-based selection via `getActiveConfig()` | DONE |
| **UCM-2** | Source extraction limit wired from `pipelineConfig.sourceExtractionMaxLength` | DONE |
| **UCM-3** | 10 per-task LLM temperatures wired across 7 modules | DONE |
| **UCM-4** | Recency volatility multipliers + volume attenuation brackets in CalcConfig | DONE |
| **UCM-5** | Temporal guard confidence ceiling in CalcConfig (schema ready, code wiring when `temporal-guard.ts` is created) | DONE |

---

## Recently Completed (March 15-17, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Phase A contamination fixes**: Fix 0-A (language drift directive), Fix 4 (contradiction budget reservation), Fix 5 (phantom evidence ID filter). All validated — zero foreign boundaries, German boundaries preserved, contradiction loop protected. | Analyzer / Quality | 2026-03-15 | Commit `28d42d8f`, `Docs/ARCHIVE/Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` §6-A |
| ✅ **Rec-A: Pass 2 → Haiku**: Task key changed from `"verdict"` to `"extract_evidence"`. ~3% LLM cost saving, eliminates soft-refusal fallback cascade. Validated across 4 diverse claims. | Analyzer / Cost | 2026-03-15 | Commit `1a0687c0`, `Docs/ARCHIVE/LLM_Model_Allocation_Review_2026-03-15.md` |
| ✅ **Rec-C: getModel() literal fix**: `resolveModel("sonnet")` → `resolveModel("standard")`. Zero functional change, naming cleanup. | Config / Hygiene | 2026-03-15 | Commit `e65efbe1` |
| ✅ **Search accumulation restoration**: `autoMode: "accumulate"` UCM toggle. Restores multi-provider evidence filling baseline. CSE-only accumulate TP=71 (best single run). | Search / Quality | 2026-03-16 | Commit `5243d678`, `Docs/ARCHIVE/Search_Accumulation_Restoration_Plan_2026-03-15.md` |
| ⚠️ **SerpAPI re-enablement attempted and reverted**: Circuit breaker OPEN, +100% latency, zero evidence. Remains disabled. | Search / Provider | 2026-03-16 | Commit `b0f3becb` |
| ✅ **SR defaultScore fix (0.45→null)**: Root cause of Mar 12 TP regression. Unevaluated sources now excluded from weight calculation instead of being penalized. Gate 4 aligned. | SR / Quality | 2026-03-16 | Commit `a01577d8`, `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` |
| ✅ **Orphaned job re-queue on restart**: RUNNING jobs from previous process + INTERRUPTED jobs automatically re-queued on startup. Frees zombie concurrency slots immediately. | Runner / Reliability | 2026-03-16 | Commits `e14ae59e`, `db0246fa` |
| ✅ **Phase A boundary pruning**: Empty boundaries removed from coverage matrix. Concentration warning fires when >80% evidence in one boundary. | Analyzer / Quality | 2026-03-16 | `Docs/WIP/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16.md` |
| ✅ **Proxy claim exclusion (thesisRelevance)**: Claims with `thesisRelevance: "tangential"/"irrelevant"` get weight=0 in aggregation. | Analyzer / Quality | 2026-03-16 | Commit `bb2d3190` |
| ✅ **metrics.ts pricing update**: gpt-4.1, gpt-4.1-mini, gemini-2.5-pro/flash, claude-opus-4-6 added. Cost tracking now accurate for all models in model-resolver.ts. | Metrics / Cost | 2026-03-15 | Pre-Phase-A commit |
| ✅ **Phase C: analyticalDimension**: New field on EvidenceScope capturing what property is measured. Schema, fingerprint, extraction + clustering prompts updated. Needs prompt refinement (Haiku not populating optional field). | Analyzer / Quality | 2026-03-17 | Commit `81314c86`, Combined Plan Phase C |
| ⚠️ **Historical note — SR weighting briefly returned with a neutral default**: this was a transitional March state, but current `main` no longer treats legacy evidence weighting as the default live path. Use current status/config, not this historical row, when reasoning about today’s stack. | SR / Quality | 2026-03-17 | Commit `381135c2` |
| ✅ **Analysis Timeline UI**: Structured event display with LLM call merging, model names, search provider info, debate step tracking. | Web UI | 2026-03-16 | Commits `d2b87c08` through `bfa859d4` |
| ✅ **WIP Consolidation #6**: 30 WIP + 6 STATUS + 19 Handoffs archived. 3 `_fwd` files created. WIP reduced from 40 to 18 files. | Documentation | 2026-03-17 | `Docs/WIP/README.md`, `Docs/ARCHIVE/README_ARCHIVE.md` |
| ✅ **Config test fixes**: Legacy tier name tests updated to canonical strength names (budget/standard). | Tests / Hygiene | 2026-03-15 | Pre-Phase-A commit |

---

## Recently Completed (March 13, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Debate role config terminology migration**: Provider-branded names (`haiku/sonnet/opus`) → provider-neutral (`budget/standard/premium`). Split `debateModelTiers`/`debateModelProviders` → unified `debateRoles.<role>.{provider, strength}`. `tigerScoreTier` → `tigerScoreStrength`. Legacy fields auto-normalize on load. | Config / Architecture | 2026-03-13 | Commit `84fa644e` |
| ✅ **UCM inline fallback alignment (10 conflicts)**: All inline `??` fallback defaults in analysis code aligned to UCM authoritative values. Key fixes: `mixedConfidenceThreshold` 40→45, `defaultTrackRecordScore` 0.4→0.45, `gate4QualityThresholdHigh` 0.7→0.75, `selfConsistencyMode` "disabled"→"full", `maxTotalTokens` 500K→1M. | Config / Quality | 2026-03-13 | Commit `f380eaab` |

---

## Recently Completed (March 3, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **VPS deployment operational**: Production (`app.factharbor.ch`) and test (`test.factharbor.ch`) instances running on Infomaniak VPS. Automated deploy script, test instance setup script, backup cron, Caddy reverse proxy with TLS. | Ops / Deployment | 2026-03-03 | `scripts/DEPLOYMENT.md`, `Docs/ARCHIVE/2026-03-02_Deployment_Strategy_PreRelease.md` |
| ✅ **UCM defaults alignment**: Fixed divergence between code defaults and file defaults causing verdict downgrades. Pipeline config, config-schemas, AboutBox updated. | Config / Quality | 2026-03-03 | Commit `3085b91`, `Docs/ARCHIVE/2026-03-03_UCM_Defaults_Alignment.md` |
| ✅ **P0 quality stabilization**: Sufficiency gate updated (sourceType OR distinct domains), verdict-stage fail-open wrapper, sourceType prompt hardening, SR partial-failure noise suppressed. | Analyzer / Quality | 2026-03-03 | Commit `c8c0a69`, `Docs/ARCHIVE/2026-03-03_Post_UCM_Quality_Regression_Investigation.md` |
| ✅ **Deploy script OOM prevention**: `deploy.sh` now stops test services before build to prevent OOM on 4 GB VPS. | Ops / Reliability | 2026-03-03 | Commit `e833fce` |
| ✅ **Maintenance page UX**: Caddy content-negotiation (JSON for API, HTML for pages), client-side maintenance detection on jobs pages. | Ops / UX | 2026-03-03 | Commit `e833fce`, `scripts/Caddyfile.reference` |

---

## Recently Completed (March 2, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Pre-release readiness Steps 0-12**: SSRF hardening, admin auth sweep, rate limiting, CORS lockdown, invite code management UI, EF migrations, smoke tests, deployment strategy, API data exposure hardening, UI polish (disclaimer, footer), monolithic dynamic removal. | Security / Ops / UI | 2026-03-02 | `Docs/ARCHIVE/2026-03-01_Limited_Public_PreRelease_Readiness_Plan.md` |
| ✅ **Monolithic Dynamic pipeline removed**: 902 lines + prompts + tests deleted. Single pipeline (ClaimBoundary) for pre-release. | Architecture / Cleanup | 2026-03-02 | Commit `122f34b`, `Docs/ARCHIVE/2026-03-02_Remove_Monolithic_Dynamic_Pipeline.md` |
| ✅ **Pre-release UI texts**: Disclaimer banner, footer, methodology note, result disclaimer. | UI | 2026-03-02 | Commits `53f3ab4`, `829834f`, `Docs/ARCHIVE/2026-03-02_PreRelease_UI_Texts.md` |
| ✅ **API data exposure hardening (Step 11)**: Sensitive fields stripped from public API responses. | Security | 2026-03-02 | Commit `875972b` |
| ✅ **Invite code header migration (S-5)**: Moved from URL query string to `X-Invite-Code` header. | Security | 2026-03-02 | Commit `ccb3e88` |
| ✅ **Deployment strategy document**: VPS selection (Infomaniak), Caddy config, systemd services, staging instance design, backup procedures, rollback plan. Lead Architect review incorporated. | Ops / Architecture | 2026-03-02 | `Docs/ARCHIVE/2026-03-02_Deployment_Strategy_PreRelease.md` |
| ✅ **Next.js standalone output**: `output: "standalone"` in `next.config.js`. | Ops | 2026-03-02 | `apps/web/next.config.js` |
| ✅ **ForwardedHeaders middleware**: `X-Forwarded-For` support for real client IP behind Caddy proxy. | Security / Ops | 2026-03-02 | `apps/api/Program.cs` |

---

## Recently Completed (March 1, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Invite code access control**: Daily+lifetime quotas, atomic slot-claim (`IsolationLevel.Serializable`), job search (`?q=`), privacy fix (inviteCode removed from public responses), DB rebuilt. | Auth / API / UI | 2026-03-01 | Commit `976539f`, `Docs/ARCHIVE/2026-02-28_Invite_Code_Implementation_Plan.md` |
| ✅ **Inverse Claim Asymmetry — Phases 0–3**: Phase 1 integrity policies (implemented + activated: `safe_downgrade`, `retry_once_then_safe_downgrade`). Phase 2: CE gate, `InverseConsistencyDiagnostic`, root-cause tags, HTML panel, warning emission, paired-job audit CLI. Phase 3: mandatory inverse pair in smoke lane, CE threshold enforced. | Calibration / Quality | 2026-02-28 | Commits `2a17ac0`→`3fc9c0b`, `8e4a0d0`, `Docs/ARCHIVE/2026-02-27_Inverse_Claim_Asymmetry_Plan.md` |
| ✅ **Claim Fidelity Fix Phase 3**: `buildPreliminaryEvidencePayload()` compresses Pass 2 evidence to 120-char topic signals — eliminates rich statement text that caused claim drift. | Analyzer / Quality | 2026-02-28 | `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` |

---

## Recently Completed (February 27, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Report quality investigation (W1-W15)**: 15 weak areas identified, 8 fixed (spread multiplier wiring, Gate 4 classification, validation warning surfacing, probativeValue preservation, SR metadata serialization, W14 error masking chain, challenger temperature wiring, UCM config drift alignment). 4 resolved as by-design. | Analyzer / Quality | 2026-02-27 | [Report_Quality_Investigation](../ARCHIVE/Report_Quality_Investigation_2026-02-27.md) |
| ✅ **Evidence field trimming (token reduction #1)**: Verdict-stage LLM calls now pass 18 contract-relevant fields instead of 47. Drops sourceExcerpt, specificity, extractionConfidence. ~20-25% verdict stage input token reduction. | Analyzer / Cost | 2026-02-27 | Commit `975c303` |
| ✅ **UCM config drift resolved (5 params)**: selfConsistencyTemperature→0.4, maxTotalTokens→1M, maxIterationsPerContext cleared, sr.openaiModel→gpt-4.1-mini, defaultScore→0.4. Code defaults aligned across all locations. | Config / Quality | 2026-02-27 | [Report_Quality_Investigation](../ARCHIVE/Report_Quality_Investigation_2026-02-27.md) W5 |
| ✅ **Calibration preflight fix**: Removed hard-fail on provider overrides in gate runs. Calibration now tests actual production config (cross-provider with OpenAI challenger). | Calibration / Governance | 2026-02-27 | [Calibration_Run_Policy.md](Calibration_Run_Policy.md) §7 |
| ✅ **Pipeline seed alignment**: `selfConsistencyTemperature` 0.3→0.4, `challengerTemperature` 0.3 added to `pipeline.default.json`. D5 contrarian params added to `calculation.default.json`. | Config | 2026-02-27 | Commits `1b4f5b8`, prior session |
| ✅ **Project status docs updated**: Phase "entering Alpha"→"Alpha" across all docs. Test count synced to 1086. "Where FactHarbor stands out" added to Project Status. | Documentation | 2026-02-27 | Commit `f53f391` |

## Recently Completed (February 24, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Multi-source retrieval provider layer (Phases 1-4)**: Added Wikipedia, Semantic Scholar, and Google Fact Check providers; wired search AUTO dispatch + schema/admin/env integration; all providers default OFF; 36 new tests. | Search / Analyzer | 2026-02-24 | Commit `8dae5a2` |
| ✅ **Calibration harness reliability hardening**: Operational-vs-diagnostic gate split, per-pair checkpoint artifacts, production-profile preflight enforcement (`OpenAI` challenger), and aborted-run policy (non-decision-grade). | Calibration / Governance | 2026-02-24 | Commits `6558e34`, `c5931cd` |
| ✅ **Deprecated calibration report cleanup**: Retired pre-v3 tracked report artifacts and removed stale path references from status docs. | Documentation | 2026-02-24 | Commit `c5931cd` |

## Recently Completed (February 23, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **D5 evidence controls**: Sufficiency gate (min items + source types), evidence partitioning (institutional→advocate, general→challenger), contrarian retrieval (targeted searches for underrepresented evidence). All UCM-configurable. | Analyzer / Quality | 2026-02-23 | [Code_Review_D5_B1_UI_2026-02-23.md](../ARCHIVE/Code_Review_D5_B1_UI_2026-02-23.md) |
| ✅ **B-1 runtime role tracing**: `callContext: { debateRole, promptKey }` on all 5 debate roles. `runtimeRoleModels` in resultJson meta. Calibration report renders Runtime Role Usage table with mismatch detection. | Analyzer / Observability | 2026-02-23 | [Code_Review_D5_B1_UI_2026-02-23.md](../ARCHIVE/Code_Review_D5_B1_UI_2026-02-23.md) |
| ✅ **UI warning triage**: Three-tier split — provider issues (collapsed banner), quality warnings (prominent), operational notes (collapsed). `WarningCard` extracted as reusable component. | Web UI | 2026-02-23 | [Code_Review_D5_B1_UI_2026-02-23.md](../ARCHIVE/Code_Review_D5_B1_UI_2026-02-23.md) |
| ✅ **Calibration v2**: Canary mode (single-pair smoke test), bias-pairs v2.0.0 (negated→affirmative counter-positions), preflight config check, B-sequence default activation. | Calibration | 2026-02-23 | [Code_Review_D5_B1_UI_2026-02-23.md](../ARCHIVE/Code_Review_D5_B1_UI_2026-02-23.md) |
| ✅ **Model usage utility**: `model-usage.ts` — extracts and deduplicates all LLM model names from analysis results. Used in job page badge and HTML report. | Analyzer / Observability | 2026-02-23 | Commit `25752ff` |
| ✅ **WIP consolidation**: Archived 8 files (CB Architecture, Cross-Provider, QualityMap Decisions, Calibration Harness, A3 Gate Result, Plan Pause, Code Review, quality priorities). 12 files retained. | Documentation | 2026-02-23 | [WIP/README.md](../WIP/README.md) |

## Recently Completed (February 22, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **B-sequence quality improvements (B-5a/B-6/B-7/B-8/B-5b)**: Challenger prompt strengthening, verifiability annotation, misleadingness flag (decoupled from truth%), explanation quality check (structural + LLM rubric), opus tier support. All UCM-configurable. | Analyzer / Quality | 2026-02-22 | Commits `6e9fa0b`→`640d883` |
| ✅ **Codex review fixes (3M) + i18n hardening**: claimAnnotationMode wired to strip verifiability, rubric graceful degradation, verdict category structural check. All English-language regex replaced with Unicode-aware structural patterns. Dead stopwords.ts deleted. 1001 tests passing. | Analyzer / i18n | 2026-02-22 | Commits `efd12c2`→`62e7e37` |
| ✅ **xWiki documentation update (CB pipeline)**: 7 architecture xWiki pages updated for ClaimAssessmentBoundary pipeline. Core ERD, Analysis Entity Model, Entity Views (5 views), Data Model, Quality Gates Flow, CB Pipeline Detail, Evidence Filter — all rewritten from Orchestrated-era content. | Documentation | 2026-02-22 | Commits `464e641`, `c605d70` |
| ✅ **Code review final findings (1M, 3L)**: B8-M1 (UCM cost documentation), B7-L1 (parseMisleadingness warning), B8-L1 (hasLimitations comment). | Analyzer / Quality | 2026-02-22 | Commit `231ff13` |
| ✅ **WIP consolidation**: Archived 17 completed/superseded files (8 code reviews, 3 quality map reviews, 6 process docs). 17 files retained as active. | Documentation | 2026-02-22 | `Docs/ARCHIVE/README_ARCHIVE.md` |

## Recently Completed (February 21, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Calibration review hardening (2026-02-22b + carried fixes)**: `runIntent` metadata made legacy-safe (optional type), lane scripts now explicitly stamp run intent (`FH_CALIBRATION_RUN_INTENT` via smoke/gate runner), provider-attribution denominator cleanup, and legacy report refresh guard for missing `failureModes`. | Calibration / Reliability | 2026-02-22 | [Code_Review_2026-02-22b.md](../ARCHIVE/Code_Review_2026-02-22b.md), [Plan_Pause_Status_2026-02-22.md](../ARCHIVE/Plan_Pause_Status_2026-02-22.md) |
| ✅ **Calibration gate/smoke lane policy + wiring**: Added canonical run policy, consolidated significance tiers, and implemented `runIntent` metadata (`gate`/`smoke`) with lane-specific artifact prefixes. | Calibration / Governance | 2026-02-22 | [Calibration_Run_Policy.md](Calibration_Run_Policy.md) |
| ✅ **Calibration report model & search transparency**: Reports now show LLM provider, tiering, pipeline models, per-role tier/provider/model, and search provider config. Backfilled all 5 existing reports. Pipeline `meta.modelsUsed` populated. Per-side search providers in pair cards. | Calibration / Observability | 2026-02-21 | `Docs/ARCHIVE/Code_Review_2026-02-21b.md`, `Docs/ARCHIVE/Code_Review_D5_B1_UI_2026-02-23.md` |

## Recently Completed (February 20, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **C10 baseline complete + threshold ratified**: Quick + full calibration runs (10 pairs, 3 languages), Option C threshold policy ratified (C18 hard gate, skew diagnostic). Baseline v1 locked. | Calibration / Governance | 2026-02-20 | [Calibration_Baseline_v1.md](Calibration_Baseline_v1.md) |
| ✅ **Action #6: Verdict range + baseless challenge guard**: `truthPercentageRange` (consistency spread + boundary variance), `enforceBaselessChallengePolicy` (hybrid enforcement with deterministic revert), `baselessAdjustmentRate` metric. 943 tests passing. | Analyzer / Quality | 2026-02-20 | [Stammbach §5.1](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md) Action #6 |
| ✅ **Cross-provider debate routing**: Per-role `debateModelTiers` and `debateModelProviders` config, provider-level separation, fallback warnings in `analysisWarnings`. *(Originally implemented as `debateProfile` presets; simplified to direct role config 2026-02-23.)* | Analyzer / Config | 2026-02-20 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |

## Recently Completed (February 17-19, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **Documentation cleanup**: Archived Orchestrated Pipeline xwiki page, pre-Feb-13 changelog, stale `Documentation_Updates_2026-02-03.md`. Updated Pipeline Variants + Deep Dive Index xwiki pages for CB as current default. | Docs | 2026-02-19 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **Dynamic Pipeline schema fix**: Fixed `AI_NoObjectGeneratedError` in Monolithic Dynamic pipeline — `searchQueries` and `additionalInsights` relaxed to optional, retry wired, graceful degradation fallback added. | Analyzer / Quality | 2026-02-19 | [Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md](../AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md) |
| ✅ **Claim Fidelity Fix Phases 1+2**: Gate 1 `passedFidelity` check, Pass 2 prompt anchoring to user input, safety-net rescue. Phase 3 (evidence payload compression) and Phase 4 (baseline validation) still pending. | Analyzer / Quality | 2026-02-18 | [Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md](../AGENTS/Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md) |
| ✅ **Code Review Sprint (5 phases, 45 findings)**: New shared `auth.ts` (timingSafeEqual), `job-abort.ts` (globalThis), search hardening (cache + multi-provider + circuit breaker). Residuals: 10 test failures + auth migration sweep (see active backlog). | Architecture / Quality | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **AtomicClaim extraction Phases 1+2**: Prompt improvements + Gate 1 active filtering + dynamic max claims. Target ~40% reduction in LLM calls. Phase 3 validation with real LLM calls pending. | Analyzer / Cost | 2026-02-18 | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../ARCHIVE/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
| ✅ **Job cancel/delete**: Users can cancel running jobs and delete completed/failed jobs from the UI and API. | Web UI | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **JSON tree view**: Interactive expand/collapse + copy-to-clipboard for JSON tab on job detail page (`react-json-view-lite`). | Web UI | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **Architecture docs + ERD rework**: Data model ERDs verified against `types.ts` (10 entities, 28 mismatches fixed). Specification/Data Model updated as compatible future target with CB terminology throughout. | Docs | 2026-02-18 | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) |
| ✅ **CB Pipeline v1.0 COMPLETE**: All 5 stages implemented (extractClaims, researchEvidence, clusterBoundaries, generateVerdicts, aggregateAssessment). 853 tests passing. Production-ready. | Analyzer / Pipeline | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5a: Stage 1**: Two-pass evidence-grounded claim extraction with Gate 1 validation. 24 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5b: Stage 2**: Claim-driven research with contradiction search, EvidenceScope validation, derivative tracking. 28 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5c: Stage 3**: LLM-driven boundary clustering with coherence assessment and cap enforcement. 21 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5d: Stage 4**: Production LLM wiring for verdict-stage module. 11 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5e: Stage 5**: Triangulation scoring, weighted aggregation, VerdictNarrative, quality gates. 17 tests. | Analyzer | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5f: Integration test**: 3 end-to-end scenarios with schema validation. | Testing | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5f2: Rename**: ClaimBoundary → ClaimAssessmentBoundary (partial: types/docs/UI, internal IDs unchanged). 18 files. | Refactoring | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 5g: Documentation**: Status, governance, and architecture docs updated for v1.0 completion. | Docs | 2026-02-17 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **UCM Config for CB**: All 24 CB parameters added to UCM schemas with defaults. | Config | 2026-02-17 | [UCM Audit](../ARCHIVE/UCM_Configuration_Audit_2026-02-17.md) |

### Previously Completed (February 16, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **CB Step 0: Rules Audit**: Updated all governance docs for ClaimBoundary terminology. | Architecture / Governance | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 1: Infrastructure**: Types, verdict-stage module, 8 UCM prompts, pipeline skeleton. 50 tests. | Analyzer / Pipeline | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 2: Cutover**: ClaimBoundary wired as default route. Schema 3.0.0-cb. | Analyzer / Pipeline | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 2a: Delete Orchestrated**: ~18,400 lines removed. | Analyzer / Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 3: UI**: BoundaryFindings component, page.tsx updated. | Web UI | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 3b: MD Cleanup**: Dead prompt infrastructure removed (~3,300 lines). | Analyzer / Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Phase 4: Final AC Sweep**: Zero AnalysisContext references in active code. | Cleanup | 2026-02-16 | [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md) |
| ✅ **CB Architecture Design**: 9/9 decisions closed, 2 review rounds, 13 v1 features. | Architecture | 2026-02-16 | [Architecture Doc](../WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md) |
| ✅ **WIP Consolidation**: Archived 11 files. WIP reduced from 19 to 7 active files. | Docs / Cleanup | 2026-02-16 | [WIP README](../WIP/README.md) |

### Previously Completed (February 13, 2026)

| Description | Domain | Completed | Reference |
|---|---|---|---|
| ✅ **API Cost Optimization (Quick Wins)**: Reduced budget defaults (iterations 5→3, total 20→10, tokens 750K→500K), tightened context detection (maxContexts 5→3, dedupThreshold 0.85→0.70), excluded 4 expensive LLM tests from `npm test`, documented full cost reduction strategy. | Cost / Testing | 2026-02-13 | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) |
| ✅ **Report Quality Hardening (Phase 1)**: Added explicit zero-source warnings (`no_successful_sources`, `source_acquisition_collapse`) plus threshold guards and unit coverage (7 tests). | Analyzer / Quality | 2026-02-13 | [Analysis Quality Issues](../ARCHIVE/Analysis_Quality_Issues_2026-02-13.md) |
| ✅ **Report Quality Hardening (Phase 2)**: Improved qualifier preservation and direction-semantics guidance in orchestrated prompts; direction-validation routing updated to verdict-tier model selection. | Analyzer / Prompts | 2026-02-13 | [Report Issues Plan](../ARCHIVE/Report_Issues_Review_and_Fix_Plan_2026-02-13.md) |
| ✅ **Phase 2a Evidence Processor Extraction**: Extracted 3 new modules from orchestrated.ts (705 lines): evidence-normalization.ts, evidence-recency.ts, evidence-context-utils.ts. Reduced orchestrated.ts by 493 lines. | Architecture / Refactoring | 2026-02-12 | [Current Status](Current_Status.md) |
| ✅ **Normalization Removal**: Deleted all heuristic normalization code (~500 lines). LLM-first input handling for question/statement equivalence. | Analyzer / AGENTS Compliance | 2026-02-12 | [Normalization Plan](../ARCHIVE/Normalization_Issues_and_Plan.md) |
| ✅ **Defensive Clamping Replacement**: Replaced `clampTruthPercentage` with `assertValidTruthPercentage` (fail-fast validation). 10 call sites updated with context strings. | Analyzer / Quality | 2026-02-12 | [Current Status](Current_Status.md) |
| ✅ **Canonical Pipeline Removal**: Removed Monolithic Canonical variant (~2,281 lines). Twin-Path architecture (Orchestrated + Monolithic Dynamic). | Architecture / Refactoring | 2026-02-10 | [Removal Plan](../ARCHIVE/Canonical_Pipeline_Removal_Plan.md) |
| ✅ **UCM Phase 1: Analyzer Integration**: Analyzer now loads pipeline/search/calc from UCM (hot-reloadable). Env-based analysis settings removed. `LLM_PROVIDER` deprecated. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 2: Save-to-File Functionality**: Bidirectional sync allows saving DB configs back to default JSON files (dev mode only). Atomic writes with backup. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **UCM Phase 2: Job Config Snapshots**: `job_config_snapshots` capture pipeline/search + SR summary per job for auditability. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 3: SR Modularity Interface**: SR config is separate UCM domain; SR service config wired and isolated from pipeline config. | Architecture / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **UCM Phase 4: Admin UI Polish**: Split routes to `/admin/quality/*` (FactHarbor) and `/admin/sr/*` (SR standalone). Added validation warnings for dangerous config combos and snapshot viewer. | Web UI / Config | 2026-02-02 | [UCM Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **Drift Detection & Health Validation**: New endpoint `GET /api/admin/config/:type/drift`. Health check includes config validation. | Architecture / Config | 2026-02-02 | [UCM User Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/Unified%20Config%20Management/WebHome.xwiki) |
| ✅ **Terminology cleanup**: Context vs EvidenceScope naming cleanup in admin UI + schema (legacy keys supported). | Analyzer / Docs | 2026-02-02 | [Terminology Migration Summary](../ARCHIVE/REVIEWS/Terminology_Migration_SUMMARY.md) |
| ✅ **UCM Pre-Validation Sprint (v2.10.0)**: Toast notifications, Export All Configs, Active Config Dashboard, Config Diff View, Default Value Indicators, Config Search by Hash. | Web UI / Config | 2026-01-31 | [CHANGELOG](../CHANGELOG.md) |
| ✅ **Unified Configuration Management Foundation (v2.9.0)**: Extended config system to all core types (prompt, search, calculation, pipeline, sr) plus lexicons. Added prompt import/export/reseed APIs. 158 unit tests. Admin UI complete. | Architecture / Testing | 2026-01-30 | [Implementation Review](../ARCHIVE/REVIEWS/Unified_Configuration_Management_Implementation_Review.md) |
| ✅ **LLM Text Analysis Pipeline**: Implemented 4 analysis points with hybrid LLM/heuristic architecture. Bug fix in v2.8.1 removed counter-claim detection from verdict prompt. | Analyzer / LLM | 2026-01-30 | [Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md) |
| ✅ **Promptfoo Test Coverage for Text Analysis**: Created 26 test cases covering all 4 text-analysis prompts (input classification, evidence quality, context similarity, verdict validation). Total promptfoo coverage now 38 test cases across 6 prompts. | Testing / LLM | 2026-01-30 | [Promptfoo Testing Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |

---

## Core Functionality & Quality

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Validate B-sequence features with real runs**: All B-sequence improvements (pro_con queries, verifiability/misleadingness annotations, rubric scoring) are implemented but untested with real data. Run 2-3 analyses with UCM features enabled (~$3-5). This is the missing feedback loop. | Analyzer / Quality | high | high | [Next_For_Report_Quality.md](../ARCHIVE/Next_For_Report_Quality.md) item 1 |
| **C13 active rebalancing**: D5 Control 3 (contrarian retrieval) implemented — runs targeted searches when evidence pool imbalance detected. Full rebalancing loop (A/B target: ≥30% reduction in `meanAbsoluteSkew` vs Baseline v1) still needs validation with real runs. | Analyzer / Quality | high | high | [Stammbach §5.3 item 3](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md), [Calibration_Baseline_v1.md §6](Calibration_Baseline_v1.md) |
| **Verdict Accuracy Test Set**: Curate 50 claims with independently verified outcomes (15+ T/F, 15+ contested, 10+ multilingual, 10+ fact-check anchors) from Climate Feedback, PolitiFact, Snopes, AFP, Full Fact. Metric: `verdictAccuracyRate` = % where pipeline verdict matches ground truth category. Measures correctness, not just symmetry. | Analyzer / Quality | high | high | [Report_Quality_Opportunity_Map](../ARCHIVE/Report_Quality_Opportunity_Map_2026-02-22.md) §5 |
| **P1: Warning aggregation for source_fetch_failure noise**: Aggregate per-query `source_fetch_failure` warnings into a single summary. Suppress routine low-ratio partial failures per Captain policy. Reduce warning noise without masking true degradation. | Analyzer / UX | med | med | `Docs/ARCHIVE/2026-03-03_Post_UCM_Quality_Regression_Investigation.md` P1 |
| **P2: UI grouping of operational notes vs quality signals**: Separate operational notes (fetch retries, SR cache misses) from hard quality signals in the UI warning display. | Web UI | low | med | `Docs/ARCHIVE/2026-03-03_Post_UCM_Quality_Regression_Investigation.md` P2 |
| **Revert sufficiency temp mitigation**: `evidenceSufficiencyMinSourceTypes` is temporarily set to `1` (should be `2`). Revert once deployed system proves stable (~7 days without false `insufficient_evidence`). | Config / Quality | med | med | `Docs/ARCHIVE/2026-03-03_Post_UCM_Quality_Regression_Investigation.md` §13 |
| **Self-consistency Haiku experiment**: Test self-consistency (Step 2) on Haiku instead of Sonnet via UCM `debateModelTiers.selfConsistency: "haiku"`. Measure spread/diversity vs cost. No code change needed — UCM config test only. | Analyzer / Cost | med | med | [Report_Quality_Investigation](../ARCHIVE/Report_Quality_Investigation_2026-02-27.md) Phase 1 item #2 |
| **SR weighting: supporting-only asymmetry**: `applyEvidenceWeighting` only uses `supportingEvidenceIds` — contradicting evidence sources are ignored. A verdict backed by low-reliability supporting AND low-reliability contradicting sources is penalized more than warranted. Should use net-reliability across both directions. | SR / Quality | low | med | `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` §4.2 |
| **SR weighting: per-verdict avgWeight non-determinism**: `avgWeight` varies run-to-run because which evidence IDs the LLM cites as supporting is non-deterministic. Consider weighting all evidence items per claim rather than only LLM-cited ones. | SR / Quality | low | med | `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` §4.1 |
| **Triangulation/derivative factor LLM Intelligence review**: Both are deterministic heuristics making analytical judgments about evidence diversity and claim overlap. Should be reviewed under AGENTS.md "LLM Intelligence" mandate. Low-magnitude impact but architecturally non-compliant. | Analyzer / Architecture | low | med | `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` §4.3 |
| **SR evaluation: Wikipedia scoring**: Wikipedia domains score 38-42% — under-scored because SR evaluation criteria over-weight traditional editorial structures and under-weight crowdsourced quality mechanisms. SR evaluation prompt quality improvement needed. | SR / Quality | low | med | `Docs/ARCHIVE/SR_Evidence_Weighting_Investigation_2026-03-16.md` §4.4 |
| **INTERRUPTED recovery test coverage**: The INTERRUPTED→QUEUED restart path in `internal-runner-queue.ts` has no integration test. The orphaned-RUNNING→QUEUED path is covered. | Runner / Testing | low | low | Code review finding from `db0246fa` |
| **Phase C: analyticalDimension prompt refinement**: Haiku ignores the optional `analyticalDimension` field. Make it required in the prompt (keep `.catch(undefined)` in Zod). Validate with Hydrogen benchmark. | Analyzer / Quality | med | high | Combined Plan Phase C, commit `81314c86` |
| **Job Events Phase 2: structured data field**: Add `data: JsonObject` to `JobEventEntity` (C# schema change). Enables machine-readable event metadata alongside human-readable messages. | API / Architecture | low | low | `Docs/WIP/Infrastructure_and_Config_fwd.md` §2 |
| **Rec-B: TIGERScore to Haiku**: Switch TIGERScore from Sonnet to Haiku. Needs quality comparison (5 paired evaluations). ~$0.01/job saving. | Analyzer / Cost | low | low | `Docs/WIP/LLM_Allocation_and_Cost_fwd.md` §1 |
| **Rec-D: Batch prompts investigation**: Anthropic Batch API for non-latency-sensitive calls (self-consistency, TIGERScore, narrative). 15-25% LLM cost reduction potential. | Analyzer / Cost | low | med | `Docs/WIP/LLM_Allocation_and_Cost_fwd.md` §1 |
| **Fact Check API pipeline integration**: Wire Google Fact Check provider into claimboundary research loop (Phases 3.2-3.6 of Multi-Source Retrieval). | Search / Quality | low | med | `Docs/WIP/LLM_Allocation_and_Cost_fwd.md` §2 |
| **Inverse Claim Asymmetry Phase 3**: Calibration hardening CI gate. Blocks merges when framing-symmetry regression exceeds threshold. Captain decision needed on threshold. | Calibration / Quality | low | med | `Docs/WIP/Quality_Improvement_Pending_fwd.md` §1 |
| **D2: Input classification instability**: `inputClassification` varies between `question` and `ambiguous_single_claim` across runs for same input. Investigate and stabilize. | Analyzer / Quality | low | low | Extracted from `Phase2_Validation_Status.md` |
| **D4: Gate 1 `passedSpecificity` cleanup**: Gate 1 never independently removes claims based on `passedSpecificity` alone. Review whether specificity should be a standalone filter. | Analyzer / Quality | low | low | Extracted from `Phase2_Validation_Status.md` |
| **Verdict `maxTokens` to UCM**: Move hardcoded `maxTokens: 16384` in verdict stage into UCM pipeline config. | Config / Analyzer | low | med | Extracted from `Phase2_Validation_Status.md` |
| **SC temperature experiment (0.4→0.3)**: Test reducing `selfConsistencyTemperature` from 0.4 to 0.3 to tighten verdict spread. UCM config change only. | Analyzer / Quality | low | low | Extracted from `Search_Accumulation_Restoration_Plan` |
| **SerpAPI circuit breaker reset + health verification**: Circuit breaker permanently OPEN from prior failures. Must reset and verify health before re-enabling. | Search / Provider | low | med | Extracted from `Search_Accumulation_Restoration_Plan` |
| **`harmPotential` anchoring review**: LLM may anchor harm assessment on topic area rather than exact claim predicate. Proxy/discourse claims get inflated harm ratings. | Analyzer / Quality | low | low | Extracted from `Proxy_Claim_Decomposition_Investigation` §11 |
| **Multi-challenger cross-provider debate (Phase 2)**: Replace Steps 2+3 with cross-provider debate round (Claude, GPT, Gemini). Deferred pending 4 prerequisite corrections: reconciliation contract update, confidence tier semantics, label alignment, UCM-managed reasoning instructions. | Analyzer / Quality | low | high | [Multi_Agent_Cross_Provider_Debate](../WIP/Multi_Agent_Cross_Provider_Debate_2026-02-27.md) |
| **Conditional re-reconciliation (B-3 add-on)**: After reconciliation, if self-consistency spread >20pp AND contrarian evidence present, re-run reconciliation once with prompt addendum. UCM-flagged (`reDeliberationEnabled`, default off). Max 1 extra Sonnet call per triggered claim (~10-20% trigger rate). Not Debate V2 — scoped addition to existing topology. | Analyzer / Quality | med | med | [Debate_Iteration_Analysis](../ARCHIVE/Debate_Iteration_Analysis_2026-02-21.md) §5 |
| **Production-profile calibration baseline v2 run**: Execute full gate with current production challenger provider (`debateModelProviders.challenger=openai`) on framing-symmetry v3.x fixture and publish canonical v2 baseline artifacts/deltas vs v1. | Calibration / Experiment | med | high | [Stammbach §5.3 item 4](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md), [Calibration_Run_Policy.md](Calibration_Run_Policy.md) |
| **C17 adversarial benchmark + fail policy**: Build dedicated prompt-injection benchmark (≥10 scenarios, ≥2 languages) with ≥90% pass target and explicit fail-open/fail-closed policy. | Security / Quality | med | high | [Stammbach §5.3 item 5](../Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md), [Calibration_Baseline_v1.md §6](Calibration_Baseline_v1.md) |
| **Claim Fidelity Phase 4 — Validation**: Run baseline validation scenarios with real LLM calls to confirm Phases 1-3 fix eliminates claim drift. | Analyzer / Quality | med | high | [Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](../ARCHIVE/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md) Phase 4 |
| **Schema Validation — Gate 1 rebuild + telemetry + Pass 2 split**: Items #4-6. | Analyzer / Quality | med | high | [WIP/Schema_Validation_Implementation_Status_2026-02-18.md](../ARCHIVE/Schema_Validation_Implementation_Status_2026-02-18.md) |
| **xWiki Architecture Data Model rewrite**: Last Orchestrated holdout. Needs full rewrite to CB entities. | Docs | med | high | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Phase 3E entry) |
| ~~**Code review test fixes**~~: ✅ **RESOLVED** — previously failing search tests are passing in current safe suite (1047/1047). | Testing | ~~med~~ done | med | `npm test` (2026-02-24) |
| **Dead Code Removal**: 879 lines across 7 files (~2-4h). | Cleanup | med | med | [QA Review](../ARCHIVE/QA_Review_Findings_2026-02-12.md) Priority 1 |
| **UCM AutoForm code review**: On `feature/ucm-autoform`, awaiting review before merge. | Web UI | low | med | [WIP/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md](../ARCHIVE/UCM_AutoForm_Schema_Driven_Config_UI_2026-02-14.md) |
| **AtomicClaim extraction validation**: Validate with real LLM calls (target ~40% cost reduction). | Analyzer / Quality | low | high | [WIP/AtomicClaim_Extraction_Improvements_2026-02-17.md](../ARCHIVE/AtomicClaim_Extraction_Improvements_2026-02-17.md) |
| **LLM Text Analysis A/B Testing**: Run promptfoo tests (26 cases ready). | Analyzer / Testing | low | med | [Promptfoo Testing](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki) |
| **Quality Gate UI display**: Show Gate 1/4 stats and failure reasons in results UI. | Web UI | low | high | Improvements #6 |
| **Claim-level caching**: Cache verdicts for reuse. Requires normalized DB schema. | Analyzer / Cost | low | med | Improvements #4 |
| **Doc Audit Phase 2: `opposingEvidenceIds` + `biasIndicator`**: Split from `supportingEvidenceIds`, surface `biasIndicator` in report. | Analyzer / Types | low | med | Prior doc audit initiative |
| **Classification confidence scoring**: Add confidence fields to types. | Analyzer / Quality | low | low | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #4 |
| **Edge case test coverage**: 15+ tests for ambiguous scenarios (~4-6h). | Analyzer / Testing | low | med | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #2 |
| **Baseline comparison dashboard row**: Show latest-vs-canonical deltas per calibration metric in Admin UI or report. | Observability / Calibration | low | med | [Calibration_Baseline_v1.md §9](Calibration_Baseline_v1.md) |
| **Provider/API incident flags per run**: Tag calibration runs with infra outage context so interpretation accounts for transient failures. | Observability / Calibration | low | med | Architect recommendation |
| **Calibration repeatability cadence**: Periodic re-run of full baseline to detect drift and infra regressions early. | Calibration / Operations | low | med | [Calibration_Baseline_v1.md §9](Calibration_Baseline_v1.md) |

---

## Security & Cost Control
*(All items LOW urgency during POC/Alpha phase; HIGH urgency before production)*

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Batch API integration**: Switch LLM calls to Anthropic Batch API for potential discount. Acknowledge that sequential debate calls limit savings to ~20-30%. | Cost / Analyzer | high | high | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) §4.A1 |
| ~~**Prompt caching**~~: ✅ **ACTIVE** — Anthropic ephemeral prompt caching already wired on all `generateText()` system messages via `getPromptCachingOptions()` in `llm.ts:375`. Cache metrics (`cacheReadInputTokens`, `cacheCreationInputTokens`) tracked in `LLMCallMetric`. | Cost / Analyzer | ~~high~~ done | high | `llm.ts:375-398` |
| **NPO/OSS credit applications**: Apply for Claude for Nonprofits (75% off), AWS TechSoup ($1K/year), Google for Nonprofits ($10K/year), Anthropic AI for Science ($20K). | Cost / Admin | high | high | [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md) §5 |
| ~~**SSRF protections for URL fetching**~~: ✅ **DONE** — `resolveAndValidateHost()` with `dns/promises.lookup`, private IP block, `.localhost` suffix check, redirect cap, response size cap, timeouts. Residual: DNS TOCTOU gap (resolve-then-fetch; requires custom `undici.Agent` connect callback for production hardening). | Security | ~~low~~ done | high | Commit `9ea5eb5`, Code Review Stream 3 M2 |
| **SSRF DNS TOCTOU hardening**: Replace pre-fetch DNS validation with custom `undici.Agent` connect callback that validates resolved IP at connection time. Eliminates DNS rebinding window between `resolveAndValidateHost()` and `fetch()`. | Security | low | med | Code Review Stream 3 M2, `retrieval.ts:88-103` |
| ~~**Secure admin endpoints**~~: ✅ **DONE** — All admin routes protected with `checkAdminKey`/`IsAdminKeyValid`. Test-config page sends admin key header. Timing-safe comparison with length-normalized padding. | Security / Cost-Control | ~~low~~ done | high | Commits `d227f51`, `fe603c7` |
| ~~**Rate limiting / quotas**~~: ✅ **DONE** — `AnalyzePerIp` fixed-window limiter (5/min/IP) on analyze + status endpoints. Admins bypass via `IsAdminKeyValid` check in policy. Invite code daily+lifetime quotas enforced. | Security / Cost-Control | ~~low~~ done | high | `Program.cs`, `AnalyzeController.cs` |
| **Cost quotas and estimates**: Track per-job and per-day LLM/search quotas. Reject jobs exceeding limits. Show cost estimates before running. *(POC: low urgency)* | Cost-Control | low | high | Improvements #2 |

---

## User Experience Enhancements

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config admin: auto-save drafts to localStorage**: Protect against accidental page refresh. Recover unsaved drafts on reload. *(Skipped: medium risk of stale draft confusion)* | Web UI / UX | low | low | UCM UX Review |
| **Analysis templates/presets**: Domain-specific templates (health, legal, political) with curated search whitelists and KeyFactor hints. | Web UI / UX | low | med | Improvements #8 |
| **Interactive analysis refinement**: Allow users to add sources, challenge claims, refine searches, or add contexts as child jobs extending existing analysis. | Web UI / UX | low | med | Improvements #7 |
| **Comparative analysis mode**: Side-by-side comparison of two articles/claims. Show shared claims, unique claims, contradictions, consensus areas. | Analyzer / UX | low | med | Improvements #9 |
| **Real-time source quality feedback**: Extend current LLM+Cache source reliability with additional signals (MBFC, NewsGuard, Wikipedia citations, HTTPS, domain age). | Analyzer / Quality | low | med | Improvements #10 |
| **Verdict narrative key-sentence surfacing**: Significant findings present in evidence items (e.g. specific sentences, key rulings) are not currently promoted into `verdictNarrative.keyFinding` or `reportMarkdown`. The reportMarkdown stub means these details never reach the user-facing report. Improve verdict stage to surface the most impactful evidence-item statements into the narrative. | Reporting / Analyzer | low | med | V1a MT-5 validation 2026-03-10 |
| **PDF report export**: Generate professional PDF reports with charts, graphs, confidence bars, optional branding. | Reporting | low | low | Improvements #12 |
| **Browser extension**: Right-click extension for "Analyze with FactHarbor", floating button on news sites. | Web UI / UX | low | low | Improvements #13 |
| **Multi-language support**: Support ES, DE, FR, PT with language-specific search and extraction. | Analyzer / i18n | low | med | Improvements #11 |

---

## Monitoring & Operations

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Classification monitoring**: Track fallback rates/distributions per field (harmPotential, factualBasis, etc.). Admin endpoint `GET /api/admin/classification-metrics`. Alert on fallback rate >5%. ~3-4h. | Observability / Analyzer | med | med | [Classification Monitoring Spec](../ARCHIVE/P2_Classification_Monitoring_Backlog.md) |
| **Observability dashboard**: Real-time metrics dashboard showing performance (p50/p95/p99), costs (LLM/search), quality (gate pass rates), usage (success rate), and errors. | Observability | low | high | Improvements #17 |
| **Error pattern detection & auto-recovery**: Automatically categorize errors, suggest fixes, apply recovery actions (retry with shorter prompt, skip source, fallback model). | Observability / Reliability | low | med | Improvements #18 |
| **Calibration report “run health” block**: Add infra health KPIs to calibration output (`infraFailureRate`, `fetchFailureRate`, `srEvalFailureRate`) and surface in JSON + HTML report header panel. | Observability / Calibration | low | med | Post-baseline telemetry hardening follow-up |
| **Calibration replay diagnostics**: Persist/report top failed URLs (top 20) with reason histogram in calibration JSON/HTML to speed incident triage. | Observability / Calibration | low | med | Post-baseline telemetry hardening follow-up |
| **Synthetic failure-injection calibration fixture**: Add a small intentionally broken URL/doc fixture set to continuously verify error bubbling + warning structure regressions. | Testing / Reliability | low | med | Post-baseline telemetry hardening follow-up |
| Persist metrics and cost estimates: tokens/search calls/cost estimation stored per job; basic admin view. | Observability | low | med | Existing |
| Error pattern tracking: persist structured error categories and frequency to inform prompt/code fixes. | Observability | low | med | Existing |

---

## Community & Communication

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Community platform selection & setup**: Choose and deploy a community platform for pre-release user feedback, bug discussion with contributors, and sponsor community access. **Recommendation (pending approval):** Strategy B — GitHub Discussions (structured async) + Zulip (real-time async chat, free for OSS). Discord rejected due to 2025-2026 privacy crisis (data breach, mandatory age verification), zero data portability, and sovereignty mismatch with Swiss-hosted project. **Open decisions:** (1) Zulip Cloud acceptable short-term or Swiss self-hosting required from day one? (2) Sponsor tier wording — "Discord/community access" → platform-agnostic "Private community access"? (3) Moderation ownership before Relations Lead hired. **Triggers for Discourse migration:** ≥150 MAU for 2 months, ≥25 weekly posts for 4 weeks, moderation >4 hrs/week for 3 weeks, Relations Lead onboarded (2 of 4 required). | Partner & User Relations / Ops | low | med | Research conducted 2026-03-03 (Claude Code session). Placeholder links exist in `Docs/xwiki-pages/.../Contributor Processes/WebHome.xwiki` and sponsorship tiers in `Docs/ARCHIVE/WORKSHOP_REPORT_2026-01-21.md`. |

---

## Technical Debt & Architecture

| Description | Domain | Urgency | Importance | Reference |
|---|---|---|---|---|
| **Config storage seeding race condition**: `saveConfigBlob()` uses check-then-insert without transaction. Use `INSERT OR IGNORE` for multi-instance safety. *(POC: low urgency; HIGH before multi-worker deployment)* | Architecture / Reliability | low | high | UCM Review |
| **Debate role config unification (post-baseline)**: ~~Add a unified role-set config where each debate role is configured as a single `{ provider, model }` entry (instead of split provider/tier fields).~~ **Partially done (2026-02-23):** `debateProfile` presets removed; roles now configured directly via `debateModelTiers` + `debateModelProviders`. Remaining: consider a single `{ tier, provider }` per-role object instead of two parallel objects, plus Admin UI form fields. | Architecture / Config | low | low | Stammbach/Ash follow-up (post-baseline ergonomics) |
| **Cross-profile content hash policy**: Document or change behavior where identical content cannot exist across different profiles (may block copy/paste workflows). | Architecture / UX | low | med | UCM Review |
| **Remove dead API prompt tracking columns**: `PromptContentHash` and `PromptLoadedUtc` in `Jobs` table are never populated (web uses `config_usage` instead). Remove columns and migration 002, or decide to populate them. | Architecture / Cleanup | low | low | UCM Review |
| **Remove dead Gate 4 SR weighting code**: `applyGate4ToVerdicts()` and `validateVerdictGate4()` in `quality-gates.ts` use `defaultTrackRecordScore ?? 0.4` (Orchestrated pipeline remnant) but are never called in the live CB pipeline. The Calculation UCM field `sourceReliability.defaultScore` (currently 0.45) is also unused. Remove the dead functions, the UCM field, and the Admin UI form field that configures it. Verified 2026-03-10: neither function is imported or called outside `index.ts` re-export and `quality-gates.ts` itself. | Architecture / Cleanup | low | med | Captain Deputy analysis 2026-03-10 |
| **Normalized database schema**: Create proper tables for Claims, Verdicts, Sources, Facts, ClaimFactSupport. Enables cross-analysis queries, trend analysis, citation networks. | Architecture / Data | low | med | Improvements #15 |
| **Comprehensive testing**: Unit tests (80% coverage), integration tests, E2E tests (Playwright), API tests (xUnit). | Testing / Quality | low | high | Improvements #16 |
| ~~Analyzer modularization plan~~: COMPLETE — CB pipeline built as separate modules (`claimboundary-pipeline.ts`, `verdict-stage.ts`). | Architecture | ~~low~~ done | low | Implemented in CB |
| **Auth migration sweep**: 14 admin config routes + 4 others use inline `===` for admin key comparison instead of shared `checkAdminKey` from `auth.ts`. Functionally equivalent for now; timing-unsafe. LOW urgency for POC; HIGH before production exposure. | Security / Architecture | low | high | [Agent_Outputs.md](../AGENTS/Agent_Outputs.md) (Code Review entry) |
| **Diagram page deduplication + include hygiene**: Remove cloned inline diagrams from `Docs/xwiki-pages/FactHarbor/Product Development/Presentations/Meeting UZH/WebHome.xwiki` where they duplicate canonical diagram pages, and migrate reused diagram pages from `.../WebHome.xwiki` includes to canonical single-file `.xwiki` pages where this improves include labels without creating parallel long-lived copies. | Docs / Cleanup | low | med | Captured 2026-03-17 during UZH presentation cleanup |
| **LLM classification system docs**: Update Analyzer_Pipeline.md (remove pattern-based refs), create LLM_Classification_System.md, update Testing_Guide.md with edge case test examples. ~2-3h. | Docs / Architecture | low | low | [Robustness Proposals](../ARCHIVE/Post-Migration_Robustness_Proposals.md) #5 |

---

## Future Research

| Description | Domain | Status | Reference |
|---|---|---|---|
| **Shadow Mode: Self-learning prompt optimization**: Observe LLM behavior across thousands of cases, detect inconsistencies, propose prompt improvements, A/B test variations. Requires 3+ months production data. | Analyzer / LLM | Design complete | [Shadow Mode Architecture](../ARCHIVE/Shadow_Mode_Architecture.md) |
| **Vector database integration**: Optional embeddings store for similarity detection and clustering beyond text-hash matches. Deferred pending evidence of need. | Architecture / Data | Assessment complete | [Vector DB Assessment](../ARCHIVE/Vector_DB_Assessment.md) |
| **SR standalone extraction + shared evidence-core feasibility**: Evaluate extracting Source Reliability into a standalone service and assess whether a shared `evidence-core` library is beneficial without reintroducing runtime coupling to the main pipeline. | Architecture / SR | Deferred | `Docs/ARCHIVE/SR_Evidence_Quality_Assessment_Plan_2026-03-11.md` |

---

## Notes

- **Quick wins** (combined):
  1. Parallel verdict generation → 50-80% faster
  2. Quality Gate UI display → transparency
  3. Cost quotas → financial safety *(low urgency for POC)*
  4. Admin authentication → security *(low urgency for POC)*

- **Cost optimization** (combined ~20-30% reduction):
  - ✅ Budget defaults reduced: 25-40% savings (implemented 2026-02-13)
  - ✅ Prompt caching: active on all system messages (implemented, `llm.ts:375`)
  - ✅ Evidence field trimming: ~20-25% verdict stage input reduction (implemented 2026-02-27)
  - Batch API: ~20% discount (limited by sequential debate calls)
  - Self-consistency on Haiku: potential ~50-70% cost reduction for Step 2 (pending experiment)
  - NPO/OSS credits: $11K+/year potential
  - Claim caching: 30-50% savings on repeat claims
  - See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

- **Security items**: All marked LOW urgency while local POC, but HIGH importance. Must be HIGH urgency before any public deployment.

---

## References

- **Detailed Analysis**: `Docs/STATUS/Improvement_Recommendations.md`
- **Current Status**: `Docs/STATUS/Current_Status.md`
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System%20Design/WebHome.xwiki`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`
