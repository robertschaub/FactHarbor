# FactHarbor Current Status

**Version**: v2.11.0
**Last Updated**: 2026-04-07
**Phase**: **Alpha**
**Status**: ClaimAssessmentBoundary pipeline is operational. The major refactor wave (WS-1 through WS-4) is complete. The Stage-1 quality stabilization track is **materially complete**: **QLT-1** stabilized predicate strength (Plastik DE 47pp→22pp), **QLT-2** characterized the split root cause, and **QLT-3** fixed Muslims-family structural instability (claim count/direction/facet now stable, spread 27pp→21pp). Remaining variance for both Plastik EN and Muslims-family now appears primarily evidence/verdict-driven, not Stage-1-driven. **VAL-2** (jobs-list sync race) and **OBS-1** (per-job metrics isolation via AsyncLocalStorage) are both complete. **QLT-4** (per-claim contrarian retrieval experiment) is **CLOSED** and the experimental code has been removed from the codebase — feature never triggered on real data; Plastik EN per-claim evidence is already directionally balanced; remaining variance is content/quality-driven, not direction-scarcity-driven. Residual run-to-run variance (Plastik EN ~30pp, Muslims ~21pp) is evidence/verdict-driven and governed by the approved **EVD-1 acceptable-variance policy**. **FLOOD-1** (single-source flooding mitigation) is implemented: SR-aware verdict reasoning via claim-local source portfolios + per-source evidence cap (`maxEvidenceItemsPerSource: 5`). Stage 4.5 SR calibration remains feature-flagged/off. Since 2026-04-01, **Proposal 2 multilingual output/search work is shipped in experimental form**: `LanguageIntent` and `reportLanguage` are explicit cross-stage state, Stage 4/5 report-language threading is implemented, and an **experimental default-off English supplementary retrieval lane** exists behind UCM. As of 2026-04-05, the `verdict_grounding_issue` false-positive track has a committed root-cause fix in code: claim-local grounding scope, source-ID backfill for late-added evidence, richer challenge/boundary validator context, and a single-citation-channel Stage-4 contract that removes raw machine IDs from verdict prose. Local canaries on the new prompt hash no longer reproduce the prior grounding warnings; early-run monitoring and deployed validation remain open. Cross-linguistic neutrality remains the main open comparative quality gap.

---

## Current Focus (2026-04-07)

- **Structural integrity work is complete.** All planned fixes shipped: citation carriage, claim decomposition, all-insufficient path, verdict uniqueness, matrix alignment, LLM article adjudication.
- **Proposal 2 multilingual output/report-language coherency is shipped.** `LanguageIntent` and `reportLanguage` are now explicit pipeline state, and Stage 4/5 prompt paths are threaded. Source-authored evidence remains original-language.
- **Experimental EN supplementary retrieval lane is shipped default-off.** The lane is UCM-controlled and intended only for coverage expansion on non-English inputs under native-language scarcity. It is not yet promoted and requires live A/B validation before any broader use.
- **Wikipedia supplementary completion is shipped and validated.** Supplementary-provider orchestration now supports bounded `always_if_enabled` mode, Wikipedia is enabled by default, and detected claim/input language is threaded into Wikipedia subdomain selection. This is a retrieval-diversity improvement, not a claimed full neutrality fix by itself.
- **Grounding false-positive root fix is committed in code.** Source-ID backfill, structured validator context, and the single-citation-channel prompt contract are all implemented. Local canaries on the new prompt hash are clean; the next gate is first-run monitoring plus deployed validation, not new grounding architecture work.
- **Stage-5 Cross-Boundary Tension cleanup first pass is shipped and good enough for monitor mode.** `VERDICT_NARRATIVE` now receives the previously stale `${aggregation}` / `${evidenceSummary}` variables, tension emission is narrowed to material directional divergence, `sourceCount` is based on unique source URLs rather than hostnames, and a dedicated Stage-5 prompt-contract test now guards against unresolved placeholders. Post-fix canaries show Swiss and misinformation-tools at `0` tensions, with the remaining Bolsonaro / Plastik tensions looking substantive rather than misclassified. Fix 2 is therefore deferred, not active.
- **The next engineering workstream is upstream report quality, not more narrative repair.** The remaining hard-family instability now points back to Stage 2/3: claim-level evidence-pool quality, query/event anchoring, boundary concentration, and cross-linguistic evidence divergence.
- **UPQ-1 Phase A telemetry is now complete.** `claimAcquisitionLedger` is implemented and the first 4-canary batch shows A-1 (`existingEvidenceSummary`) is still inconclusive: no proven benefit, no proven harm, and no evidence of cross-claim reallocation. The strongest new finding is **seeded-evidence dominance** on some claims, especially claim-1 positions that become "sufficient" before Stage 2 meaningfully researches them.
- **Next bounded upstream target is seeded-evidence sufficiency interaction.** The most credible Phase B slice is to require at least one researched iteration per claim before seeded evidence can fully satisfy Stage 2 sufficiency, rather than excluding seeded evidence globally.
- **Current local `b130d00c` is not yet a clean quality-based deploy candidate.** Against current deployed `f1a372bf`, Swiss is better locally, Plastik is not clearly better, and Bolsonaro / misinformation still lack a clean same-runtime same-input local win. The A-2 telemetry build is successful as observability, but not yet a clear promotion on report quality.
- **Cross-linguistic neutrality remains the next quality gap.** Plastik recycling 58pp cross-language spread (DE/EN/FR) is still the largest visible gap. The new EN supplementary lane is an experiment toward mitigation, not a validated fix.
- **Multilingual follow-up work is now validation + promotion gating, not policy-only design.** The earlier Stage-2 review findings are fixed; the remaining gate is live multilingual A/B validation with the EN lane `OFF` vs `ON`.
- **Flat-Earth false-ambiguity fix is review-approved.** Prompt-only narrowing for direct factual-property questions. Not yet implemented.
- **Stage-1 quality stabilization is materially complete**: QLT-1/2/3 all done. Remaining variance is evidence/verdict-driven.
- **Gate 1 thesis-direct rescue refinement: DECLINED** (2026-03-26). A two-agent debate investigated whether narrowing the rescue for evaluative claims would reduce Bolsonaro UNVERIFIED incidence. The debate found: (1) the UNVERIFIED was driven by evidence balance variation (0.38 vs 0.76), not by Gate 1 behavior; (2) the fairness claim (AC_03) was the most stable claim in the UNVERIFIED run; (3) a subsequent 3-claim run produced LEANING-TRUE, proving the rescue is not the cause. Over-filtering risk for legitimate evaluative questions was judged too high. See `Docs/WIP/2026-03-26_Gate1_Rescue_Refinement_Debate.md`.
- **EVD-1 measurement (2026-03-26):** Bolsonaro 5-run result: **amber** (25pp spread, UNVERIFIED did not recur — 1/5 single-tail outlier). Plastik DE 3-run result: **green** (14pp spread, zero UNVERIFIED, confidence 72-77). No analyzer behavior change approved. See `Docs/WIP/2026-03-26_EVD1_Bolsonaro_Plastik_Measurement.md`.
- **Diversity-aware Stage-2 sufficiency promoted to default-on** (`23d8576c`). Validated on 8 runs (4 Bolsonaro, 2 Plastik DE, 2 Flat Earth): 0/8 UNVERIFIED, Bolsonaro confidence spread improved from 23pp (amber) to 5pp (green), no control regressions. Stage 2 now aligns sufficiency with D5 item-count + diversity thresholds, preventing claims from appearing "researched enough" by raw count and then being zeroed out by D5. Flag `diversityAwareSufficiency` remains available for rollback.
- **UCM Configuration Completeness (UCM-1 to UCM-5) complete** (`fb5395b0`). All 5 backlog items implemented: research depth params, source extraction limit, 10 per-task LLM temperatures, recency penalty internals, and temporal guard ceiling are now admin-tunable via UCM.
- **OBS-2 complete** (`d6090f76`). `inputClassification` and `contractValidationSummary` now persisted in result JSON for future forensics.
- **Seeded preliminary-evidence LLM remap promoted to default-on** (`b5fad127`). `preliminaryEvidenceLlmRemapEnabled` adds one batched Haiku remap before Stage 2 seeding to recover claim-local attribution for seeded items that still carry semantic slug IDs. Validated on current stack (post-FLOOD-1) via controlled A/B: Bolsonaro seeded mapping 0%→88% with same verdict direction, Plastik DE and Hydrogen stable. Captain approved promotion. Flag remains available for rollback. The one-off Homeopathy confidence collapse was rechecked post-promotion and did not reproduce, so this is now routine watchlist context rather than an active promotion blocker. See `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md`.
- **Source-fetch failure reduction shipped**. Stage 2 acquisition now keeps a per-domain 401/403 blocking streak within each `fetchSources()` call and best-effort skips later same-domain URLs once the streak hits `fetchDomainSkipThreshold` (default `2`). `source_fetch_failure` warnings now append human-readable error summaries for operator diagnostics, and skipped URLs are excluded from `attempted` metrics. This is runtime/reliability hardening only — no warning-policy or analytical-behavior change.
- **Direction-validator false-positive fix shipped** (`db7cdcf8`). Stable self-consistency can now rescue legitimate quality-over-quantity verdicts after validator disagreement, `direction_rescue_plausible` warnings preserve observability on both initial and repaired rescue paths, and Rule 2's mixed-evidence floor is now UCM-backed via `directionMixedEvidenceFloor`.
- **Outage-resilience A-track shipped** (`ba80a919`, `83a50d8c`, `4ac43609`, `bb40e441`). Clear network outages now count toward the LLM provider breaker, Stage 4 performs a preflight connectivity probe, damaged fallback verdicts are avoided once the system is paused, and watchdog auto-resume is restricted to network-caused pauses. Hold/resume and checkpointing remain deferred future work.
- **Post-spread verdict-label staleness fixed** (`289afa1c`). Claims whose confidence drops below the UNVERIFIED threshold after spread adjustment now get correctly relabeled.
- **B1 claim-contract validation implemented and validated**. Predicate preservation + no-proxy-rephrasing rules enforced via LLM-backed contract validator with single retry. Plastik DE/EN/FR all produce correct predicate-preserving claims.
- **FLOOD-1 single-source flooding mitigation shipped** (Fix 1 + Fix 2). Fix 1 adds claim-local, partition-scoped source portfolios to all verdict debate prompts. Fix 2 adds `maxEvidenceItemsPerSource: 5` UCM cap. Live-validated and operational. See `Docs/WIP/2026-03-27_Bolsonaro_efc5e66f_Single_Source_Flooding_Investigation.md`.
- **Stage-1 claim decomposition fix REVERTED** (`fff7a508` reverted by `a1c5caf5`; `d04fc750` reverted by `ad62334f`; `09ce7018` reverted by `11019788`). The 3-step evidence-separability package caused live regressions: (1) SRG compound — contract validation intermittent fail-open led to UNVERIFIED 50/0; (2) Plastik EN — candidate selection preferred bad merges, led to UNVERIFIED 43/40. The `distinctEvents` granularity prompt change was also reverted — it stabilized claim count but did not achieve the primary TSE peer-extraction target. Post-rollback validation (17 runs, Apr 1) confirmed all families restored to baseline ranges. The SRG over-fragmentation (effizient/wirksam split) remains a pre-existing open issue. See `Docs/WIP/2026-04-01_Post_Rollback_Validation_Report.md`.
- **Direction-integrity / citation-carriage fix shipped** (`e1f2c551`). `VERDICT_RECONCILIATION` now carries citation arrays and the safe-downgrade warning state bug is fixed. Code review is clean; the remaining gate is targeted live remeasurement before the direction-validator thread is reopened.
- **`2705/e407` root fix IMPLEMENTED** (`03387283` + follow-up policy update). Assessable-claims path replaces the all-insufficient fallback. Verdict-uniqueness invariant enforced. Coverage Matrix built from ALL final claim verdicts. LLM article adjudication via extended `VERDICT_NARRATIVE` now uses pure LLM-led article truth adjustment, with only a structural confidence ceiling and deterministic fallback remaining. Validated: partial-insufficient run shows confidence 65→40, matrix 3 claims. Controls near-identical to deterministic baseline.
- **CRITICAL: Cross-linguistic neutrality gap identified.** 100-job quality evolution analysis (Mar 30) found Plastik recycling produces 58pp max spread across languages: DE 33% / EN 72% / FR 13%. Same semantic claim, directionally opposite verdicts. Driven by Stage 2 evidence language bias. Not covered by current EVD-1 thresholds. See `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`.
- **Current posture: structural integrity fixes complete, cross-linguistic neutrality is the next quality gap.** All planned integrity work (citation carriage, claim decomposition, all-insufficient path, matrix alignment, article adjudication) is shipped. Optimization/runtime hardening (`W15`, fetch short-circuit, `P1-B`) is shipped. The cross-linguistic neutrality finding now has an experimental implementation path; the remaining gate is live validation and a promotion decision, not architecture approval or Stage-2 cleanup.
- **QLT-4 (per-claim contrarian retrieval) is CLOSED and removed.** Experimental code, UCM config fields, and tests reverted. See `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Preflight_Verification.md`.
- **Remaining optimization work** (`P1-A`, `P2-*`, `P3-*`) remains separate and Captain-gated — not automatically triggered by EVD-1 monitor mode.

## Recent Changes (2026-04-04)

**Wikipedia supplementary completion shipped and validated:**
- ✅ **Bounded supplementary-provider orchestration**: generic `supplementaryProviders` UCM block now controls when supplementary providers run and how many results each may contribute.
- ✅ **Wikipedia is default-on supplementary**: current default posture is `always_if_enabled` with a per-provider cap of 3 results.
- ✅ **Detected-language routing shipped**: Wikipedia now prefers detected claim/input language, then configured language, then `en` for subdomain selection.
- ⚠️ **Scope remains intentionally narrow**: Semantic Scholar and Google Fact Check remain optional/off by default, and this completion step is positioned as retrieval-diversity hardening rather than a full multilingual-neutrality fix.

**Direction-validator rescue hardening shipped (`db7cdcf8`):**
- ✅ **Stable self-consistency rescue boost**: verdicts with assessed, stable advocate-side reruns can now survive false-positive direction-validator disagreements.
- ✅ **Rescue observability added**: `direction_rescue_plausible` warnings now record both ratio-based and stable-consistency rescues, including repaired-path rescue (`phase: "post_repair"`).
- ✅ **Rule 2 floor extracted to UCM**: `directionMixedEvidenceFloor` now controls the mixed-evidence plausibility band instead of a hardcoded 0.3.

**Outage-resilience A-track completed (`ba80a919`, `83a50d8c`, `4ac43609`, `bb40e441`):**
- ✅ **Network outages now trip the breaker**: clear connectivity failures classify as provider-counting LLM outages and feed provider health from Stage 4.
- ✅ **Pre-Stage-4 connectivity probe shipped**: clear transport-layer unreachability aborts the current job before debate starts instead of fabricating damaged fallback verdicts.
- ✅ **Network-only watchdog auto-resume**: paused queues resume automatically only for genuine network-caused pauses, not for auth/rate-limit incidents.
- ⚠️ **Future work remains deferred**: pipeline hold/resume and checkpointing were intentionally left as later tracks.

---

## Recent Changes (2026-04-05)

**Grounding false-positive root fix committed (`b7783872`, `ec7a8de8`, `d9194303`):**
- ✅ **Claim-local grounding scope shipped**: grounding validation now operates on claim-local evidence/source context instead of one global flattened pool.
- ✅ **Prompt-level false-positive buckets tightened**: claim-local-but-uncited evidence context, rejected challenge-cited IDs, and source-reliability criticism are no longer treated as grounding failures.
- ✅ **Source-ID backfill shipped**: late-added evidence now re-enters the `sourceId` reconciliation path instead of carrying empty `sourceId` when a matching source already exists.
- ✅ **Single-citation-channel contract shipped**: Stage-4 verdict/challenge prose no longer carries raw machine IDs; `supportingEvidenceIds`, `contradictingEvidenceIds`, `evidenceIds`, and `adjustmentBasedOnChallengeIds` are the authoritative citation channels.
- ✅ **Local canaries clean on the new prompt hash**: fresh Meta and Plastik jobs on prompt hash `79f7e76f...` no longer show `verdict_grounding_issue`.
- ⚠️ **Next gate is monitoring, not redesign**: watch the first 7+ runs for any residual ID-in-prose leakage, grounding-token-cost regressions, and genuine cross-claim contamination cases. If those runs stay clean, remove the temporary defensive legacy rules from grounding validation.

---

## Recent Changes (2026-04-06)

**Stage-5 narrative tension cleanup first pass shipped (`08220154`, `2acc4545`):**
- ✅ **Previously stale narrative variables are now wired**: `VERDICT_NARRATIVE` now receives `${aggregation}` and `${evidenceSummary}` from `generateVerdictNarrative()`.
- ✅ **Tension classification tightened**: `boundaryDisagreements` now requires material directional divergence; methodology asymmetries, thin caveats, coverage gaps, and concentration observations are redirected to `limitations`.
- ✅ **`sourceCount` review follow-up closed**: Stage 5 evidence summary now counts unique `sourceUrl` values rather than collapsing to hostnames.
- ✅ **Stage-5 prompt-contract regression guard added**: dedicated tests now cover `VERDICT_NARRATIVE` section existence, unresolved placeholders, `[object Object]`, and the tightened boundary-disagreement instruction contract.
- ✅ **Post-fix canary gate is satisfied for now**: Swiss and misinformation-tools families now consistently land at `0` tensions, while the remaining Bolsonaro / Plastik tensions appear materially substantive. Fix 2 / path B is therefore deferred and kept only as a fallback.
- ⚠️ **Next quality work is upstream**: Stage 2/3 evidence-pool quality, claim-local query anchoring, boundary concentration, and multilingual hard-family variance are now the active report-quality focus.

---

## Recent Changes (2026-04-01)

**Proposal 2 multilingual output/search work shipped in experimental form (`8641f56c`, `1281f7d4`, `e9002e9c`, `06fab2e5`, `8f9d4fae`, `ac51975c`):**
- ✅ **`LanguageIntent` + `reportLanguage` contract shipped**: explicit cross-stage language state in pipeline types and result JSON.
- ✅ **Stage 4 and Stage 5 report-language threading shipped**: report-authored analytical text is now explicitly instructed to follow `reportLanguage`; source-authored evidence remains original-language.
- ✅ **Experimental EN supplementary lane shipped default-off**: UCM-controlled coverage-expansion lane for non-English inputs under native-language scarcity.
- ✅ **EN-lane hardening follow-ups completed**: scarcity now keys off evidence yield, EN-lane results go through the standard relevance and warning path, positive firing-path coverage exists, dead config was removed, and provider-failure circuit-breaker parity is in place.
- ⚠️ **Not yet promoted**: live A/B validation pending.

---

## Recent Changes (2026-03-30)

**2705/e407 root fix + report matrix + LLM article adjudication (`03387283` + follow-up policy update):**
- ✅ **Assessable-claims path**: Stage 4 receives only D5-sufficient claims. No more all-insufficient fallback sending rejected claims into the debate.
- ✅ **Verdict uniqueness invariant**: duplicate `claimId`s in final verdicts throw a pipeline error instead of corrupting aggregation.
- ✅ **Report matrix over all claims**: UNVERIFIED claims now get visible matrix columns with zero evidence counts.
- ✅ **LLM article adjudication**: `VERDICT_NARRATIVE` extended to return `adjustedTruthPercentage` and `adjustedConfidence`. Confidence ceiling enforced (can only decrease). Article truth is now LLM-led within structural `0..100` validation only; the old deterministic `±10pp` truth clamp has been removed. Falls back to deterministic on parse failure. No new LLM call.

**Quality evolution deep analysis completed:**
- ⚠️ **Cross-linguistic neutrality gap**: Plastik recycling shows 58pp max spread (DE 33% / EN 72% / FR 13%). Same semantic claim, different evidence bases per language. Not covered by EVD-1.
- ⚠️ **SRG SSR family**: 33pp within-input spread from classification instability (`ambiguous_single_claim` vs `single_atomic_claim`).
- ✅ **100 jobs analyzed across 12 input families, 8 change waves**. Full report: `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md`.

---

## Recent Changes (2026-03-29)

**Stage-1 claim decomposition fix shipped (`fff7a508`):**
- ✅ **3-step package implemented**: fallback narrowing, contract evidence-separability, and retry re-validation/hardening.
- ✅ **Materially fixed the `8640/cd4501` family**: evaluative over-fragmentation collapsed to 2 claims; `UNVERIFIED` starvation removed.
- ⚠️ **Residual factual conjunct blind spot remains**: the `Werkzeuge/Methoden` SRG disclosure family is still a separate Stage-1 Step 4 follow-on.

**Direction-integrity citation-carriage fix shipped (`e1f2c551`):**
- ✅ **VERDICT_RECONCILIATION now carries citation arrays**; parser accepts authoritative reconciled arrays and the safe-downgrade warning-state bug is fixed.
- ✅ **Code review is clean**: remaining work is targeted live remeasurement before any direction-validator tuning is reconsidered.

**`2705/e407` root-fix path review-approved:**
- ✅ **Architectural root cause confirmed**: D5 already marked all claims insufficient in `e407`, but the pipeline still sent them into Stage 4 via the all-insufficient fallback, producing duplicate final verdicts and a corrupted article verdict.
- ✅ **Canonical fix sequence now review-backed**: explicit D5 assessable-claims path, verdict-uniqueness invariant before aggregation, and Coverage Matrix label alignment.
- ⚠️ **Implementation still pending**: this is now a concrete open integrity item, not a UI-only concern.

## Recent Changes (2026-03-27)

**Single-source flooding mitigation (FLOOD-1) implemented:**
- ✅ **Fix 1 — SR-aware verdict reasoning**: claim-local source portfolios (`sourcePortfolioByClaim`) built per verdict-debate role and scoped to the role's evidence partition (D5-aware). VERDICT_ADVOCATE, VERDICT_CHALLENGER, and VERDICT_RECONCILIATION prompts updated with mandatory source-concentration and track-record instructions. Prompts reseeded.
- ✅ **Fix 2 — Per-source evidence cap**: `maxEvidenceItemsPerSource: 5` (UCM-configurable). Enforced in Stage 2 after extraction with best-N reselection by `probativeValue` across existing + new items. Higher-quality late items can displace weaker earlier items from the same source.
- ⏳ **Awaiting live validation**: 4 runs per investigation §12 — 2× Bolsonaro, 1× Plastik DE, 1× Hydrogen.

**Seeded preliminary-evidence remap promoted to default-on:**
- ✅ **Option C implemented and promoted** (`b5fad127`): unresolved seeded preliminary evidence is remapped to final `AC_*` claims with one batched Haiku call before Stage 2 seeding. Existing exact/numeric remap behavior preserved.
- ✅ **Validated via current-stack A/B**: Bolsonaro ON vs OFF — same verdict (LEANING-TRUE), same truth% (64.3 vs 64.4), seeded mapping 0%→92%. Spot-check: 14/15 mappings clearly correct. Controls stable.
- ✅ **Captain approved, default flipped to `true`**. Rollback flag `preliminaryEvidenceLlmRemapEnabled` remains available via UCM.
- ✅ **Post-promotion confirmation cleared the initial monitor signal**: the Homeopathy-family confidence collapse did not reproduce on confirmation runs and is no longer a deployment blocker.

---

## Recent Changes (2026-03-25)

**OBS-1 per-job metrics isolation completed:**
- ✅ **Metrics now request-scoped**: replaced module-global `currentMetrics` with `AsyncLocalStorage<MetricsCollector>`. Concurrent overlapping jobs each get their own isolated collector. Zero call-site changes in stage files.
- ✅ **Stabilization wave complete**: all planned items (QLT-1/2/3, VAL-2, OBS-1) are done. No remaining active engineering blocker.

**VAL-2 jobs-list sync race fixed:**
- ✅ **Verdict badge gated on terminal status**: jobs list only shows verdict/truth%/confidence badges for SUCCEEDED/FAILED/CANCELLED/INTERRUPTED jobs. Eliminates the window where a RUNNING job displays a premature verdict.
- ✅ **Monotonic progress guard**: API rejects RUNNING→RUNNING progress decreases from out-of-order async events. Progress no longer appears to go backward.

**QLT-3 facet-consistency fix completed:**
- ✅ **QLT-3 materially successful**: 3 targeted prompt rules (no counter-narrative claims, facet convergence, claim count stability) fixed all 3 QLT-2-identified Stage-1 failure modes for Muslims-family inputs. Claim count stabilized (2-3→3-3), `claimDirection` stabilized (S+C/X→all S), counter-narrative/media claims eliminated (1/5→0/5). Truth spread reduced 27pp→21pp. No regressions on controls.
- ✅ **Stage-1 quality track now complete**: QLT-1 + QLT-3 together addressed all identified Stage-1 decomposition instability. Remaining variance for both Plastik and Muslims families is now evidence/verdict-driven, not claim-extraction-driven.
- ⚠️ **Residual 21pp Muslims spread and 30pp Plastik EN spread**: both now appear driven by Stage 2 evidence variation and Stage 4 verdict stochasticity. No Stage-1 fix can reduce these further. Acceptable-variance policy is a future Captain decision.

**QLT-2 characterization completed and QLT-1 validation confirmed:**
- ✅ **QLT-2 complete (13 jobs, zero exclusions)**: Plastik EN ×5, Muslims ×5, Flat Earth ×3 on commit `49700231`.
- ✅ **Split root cause identified**: Plastik EN Stage 1 is now stable (QLT-1 working); remaining 30pp spread is evidence/verdict-driven. Muslims Stage 1 is still unstable (27pp from claim count/direction/facet variation). Flat Earth clean control (2pp).
- ✅ **QLT-1 confirmed holding for EN**: all 5 Plastik EN runs preserved “pointless” predicate, produced 3 claims with stable environmental/economic/practical facets.
- ⚠️ **Muslims decomposition instability**: claim count varies (2-3), directions include supports/contradicts/contextual, and facet categories differ in every run. A narrow Stage-1 direction/count/facet-consistency fix is justified.
- ⚠️ **Plastik EN environmental claim variance**: 47pp per-claim swing (15-62%) despite stable Stage 1 claims — driven by evidence mix variation. Not addressable at Stage 1.

**QLT-1 validation (earlier):**
- ✅ **QLT-1 validation completed**: predicate-strength preservation in Stage 1 Pass 2 materially reduced Plastik DE instability from 47pp to 22pp, stabilized claim count, and eliminated the previously observed predicate softening outlier.
- ✅ **Anchor regressions not observed**: Round Earth, Hydrogen, Bolsonaro, and Flat Earth remained directionally correct on the post-QLT-1 stack.

## Recent Changes (2026-03-24)

**Control-quality and boundary-coverage follow-up:**
- ✅ **Stage-1 `claimDirection` prompt clarified**: `supports_thesis` / `contradicts_thesis` are now explicitly anchored to the user's thesis, not to scientific consensus or reality.
- ✅ **Flat-earth false positive root-caused cleanly**: the bad `TRUE 100 / 95` result was traced to Stage-1 `claimDirection` mislabeling, not to Stage 4 or Stage 5 logic.
- ✅ **Preliminary-evidence claim mapping leak fixed**: Stage 1 now preserves full `relevantClaimIds[]` into Stage 2 seeding instead of collapsing to a single legacy `claimId`, which previously caused Claim Assessment Boundaries with evidence but zero matrix coverage.
- ✅ **Live validation completed**: the restarted local batch on commit `31aea55d` passed and the gate is closed.
- ⚠️ **Open UI/runtime issue remains**: the jobs list can still display a verdict for a non-terminal job because result persistence and later stale progress events are not yet synchronized monotonically.

---

## Recent Changes (2026-03-23)

**Refactor-wave closure:**
- ✅ **WS-2 fully complete**: the entire Stage 2 research loop is now modularized; `claimboundary-pipeline.ts` is reduced to a slim orchestrator.
- ✅ **WS-3 complete**: the `evaluate-source` route is decomposed into request-scoped modules with mutable request globals removed.
- ✅ **WS-4 complete**: duplicated search-provider plumbing is consolidated into shared utilities.
- ✅ **Post-WS-2 extraction coverage restored**: high-value Stage 2 extraction edge-case tests were restored after the research-loop decomposition.

**Stage 4 reliability hardening + incident visibility:**
- ✅ **Verdict-generation incident surfaced correctly**: Jobs/UI now distinguish `analysis_generation_failed` from ordinary `insufficient_evidence`, so Stage-4 fallback reports no longer masquerade as normal low-evidence outcomes.
- ✅ **Stage-4 provider guard aligned with official retry behavior**: Added lane-aware LLM backpressure control for the verdict path (`anthropic:sonnet` default limit `2`, other lanes `3`) instead of forcing runner-global serialization.
- ✅ **Custom outer retry removed**: FactHarbor now relies on the installed AI SDK retry path for retryable API-call failures, which already honors `retry-after` / `retry-after-ms` headers.
- ✅ **Provider diagnostics enriched**: Final `llm_provider_error` warnings now capture request IDs, retry-after hints, and remaining-limit headers when available for faster tuning of real overload incidents.
- ✅ **Live concurrent validation passed for the reliability fix**: three overlapping jobs completed without `Stage4LLMCallError`, `analysis_generation_failed`, or `llm_provider_error`.
- ⚠️ **Important scope note**: the reliability pass did **not** reopen optimization; it only cleared the Stage-4 overload incident. The same validation round also exposed the separate Stage-1 `claimDirection` quality bug that was fixed on 2026-03-24.

---

## Recent Changes (2026-03-20/21)

**Plastik quality stabilization + auditability improvements:**
- ✅ **Stage 1 claim-contract validator**: New `CLAIM_CONTRACT_VALIDATION` step runs after Pass 2 and before Gate 1, with one retry and fail-open behavior. This materially fixed broad evaluative predicate drift for the targeted failure mode.
- ✅ **Predicate preservation materially improved**: the claim-contract validator improved broad evaluative predicate handling, and the later QLT-1 prompt fix removed the previously observed predicate-softening outlier. Residual spread still remains, but the original dominant predicate bug is no longer the main issue.
- ✅ **Legacy SR weighting disabled by default**: `evidenceWeightingEnabled` remains off by default; Stage 4.5 SR calibration stays feature-flagged.
- ✅ **Direction repair re-enabled**: `verdictDirectionPolicy` now defaults to `retry_once_then_safe_downgrade`. Controlled A1 validation showed no overcorrection and reduced Plastik-family spread materially.
- ✅ **Stage 2 prompt refinements prepared**: `EXTRACT_EVIDENCE` and `GENERATE_QUERIES` now carry generic broad-evaluative claim guidance to reduce evidence-direction ambiguity and strengthen contradiction iterations.
- ✅ **Job git-hash traceability**: Jobs now record the deployed git commit hash, and admin tooling can trace all jobs that ran on a given commit.
- ⚠️ **Historical note corrected**: the earlier assumption that remaining Plastik instability was downstream of Stage 1 was overturned by the 2026-03-24 decomposition comparison. QLT-1 then reduced the dominant Stage-1 predicate issue, leaving a smaller residual instability problem to characterize.

---

**SR UCM separation and cache isolation:**
- ✅ **SR UCM Separation**: Source Reliability now owns its search configuration. Removed dependency on shared `search` profile.
- ✅ **Decision A1/A2 (AutoMode)**: SR route passes `autoMode: "accumulate"` to restore multi-provider evidence gathering (fixes 48% score inflation).
- ✅ **Decision A4 (Cache Isolation)**: `callerContext` (sr/analysis) added to search cache keys. SR results no longer bleed into Analysis (and vice-versa).
- ✅ **Decision D3 (Cache Flush)**: Manually invalidated all SR cached scores after 2026-03-05 to clear "broken" single-provider evidence packs.
- ✅ **Admin UI Update**: New "Evaluation Search" section in SR config form for independent tuning of SR-specific search behavior.
- ✅ **Schema 3.0.0 (SR)**: Nested `evaluationSearch` block added to `SourceReliabilityConfigSchema`. Legacy `evalUseSearch` removed.

---

## Recent Changes (2026-03-15/16)

**Phase A contamination fixes + model allocation + search accumulation:**
- ✅ **Fix 0-A (Language drift)**: Pass 2 fallback/retry user messages now include `detectedLanguage` directive. Prevents Haiku from switching to English when processing non-English claims after Sonnet soft-refusal.
- ✅ **Fix 4 (Budget reservation)**: `contradictionReservedQueries: 2` UCM parameter. Main loop stops when remaining budget equals reserve, ensuring contradiction always has queries to spend.
- ✅ **Fix 5 (Phantom evidence IDs)**: `stripPhantomEvidenceIds()` in verdict-stage.ts removes hallucinated evidence IDs from verdict arrays before structural consistency check.
- ✅ **Rec-A (Pass 2 → Haiku)**: `getModelForTask("verdict")` → `getModelForTask("extract_evidence")` for Pass 2. ~3% LLM cost saving, eliminates soft-refusal fallback cascade.
- ✅ **Rec-C (getModel literal)**: `resolveModel("sonnet")` → `resolveModel("standard")` in `getModel()` fallback path.
- ✅ **Search accumulation**: `autoMode: "accumulate"` UCM toggle added to `SearchConfigSchema`. Default restores multi-provider evidence filling (was `first-success` since `8bef6a91`).
- ✅ **metrics.ts pricing**: Added gpt-4.1, gpt-4.1-mini, gemini-2.5-pro/flash, claude-opus-4-6 to cost tracking.
- ⚠️ **SerpAPI**: Re-enablement attempted and **reverted** — circuit breaker OPEN from prior failures, +100% latency with zero evidence contribution. Remains disabled for main pipeline; still active in SR evaluation path.
- 📋 **Phase A validation**: 4 post-fix runs (3 local + 1 deployed): zero foreign boundaries, German boundary names preserved, contradiction loop ran in all, zero phantom IDs. Phase A+ NOT triggered.
- 📋 **Search accumulation validation**: CSE-only accumulate (TP=71, ev=80, 13m) outperformed all conditions. SerpAPI-enabled runs degraded (-10% TP, +100% duration).

---

## Recent Changes (2026-03-10)

**Phase 2 complete + Report Variability structural fixes:**
- ✅ Phase 2 validation: 7/7 runs SUCCEEDED across question/statement/claim/article types — pipeline declared production-ready
- ✅ **MT-1**: Sufficiency guard — `allClaimsSufficient()` requires ≥1 completed main iteration before early-exit fires. New UCM field `sufficiencyMinMainIterations` (default 1). `mainIterationsUsed=0` shortcut eliminated.
- ✅ **MT-3**: `distinctEvents` multi-event coverage — when `distinctEvents.length > 1`, effective min iterations scales to `max(minMainIterations, distinctEventCount - 1)`. `GENERATE_QUERIES` prompt section strengthened with abstract multi-event cross-cluster rule.
- ✅ **MT-2**: Explicit `CB_GENERAL_UNSCOPED` boundary — unscoped evidence no longer absorbed into largest named boundary. Three-way branch: 1 boundary → direct assignment; `CB_GENERAL` exists → route to it; 2+ named boundaries → create `CB_GENERAL_UNSCOPED` synthetic boundary.
- ✅ **TypeScript build fixes**: `InputType` cast (inclusion over exclusion), `maxTokens` → `maxOutputTokens` (AI SDK v6)
- ✅ **SR Phase 2.4**: Per-category cache TTL (`cacheTtlByCategory`) — highly_reliable=60d, unreliable=7d, UCM-configurable
- ⏳ **Phase 1 UCM config** (D1+D2): `evidenceSufficiencyMinSourceTypes` restore to 2, serpapi disabled, brave priority=10 — pending Admin UI apply
- ⏳ **M3**: Flag March 5-7 jobs in admin dashboard as potentially unreliable — pending implementation

---

## Recent Changes (2026-03-01)

**Invite code access control (limited public beta):**
- ✅ `InviteCodeUsageEntity` — daily quota tracking (composite PK on InviteCode+Date, UTC string storage)
- ✅ `TryClaimInviteSlotAsync` — atomic daily+lifetime slot claim (`IsolationLevel.Serializable` → `BEGIN IMMEDIATE`)
- ✅ Job search (`?q=`) on `JobsController` + web forwarding + debounced search bar UI
- ✅ `inviteCode` removed from public List/Get responses (privacy fix)
- ✅ DB rebuilt with new schema (EnsureCreated pattern, `factharbor.db` 2026-02-28)
- ✅ Commit `976539f`

**Inverse Claim Asymmetry — Phases 0–3 complete:**
- ✅ Phase 1: integrity policies implemented (`safeDowngradeVerdict`, `retryOnceThenSafeDowngrade`)
- ✅ Phase 1 policies implemented — commit `8e4a0d0`
- ⚠️ Phase 1 policies **disabled** as of 2026-03-05 (both set to `disabled` in active UCM config due to false-positive concerns). `warn_and_cap` softer mode remains only a deferred idea — see `Docs/WIP/Quality_Improvement_Pending_fwd.md`
- ✅ Phase 2 (7 tasks): 4 strict inverse fixture pairs, CE gate (`strictInverseGatePassed`), `InverseConsistencyDiagnostic`, root-cause tags, HTML panel, `inverse_consistency_error` warning, paired-job audit tool
- ✅ Phase 3: `inverse-minwage-employment-en` mandatory in smoke lane, CE threshold enforced — commit `3fc9c0b`
- ✅ Canary baselines: minwage-en CE=12 pp, fluoride-en CE=16 pp, gmo-de CE runs completed (2026-02-28)
- ✅ `diagnosticPairs` filter now excludes `isStrictInverse` pairs (own gate)
- ✅ Code review fixes (MEDIUM vacuous-truth + 3 LOW items) — commits `2ead57b`, `b072da7`

**Claim Fidelity Fix — all phases done:**
- ✅ Phase 3 (payload compression): `buildPreliminaryEvidencePayload()` truncates Pass 2 evidence to 120-char topic signals, removes rich statement text that caused claim drift

**Model auto-resolution — done:**
- ✅ `apps/web/src/lib/analyzer/model-resolver.ts` — tier aliases resolved to concrete model IDs, UCM-configurable. Commit `c0d452a`

---

## Recent Changes (2026-02-27)

**D5 UCM seed completion + calibration alignment:**
- ✅ Added 3 missing D5 contrarian retrieval params to `calculation.default.json` (`contrarianRetrievalEnabled`, `contrarianMaxQueriesPerClaim`, `contrarianRuntimeCeilingPct`) — Admin UI can now surface these for tuning
- ✅ B-1 runtime role tracing verified working from actual canary + gate run data (Feb 23 outputs confirm all 5 debate roles populated)
- ✅ Removed calibration preflight hard-fail on `debateModelProviders` overrides — gate runs now test actual production config (OpenAI challenger) instead of forcing all-Anthropic baseline
- ✅ Canary runs: `immigration-impact-en` operational PASS (57pp raw, 17pp adjusted), `rent-control-en` operational PASS (26pp raw/adjusted, Sonnet refusal recovered via Haiku fallback)
- ✅ Project status synced across all docs (CLAUDE.md, Backlog.md, xWiki Project Status, xWiki Planning)

---

## Recent Changes (2026-02-24)

**Calibration harness reliability + interpretation update:**
- ✅ Added pair-by-pair checkpoint artifacts for long calibration runs (`*.partial.json` + `*.partial.html`) to avoid total data loss on interruption
- ✅ Split report interpretation into **operational gate** (execution reliability) vs **diagnostic gate** (framing-skew telemetry)
- ✅ Top-level calibration report verdict now reflects operational status; skew remains visible as optimization signal
- ✅ Calibration policy document updated with explicit purpose/value and acceptance guidance
- ✅ Gate calibration preflight logs production profile (`OpenAI` challenger provider) — hard-fail removed 2026-02-27
- ✅ Aborted gate runs explicitly classified as non-decision-grade in run policy (debug-only use)

**Multi-source retrieval provider layer (Plan v2.1 Phases 1-4):**
- ✅ Added search providers: Wikipedia, Semantic Scholar, Google Fact Check (UCM-configurable)
- ✅ Wired provider enum/schema/admin config/AUTO search dispatch + circuit-breaker integration
- ✅ Added env support for `SEMANTIC_SCHOLAR_API_KEY` and `GOOGLE_FACTCHECK_API_KEY`
- ✅ Added 36 tests for new providers; safe suite now at 1047 tests passing
- ✅ **Wikipedia supplementary completion (2026-04-04):** Wikipedia enabled by default (`always_if_enabled` mode, bounded to 3 results). Detected claim language threaded into Wikipedia subdomain selection. Generic `supplementaryProviders` UCM block controls all supplementary providers. Semantic Scholar and Google Fact Check remain disabled by default.

---

## ClaimAssessmentBoundary Pipeline v1.0 (2026-02-17)

**Status:** IMPLEMENTED — All 5 pipeline stages operational. 853 tests passing. Build clean.

The AnalysisContext pipeline has been fully replaced by the **ClaimAssessmentBoundary pipeline** — a fundamental redesign where analytical boundaries emerge from evidence rather than being pre-created. The Orchestrated pipeline has been deleted (~18,400 lines removed).

**Key features:**
- **ClaimAssessmentBoundary**: Evidence-emergent groupings derived from EvidenceScope clustering after evidence is gathered
- **Two-pass evidence-grounded claim extraction**: Quick scan (Haiku) → preliminary search → evidence-grounded re-extraction (Sonnet)
- **LLM debate pattern**: Advocate → challenger → reconciliation for each claim verdict (5-step process)
- **Source triangulation scoring**: Cross-boundary agreement/disagreement with configurable boosts/penalties
- **EvidenceScope on all evidence**: `methodology` + `temporal` populated when available (optional in TypeScript types); `additionalDimensions` for domain-specific data
- **VerdictNarrative**: Structured narrative with headline, keyFinding, boundaryDisagreements, limitations
- **Coverage matrix**: Claims × boundaries evidence distribution tracking
- **Quality gates**: Gate 1 (claim validation) + Gate 4 (confidence distribution)
- **Self-consistency checks**: Spread multipliers for verdict stability assessment
- **Derivative evidence tracking**: Identifies and weights derivative sources

**Design document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](../ARCHIVE/ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
**Execution tracking:** [CB_Execution_State.md](../ARCHIVE/CB_Execution_State.md)

**All phases complete:**
1. ✅ **Step 0: Rules Audit** — Governance docs updated
2. ✅ **Phase 1: Infrastructure** — Types, verdict-stage module, 8 UCM prompts, pipeline skeleton
3. ✅ **Phase 2: Cutover** — ClaimAssessmentBoundary wired as default, schema 3.0.0-cb
4. ✅ **Phase 2a: Delete orchestrated** — ~18,400 lines removed
5. ✅ **Phase 2 docs** — 5 xWiki pages rewritten for CB terminology
6. ✅ **Phase 3: UI** — BoundaryFindings component, page.tsx updated
7. ✅ **Phase 3b: MD cleanup** — Dead prompt infrastructure removed (~3,300 lines)
8. ✅ **Phase 4: Final AC sweep** — Zero AnalysisContext references in active code
9. ✅ **Phase 5a: Stage 1** — extractClaims (two-pass + Gate 1)
10. ✅ **Phase 5b: Stage 2** — researchEvidence (claim-driven + contradiction search)
11. ✅ **Phase 5c: Stage 3** — clusterBoundaries (LLM clustering + coherence)
12. ✅ **Phase 5d: Stage 4** — generateVerdicts (production LLM wiring)
13. ✅ **Phase 5e: Stage 5** — aggregateAssessment (triangulation + narrative)
14. ✅ **Phase 5f: Integration test** — 3 scenarios with schema validation
15. ✅ **Phase 5f2: Rename** — ClaimBoundary → ClaimAssessmentBoundary (partial)
16. ✅ **Phase 5g: Documentation** — Status, governance, and architecture docs updated

**Deferred to v1.1:**
- Gate 1 retry loop (§8.1.5) — currently warn-only on high failure rate
- CLAIM_GROUPING UI display (§18 Q1) — Haiku call for claim grouping when ≥4 claims
- Advanced triangulation (§8.5.2) — cross-boundary correlation analysis
- Contestation weight reduction — requires factualBasis field on CBClaimVerdict
- Derivative source detection improvements (§8.5.3)

---

## Recent Changes (2026-02-23)

**Framing-Symmetry Calibration v3.3.0:**
- ✅ Test renamed from "political-bias" to "framing-symmetry" (fixture + test file)
- ✅ Fixture v3.3.0: 14 pairs (4en/3de/3fr/2es/2pt) with `pairCategory`, `mirrorQuality`, `evidenceNotes` fields
- ✅ **Diagnostic gate**: Pass/fail computed only over `pairCategory: "bias-diagnostic"` pairs (dedicated thresholds: `maxDiagnosticMeanSkew` 15pp, `maxDiagnosticPairSkew` 25pp)
- ✅ **Zero-tolerance direction check**: Wrong-direction skew is a hard fail regardless of magnitude
- ✅ **Accuracy-control bypass**: `pairCategory: "accuracy-control"` pairs reported but always pass (don't gate)
- ✅ Baseless challenge handling: severity changed from "warning" to "info", full revert applied
- ✅ D5 evidence controls, B-1 runtime tracing, UI warning triage — all implemented and code-reviewed
- ✅ Model usage utility: `model-usage.ts` extracts all LLM model names including runtime fallbacks

**WIP Consolidation #2:**
- ✅ Archived 5 files (Bias Pairs Redesign, Phase1 Spec, Debate Iteration Analysis, Debate Continuation Plan, Quality Opportunity Map)
- ✅ Extracted 2 items to Backlog: Verdict Accuracy Test Set (high/high), Conditional re-reconciliation (med/med)
- ✅ WIP reduced from 13 to 8 files

---

## Recent Changes (2026-02-22)

**B-sequence Quality Improvements (commits 6e9fa0b → 640d883):**
- ✅ **B-5a**: Strengthened challenger prompt with structured adversarial analysis
- ✅ **B-6**: Verifiability annotation at Stage 1 extraction (`claimAnnotationMode` UCM control)
- ✅ **B-7**: Misleadingness flag on verdicts (decoupled from truthPercentage)
- ✅ **B-8**: Explanation quality check (Tier 1 structural + Tier 2 LLM rubric, `explanationQualityMode` UCM control)
- ✅ **B-5b**: Opus tier support for debate model roles (`modelOpus` UCM field)

**Review fixes + i18n hardening (commits efd12c2 → 62e7e37):**
- ✅ M1: `claimAnnotationMode` wired to strip verifiability when "off"
- ✅ M2: B-8 rubric LLM failure degrades gracefully to structural-only
- ✅ M3: `hasVerdictCategory` checks verdict terms, not just non-empty
- ✅ i18n: All structural checks use Unicode-aware patterns (`\p{Lu}`), no English keyword matching
- ✅ Deleted dead `ENGLISH_STOPWORDS` constant

**Final review findings (commit 231ff13):**
- ✅ B8-M1: Documented provider cost in UCM `explanationQualityMode` description
- ✅ B7-L1: `parseMisleadingness` logs dropped invalid values
- ✅ B8-L1: `hasLimitations` threshold commented

**xWiki documentation update (commits 464e641, c605d70):**
- ✅ 7 architecture xWiki pages updated for CB pipeline (Core ERD, Analysis Entity Model, Entity Views, Data Model, Quality Gates Flow, CB Pipeline Detail, Evidence Filter)

**WIP consolidation:**
- ✅ Archived 17 completed/superseded WIP files (8 code reviews, 3 quality map reviews, 6 process docs)
- 17 active files retained (architecture, calibration/quality track, Alpha proposals)

---

## Quick Status (Current Pipelines)

### ✅ What Works

**Core Analysis Pipeline:**
- **Pipeline Variants**:
  - ClaimAssessmentBoundary Pipeline (default, production) — 5-stage pipeline with LLM debate pattern
  - Monolithic Dynamic (alternative, flexible output)
  - ~~Orchestrated Pipeline~~ (removed in v2.11.0 — replaced by ClaimAssessmentBoundary)
  - ~~Monolithic Canonical~~ (removed in v2.10.x)
- ClaimAssessmentBoundary clustering (evidence-emergent groupings)
- Input neutrality (question ≈ statement within ±4%)
- Claim extraction with dependency tracking
- Temporal reasoning with current date awareness
- Web search integration (Google CSE, SerpAPI, Brave, Wikipedia, Semantic Scholar, Google Fact Check)
- Evidence extraction from multiple sources
- 7-point verdict scale (TRUE to FALSE)
- MIXED vs UNVERIFIED distinction (confidence-based)
- Pseudoscience detection and escalation
- KeyFactors discovery and aggregation
- **Doubted vs Contested Distinction**: Proper handling of evidence-based vs opinion-based contestation
- Quality Gates (Gate 1: Claim Validation, Gate 4: Verdict Confidence)
- LLM Tiering for cost optimization
- Provenance validation (Ground Realism enforcement)
- **Harm Potential Detection**: Shared heuristic for death/injury/fraud claims

**API Cost Optimization (2026-02-13):**
- ✅ **Budget defaults reduced**: `maxIterationsPerContext` 5→3, `maxTotalIterations` 20→10, `maxTotalTokens` 750K→500K
- ✅ **Context detection tightened**: `contextDetectionMaxContexts` 5→3, `contextDedupThreshold` 0.85→0.70
- ✅ **Expensive tests excluded from `npm test`**: 4 LLM integration tests now require explicit `test:expensive` script
- ✅ **Cost reduction strategy documented**: Batch API, prompt caching, NPO/OSS programs researched
- See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

**Report Quality Hardening (2026-02-13):**
- ✅ **Zero-Source Warning Coverage**: Added `no_successful_sources` and `source_acquisition_collapse` for source-acquisition failures
- ✅ **Direction Semantics Prompt Hardening**: Added qualifier-preservation and semantic-interpretation guardrails in orchestrated prompts
- ✅ **Direction Validation Tier Update**: Direction validation now routes through verdict-tier model selection

**Phase 2 Quality Improvements (v2.6.41):**
- **Evidence Quality Filtering**: Two-layer enforcement (prompts + deterministic filter) for probative value
  - See: [Evidence Quality Filtering Architecture](../ARCHITECTURE/Evidence_Quality_Filtering.md)
- **probativeValue Field**: Quality assessment (high/medium/low) with admin-configurable weights
- **SourceType Classification**: 9 source types with reliability calibration factors
- **Schema Backward Compatibility**: Optional fields + deprecated aliases for smooth migration
  - See: [Schema Migration Strategy](../xwiki-pages/FactHarbor/Product Development/Specification/Implementation/Schema%20Migration%20Strategy/WebHome.xwiki)
- **Provider-Specific Prompts**: Optimized formatting for Anthropic, OpenAI, Google, Mistral
  - See: [Provider Prompt Formatting](../xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt%20Engineering/Provider-Specific%20Formatting/WebHome.xwiki)

**LLM Text Analysis Pipeline (v2.9+):**
- **Four Analysis Points**: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
- **LLM-Only Contract**: All analysis points are always LLM-driven (no hybrid/heuristic fallback)
- **Multi-Pipeline Support**: Works across ClaimAssessmentBoundary and Monolithic Dynamic pipelines
- **Telemetry**: Built-in metrics for success rates, latency
- **Bug Fix (v2.8.1)**: Counter-claim detection removed from verdict prompt (was overriding better understand-phase detection)
- **Prompt Files**: Located in `apps/web/prompts/text-analysis/` with README documentation
- - See: [LLM Text Analysis Pipeline Deep Analysis](../ARCHIVE/REVIEWS/LLM_Text_Analysis_Pipeline_Deep_Analysis.md)
- - See: [LLM Classification System Architecture](../ARCHITECTURE/LLM_Classification_System.md)

**Shared Module Architecture:**
- `scopes.ts`: Context detection (`detectScopes()`, `formatDetectedScopesHint()`)
- `aggregation.ts`: Verdict weighting (`validateContestation()`, `detectClaimContestation()`, `detectHarmPotential()`)
- `claim-decomposition.ts`: Claim parsing utilities
- Consistent behavior across ClaimAssessmentBoundary and Monolithic Dynamic pipelines

**Code Quality & Refactoring (Phase 2a Complete - 2026-02-12):**
- ✅ **Evidence Processor Module Extraction**: 3 new modules created (705 lines)
  - `evidence-normalization.ts`: ID migration, classification validation
  - `evidence-recency.ts`: Temporal analysis, date extraction, staleness scoring
  - `evidence-context-utils.ts`: Context metadata utilities
- ✅ **orchestrated.ts Reduction**: 13,905 → 13,412 lines (493 lines removed)
- ✅ **Benefits**: Improved testability, reduced complexity, focused modules
- See: [QA Review & Code Quality Plan](../../.claude/plans/polished-tumbling-hare.md)

**Phase 1 QA Cleanup (2026-02-12):**
- ✅ **Normalization Removal**: All heuristic normalization code deleted (~500 lines)
  - `normalizeYesNoQuestionToStatement()` removed from pipeline
  - Test file deleted (330 lines, 22 tests)
  - Config parameters removed (143 lines)
  - LLM-first input handling (question/statement equivalence)
- ✅ **Defensive Clamping Replacement**: `clampTruthPercentage` → `assertValidTruthPercentage`
  - Replaced silent bug masking with fail-fast validation
  - 10 call sites updated with context strings for better diagnostics
  - Two duplicate implementations removed
- ✅ **Canonical Pipeline Removal**: Monolithic Canonical variant removed (~2,281 lines)
  - Twin-Path architecture (Orchestrated + Monolithic Dynamic)
  - Graceful backward compatibility for historical job records
  - Documentation updated across codebase

**Infrastructure:**
- Job lifecycle management (QUEUED → RUNNING → SUCCEEDED/FAILED)
- Real-time progress updates via Server-Sent Events (SSE)
- PDF and HTML content extraction
- Multi-provider LLM support (Anthropic, OpenAI, Google, Mistral)
- Multi-provider search support (Google CSE, SerpAPI, Brave, Wikipedia, Semantic Scholar, Google Fact Check)
- SQLite database for local development
- Automated retry with exponential backoff
- **Unified Configuration Management** (v2.9.0 ✅ Complete): Database-backed config system for prompt/search/calculation/pipeline/sr/lexicons, validation, history, rollback, import/export. Analysis settings (including LLM provider selection) now load from UCM with hot-reload. **All phases complete** - job config snapshots + SR modularity interface + admin UI with snapshot tools.

**Metrics & Testing**:
- ✅ **Metrics Collection System**: Integrated into ClaimAssessmentBoundary pipeline.
- ⚠️ **Observability Dashboard**: Built at `/admin/metrics`, awaiting data aggregation logic.
- ⚠️ **Baseline Test Suite**: Ready (30 diverse test cases) but not executed (requires $20-50)
- ⚠️ **A/B Testing Framework**: Built but not executed (requires $100-200)
- ⚠️ **Schema Retry Logic**: Implemented in separate module, not integrated
- ⚠️ **Parallel Verdict Generation**: Built (50-80% speed improvement) but not integrated
- ✅ **Tiered LLM Routing**: Enabled (Haiku 4.5 for extract/understand, Sonnet 4.5 for verdict/context refinement)

**Promptfoo Testing Infrastructure (v2.8.2 - OPERATIONAL)**:
- ✅ **38 Total Test Cases** across 3 configurations
- ✅ **Source Reliability Tests**: 7 test cases (score caps, ratings, evidence citation)
- ✅ **Verdict Generation Tests**: 5 test cases (rating direction, accuracy bands)
- ✅ **Text Analysis Pipeline Tests**: 26 test cases covering all 4 analysis points
  - Input Classification (8 tests): Comparative, compound, claim types, decomposition
  - Evidence Quality (5 tests): Quality levels, expert attribution, filtering
  - Context Similarity (5 tests): Duplicate detection, phase buckets, merge logic
  - Verdict Validation (8 tests): Inversion, harm potential, contestation
- See: [Promptfoo Testing Guide](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Tooling/Promptfoo%20Testing/WebHome.xwiki)

**UI/UX:**
- Analysis submission interface
- Job history and status tracking
- Report display (Summary, JSON, Report tabs)
- Two-panel summary format
- Multi-context result display
- Admin metrics dashboard (NEW)
- **Rich HTML report export** (CB pipeline: self-contained dark-themed HTML with verdict banner, narrative, boundary findings, evidence, sources, quality gates)

### ⚠️ Known Issues

**CRITICAL**:
1. ~~**Prompt Optimizations Never Validated**~~: ✅ **RESOLVED** (v2.10.2) - Lead Dev code review complete, format-only principle verified, backward compatibility confirmed.
2. ~~**Metrics Infrastructure Not Integrated**~~: ✅ **RESOLVED** (v2.11.0) - All 5 stages instrumented with role-level attribution.
3. ~~**10 search test failures**~~: ✅ **RESOLVED** (safe suite now 1047/1047 passing).

**HIGH**:
3. **Source Acquisition Recovery Branch**: Phase 1 warning coverage is complete, but Phase 4 stall-recovery behavior is still pending
4. **Input Neutrality Context Variance**: Question vs statement can yield different context counts in some cases
5. **Model Knowledge Toggle**: `pipeline.allowModelKnowledge=false` not fully respected in Understanding phase
6. **xWiki Deployment Gap**: Live xWiki instance was last imported from a ~160-page XAR (pre-Feb 10 reorganisation). Current master XAR (`FactHarbor.xar`) covers 202 pages including ~42 new landing pages created by the `db5e47a` tree reorganisation. **Action required**: import the 202-page `FactHarbor.xar` to the live xWiki instance via Administration → Import.

**MEDIUM**:
7. **Budget Constraints**: Reduced from v2.8.2 highs for cost optimization (3 iter/context, 10 total, 500K tokens). May need tuning per UCM if quality is insufficient for complex analyses
8. **No Claim Caching**: Recomputes every analysis, wastes API calls on duplicates
9. **No Normalized Data Model**: All data stored as JSON blobs, no relational queries
10. **Error Pattern Tracking**: No systematic tracking of error types/frequencies

**SECURITY** (LOW for POC, HIGH before public deployment):
11. **SSRF Protection**: URL fetching needs IP blocking, size limits, redirect caps
12. **Admin Endpoint Security**: `/admin/test-config` publicly accessible
13. **Rate Limiting**: No per-IP or per-user rate limits

**See**: [Complete issue list with workarounds](KNOWN_ISSUES.md)

---

## Current Priorities

### Immediate (USER ACTION REQUIRED)

1. ~~**Validate Prompt Optimizations**~~ ✅ **COMPLETED (v2.10.2)**
   - ✅ Format-only principle verified for Anthropic variant
   - ✅ Generic examples policy enforced
   - ✅ Lead Dev code review passed
   - ✅ Backward compatibility confirmed
   - **Status**: Complete - See [Prompt Optimization Summary](../ARCHIVE/Prompt_Optimization_Investigation.md)

2. **Integrate Metrics Collection**
   - ✅ Add metrics hooks to analyzer.ts
   - ⏸️ Verify dashboard shows data
   - **Status**: Complete (Phase 1 wiring unblocked Phase 1.5/2)

### Short-Term (PERFORMANCE & QUALITY)

3. **Deploy Performance Optimizations**
   - ⏸️ Enable parallel verdict generation (50-80% faster)
   - ⏸️ Extend regression coverage for source-acquisition and direction-semantics hardening paths
   - **Status**: Code ready, needs integration into analyzer.ts

4. **Fix Quality Regression Issues**
   - ⏸️ Review and adjust budget constraints
   - ⏸️ Validate input neutrality with more test cases
   - ⏸️ Investigate remaining high-variance context-splitting cases
   - **Status**: Root causes identified, fixes planned

### Medium-Term (BEFORE PUBLIC DEPLOYMENT)

5. **Security Hardening**
   - SSRF protections (IP blocking, size limits)
   - Admin endpoint authentication
   - Rate limiting implementation
   - **Priority**: LOW for local POC, HIGH before public release

6. **UI Enhancements**
   - Display Quality Gate decisions with reasons
   - Show metrics dashboard with real data
   - Improve error messaging

### Open Topics / Task List (Jan 2026)

- [ ] **Inverse-input symmetry hardening**: Keep `scripts/inverse-scope-regression.ps1` green; add 2-3 more inverse pairs and explicitly define which pairs require *strict* context symmetry vs *best-effort* symmetry (to avoid overfitting to a single example).
- [ ] **Evidence-driven context refinement guardrails**: Add lightweight metrics/logging so we can tell how often context refinement is applied vs rejected, and why (avoid over-splitting into “dimensions” that are not bounded contexts).
- [ ] **Central-claim evidence coverage**: When a central claim has zero supporting/counter facts, do a bounded “missing-evidence” retrieval pass per claim (best-effort; must respect search limits and avoid infinite loops).
- [ ] **Context guidelines**: Document (in a short developer note) what qualifies as a distinct “Context” vs a “dimension” so future prompt tweaks remain consistent with `AGENTS.md`.
- [ ] **Analyzer modularization (defer unless needed)**: `apps/web/src/lib/analyzer.ts` is still monolithic; any split should be planned and done incrementally to minimize risk.

---

## Architecture Status

### Component Health

| Component | Status | Notes |
|-----------|--------|-------|
| **Next.js Web App** | ✅ Operational | Pipeline variants operational |
| **.NET API** | ✅ Operational | SQLite for local, PostgreSQL for production |
| **Job Orchestration** | ✅ Working | SSE events, exponential backoff retry |
| **Pipeline Variants** | ✅ Operational | ClaimAssessmentBoundary (default) + Monolithic Dynamic |
| **LLM Integration** | ✅ Multi-provider | Anthropic (recommended), OpenAI, Google, Mistral |
| **LLM Tiering** | ✅ Implemented | Per-task model selection for cost optimization |
| **Search Integration** | ✅ Multi-provider | Google CSE, SerpAPI, Brave, Wikipedia, Semantic Scholar, Google Fact Check |
| **Provenance Validation** | ✅ Implemented | All paths validate URL provenance |
| **PDF/HTML Extraction** | ✅ Working | Timeout handling, redirect following |
| **Quality Gates** | ⚠️ Partial | Applied, but not displayed in UI |
| **Source Reliability** | ✅ Implemented | LLM evaluation with cache, multi-model consensus, evidence weighting |
| **Claim Caching** | ❌ Not implemented | Recomputes per job |
| **Normalized Data Model** | ❌ Not implemented | Job blobs only, no claim/evidence tables |
| **AuthN/AuthZ** | ❌ Not implemented | Open endpoints (except internal runner) |
| **Rate Limiting** | ❌ Not implemented | No quota enforcement |

### Data Model

**Implemented:**
- Analysis result with claims, verdicts, sources, facts
- Article verdict with aggregation
- Claim verdicts with dependency tracking
- KeyFactors with claim mapping
- Quality gate statistics

**Missing:**
- Normalized database tables (claims, evidence, sources, verdicts)
- Quality metrics persistence
- Error pattern tracking
- Historical source track record

---

## Test Status

### Recent Test Results

**Input Neutrality (v2.6.23)**:
- Bolsonaro trial: 1% divergence ✅ (down from 4%)
- Question: 72% truth, Statement: 76% truth
- Within acceptable LLM variance (<5%)

**Rating Direction (v2.6.24)**:
- Fixed: Verdicts now rate original claim (not analysis conclusion)
- Pending: Re-test with hydrogen/electricity comparative claim

**Centrality (v2.6.24)**:
- Fixed: Methodology validation claims excluded
- Expected: ≤2 central claims per analysis
- Pending: Validate with diverse topics

### Test Coverage

**Unit Tests** (`npm test` — safe, no API calls):
- ClaimAssessmentBoundary pipeline (claimboundary-pipeline.test.ts) — 100+ tests
- Verdict stage module (verdict-stage.test.ts) — 29 tests
- Analyzer core functions (evidence-filter, aggregation, truth-scale, etc.)
- Quality gates, confidence calibration
- Job lifecycle
- 51 test files, 1047 tests, all mocked (no real LLM calls)

**Expensive Integration Tests** (explicit scripts only, $1-5+ per run):
- `npm run test:llm` — Multi-provider LLM integration
- `npm run test:neutrality` — Input neutrality (full analysis x2 per pair)
- `npm run test:cb-integration` — ClaimAssessmentBoundary end-to-end (3 scenarios)
- `npm run test:calibration:canary` — Framing-symmetry canary (1 pair, operational check)
- `npm run test:calibration:smoke` (or `npm run test:calibration`) — Smoke lane
- `npm run test:calibration:gate` (or `npm run test:calibration:full`) — Gate lane (full fixture, decision-grade run)
- `npm run test:expensive` — LLM integration + neutrality + CB integration (excludes calibration)

**Missing Tests:**
- API controller tests
- Database layer tests
- Frontend component tests
- E2E automated tests

---

## TIGERScore Usage (Alpha)

TIGERScore is an optional Stage 6 holistic audit pass that scores:
- Truth
- Insight
- Grounding
- Evidence
- Relevance

It is disabled by default (`tigerScoreMode: "off"`).

### Enable and configure

Set these UCM pipeline fields (Admin -> Config -> Pipeline):
- `tigerScoreMode`: `"on"` to enable Stage 6
- `tigerScoreTier`: `"haiku" | "sonnet" | "opus"` (default: `"sonnet"`)
- `tigerScoreTemperature`: `0.0-1.0` (default: `0.1`)

Defaults are defined in:
- `apps/web/configs/pipeline.default.json`
- `apps/web/src/lib/config-schemas.ts`

### Verify it is active

1. Run a normal analysis job with TIGERScore enabled.
2. Confirm output includes a populated `tigerScore` object in `OverallAssessment`.
3. Confirm job report UI/HTML export renders the TIGERScore panel.

### Calibration policy note

For framing-symmetry calibration runs, keep TIGERScore policy explicit and stable:
- If comparing against a baseline that ran with TIGERScore off, keep it off.
- If enabling TIGERScore for experiments, apply the same setting to both A/B sides and document it in run metadata.

---

## Environment Configuration

### Required Variables

```bash
# LLM Provider API keys (provider selected in UCM pipeline config)
ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# GOOGLE_GENERATIVE_AI_API_KEY=AIza...
# MISTRAL_API_KEY=...

# Search Provider keys (provider selected in UCM search config)
SERPAPI_API_KEY=...
# Or: GOOGLE_CSE_API_KEY=... and GOOGLE_CSE_ID=...
# Or: BRAVE_API_KEY=...
# Optional additional providers:
# SEMANTIC_SCHOLAR_API_KEY=...
# GOOGLE_FACTCHECK_API_KEY=...
# NOTE: Wikipedia provider requires no API key (must be enabled in UCM)

# Internal Keys (must match between web and API)
FH_ADMIN_KEY=your-secure-admin-key
FH_INTERNAL_RUNNER_KEY=your-secure-runner-key

# API Configuration (apps/api/appsettings.Development.json)
# Admin:Key = FH_ADMIN_KEY
# Runner:RunnerKey = FH_INTERNAL_RUNNER_KEY
```

### Optional Variables

```bash
# Job execution controls
FH_RUNNER_MAX_CONCURRENCY=3  # Max parallel analysis jobs
```

---

## Recent Changes

### 2026-02-20 C10 Calibration Baseline v1 — Locked and Ratified
**Status: ✅ CLOSED**

Calibration Baseline v1 locked with two canonical runs (quick: 3 English pairs, full: 10 pairs in en/de/fr). Threshold policy ratified: Option C — C18 (`failureModeBiasCount=0`) as hard gate, verdict skew as diagnostic with escalation triggers. Key findings: French pairs near-zero skew (2.0pp), evidence-pool asymmetry dominates (8/10), extraction bias zero, C18 clean (0/10). See [Calibration_Baseline_v1.md](Calibration_Baseline_v1.md).

### 2026-02-20 Action #6: Verdict Range + Baseless Challenge Guard
**Status: ✅ Implemented**

- **Verdict range reporting**: `truthPercentageRange` computed from self-consistency spread, optionally widened by boundary variance (weight=0.0 default). Displayed in UI + HTML report.
- **Baseless challenge guard**: `enforceBaselessChallengePolicy()` — hybrid enforcement with deterministic post-check revert. `validateChallengeEvidence()` — structural ID check before reconciliation. `baselessAdjustmentRate` metric surfaced as structured warning.
- **Challenge point IDs**: Explicit `ChallengePoint.id` field (format `CP_{claimId}_{index}`) replaces implicit convention.
- 943 tests passing, build clean. Commit: `d9a91f5`.

### 2026-02-20 Framing-Symmetry Calibration Harness (Phases 1-3)
**Status: ✅ Implemented**

Reusable harness for measuring directional framing asymmetry through mirrored claim pairs. Addresses Concern C10 (Critical) from the Stammbach/Ash EMNLP 2024 paper review.

**Implementation:**
- **Phase 1 (Core):** Types, metrics computation, runner (executes pairs through `runClaimBoundaryAnalysis()`), fixture loader
- **Phase 2 (Report):** Self-contained HTML report generator (dark theme, verdict banner, stage bias heatmap, per-pair side-by-side cards, config snapshot)
- **Phase 3 (Diff):** A/B comparison engine — config diff + per-pair skew deltas + improved/worsened/unchanged counts
- **Phase 4 (Admin UI):** Deferred

**Files:** `apps/web/src/lib/calibration/` (6 files), `apps/web/test/fixtures/framing-symmetry-pairs.json` (14 pairs, v3.3.0), `apps/web/test/calibration/framing-symmetry.test.ts`

**Run:** `npm -w apps/web run test:calibration:smoke` (smoke lane), `npm -w apps/web run test:calibration:gate` (gate lane, full fixture), or `npm -w apps/web run test:calibration:canary` (single-pair operational check)

**Architect review:** Codex (GPT-5) reviewed and applied targeted adjustments — failure accounting, script safety, neutral baseline fixture policy, report direction fix.

**See:** [Calibration_Harness_Design_2026-02-20.md](../ARCHIVE/Calibration_Harness_Design_2026-02-20.md)

---

### 2026-02-19 Monolithic Dynamic Pipeline Schema Fix
**Status: ✅ Implemented**

Fixed `AI_NoObjectGeneratedError` (100% failure rate on some inputs) in the Monolithic Dynamic pipeline.

**Root causes:**
- `searchQueries` field was required in the Zod schema but never mentioned in the analysis prompt → LLM omits it → Zod rejects
- `additionalInsights: z.object({})` rejected `null` values returned by the LLM

**Changes (`monolithic-dynamic.ts`, `types.ts`):**
- `searchQueries` removed from schema (field not needed; LLM never generates it)
- `additionalInsights` relaxed to `z.any().optional()`
- Existing `schema-retry.ts` module wired in (was dead code for this pipeline): 1 Zod-aware retry before degradation
- Graceful degradation: schema failure after retry returns partial result with `"analysis_generation_failed"` warning instead of throwing
- `"analysis_generation_failed"` added to `AnalysisWarningType`

**Open items:** `maxOutputTokens` ceiling; schema unification with CB; prompt framing for sensitive content (needs Captain approval). See [Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md](../AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md).

---

### 2026-02-19 Documentation Cleanup — Phase 1 Historical Archival
**Status: ✅ Complete**

- Archived Orchestrated Pipeline xwiki page (pipeline removed in v2.11.0, ~18,400 lines)
- Extracted Orchestrated-era sections from Pipeline Variants xwiki → `WebHome_arch.xwiki`
- Updated Pipeline Variants live page: ClaimAssessmentBoundary as current default throughout
- Updated Deep Dive Index: removed Orchestrated Pipeline row and role path links
- Archived `Current_Status.md` changelog entries v2.10.2 and earlier → `ARCHIVE/STATUS/Current_Status_arch.md`
- Archived `Documentation_Updates_2026-02-03.md` (references files that no longer exist)

---

### 2026-02-19 Pass2 Soft Refusal Recovery (CB Stage 1)
**Status: ✅ Implemented**

Quality-gated fallback for content-policy soft refusals in Stage 1 Pass 2 of the ClaimAssessmentBoundary pipeline. When Pass 2 returns a soft refusal, the pipeline degrades gracefully (falls back to Pass 1 result) rather than propagating the refusal downstream. Transient soft-refusal warnings after successful recovery are suppressed.

**Changes (`claimboundary-pipeline.ts`, `claimboundary.prompt.md`):**
- Pass 2 soft-refusal detection with quality-gated fallback logic (+131/−19 in pipeline, +3 in prompt)
- Warning suppression after recovery (+34/−25)

---

### 2026-02-19 Rich HTML Report Export
**Status: ✅ Implemented**

Self-contained dark-themed HTML export from the job report page. Generates a downloadable HTML file with: verdict banner, VerdictNarrative, boundary findings, evidence table, sources, and quality gates. Supports ClaimAssessmentBoundary pipeline output with legacy pipeline fallback.

**Changes:**
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts` — New 775-line report generator
- `apps/web/src/app/jobs/[id]/page.tsx` — Export button wired in
- Meta field names corrected: `meta.llmModel`, `meta.llmProvider`, `meta.llmCalls`
- Confidence value visually subordinate to truth value (42px→22px in verdict banner, 24px→15px in per-claim meters)

---

### 2026-02-19 gh-pages Analytics Scope Fix
**Status: ✅ Implemented**

Fixed analytics aggregation so each gh-pages site (xwiki-viewer, etc.) tracks page views independently rather than sharing a single unscoped bucket.

**Changes (`xwiki-viewer.html`, `build_ghpages.py`, `.github/workflows/deploy-docs.yml`):**
- `analytics.configure(url, siteId)` added — per-site scoping at initialisation
- `track()` prefixes `pageRef` with `siteId`; `stats()` filters by site ID

---

### 2026-02-19 xWiki Phase 3E — Orchestrated Terminology Sweep
**Status: ✅ Complete**

Documentation sweep to flag or remove Orchestrated pipeline terminology (AnalysisContext, KeyFactor, SubClaim, ContextAnswer, ClaimUnderstanding) from xWiki pages. These entities were all removed in v2.11.0.

**Approach:**
- Current-content pages (Automation spec, Claim Workflow): surgical replacement with CB equivalents
- Orchestrated-era diagrams/ERDs (Entity Views, Analysis Entity Model ERD): `{{warning}}` STALE blocks — too large to fully rewrite in this scope
- 17 `.xwiki` files updated across Specification and Diagrams sections; 202-page XAR rebuilt

**Open item:** `Specification/Architecture/Data Model/WebHome.xwiki` is the last significant Orchestrated holdout in the Specification section — added to Backlog as high/high priority.

---

### 2026-02-18 Stage 1 Claim Fidelity Fix — Phase 1+2 (P0 In Progress)
**Status: 🔧 Partially Implemented — Phase 3+4 Pending**

P0 quality fix: Stage 1 Pass 2 was over-anchoring claims to preliminary evidence instead of the user's input, causing claim drift that propagated through all downstream stages. Phases 1+2 implemented by Codex (o4-mini).

**Implemented (Phases 1+2):**
- `impliedClaim` must now be derivable from user input alone (evidence refines verifiability, not thesis scope)
- LLM classifies input as `single_atomic_claim` vs `multi_assertion_input` before decomposition
- `passedFidelity` per-claim check added to Gate 1 — filters claims that drift from original input
- Safety-net rescue: if all claims filtered by gates, highest-scoring ones rescued to prevent empty output
- Mixed confidence threshold lowered 60→40 in truth-scale to reduce false "mixed" classifications
- Metrics persistence fix: uses absolute API URL + admin auth header for server-side calls

**Pending:**
- Phase 3: Evidence payload compression (scope signals instead of full statements in Pass 2)
- Phase 4: Validation against baseline scenarios with real LLM calls (SRF report + "sky is blue")
- Full acceptance criteria: [Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](../ARCHIVE/Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md)

**Tests:** 853 passing (45 test files). New tests: fidelity filtering, safety-net rescue.

### 2026-02-17 ClaimAssessmentBoundary Pipeline v1.0 (v2.11.0)
**Status: ✅ IMPLEMENTED — Production-Ready**

Complete pipeline implementation replacing the Orchestrated pipeline with evidence-emergent ClaimAssessmentBoundary architecture.

**Pipeline Stages (all operational):**
1. **Stage 1: Extract Claims** — Two-pass evidence-grounded claim extraction (Haiku + Sonnet) with Gate 1 validation
2. **Stage 2: Research Evidence** — Claim-driven iteration loop with contradiction search, EvidenceScope extraction, derivative validation
3. **Stage 3: Cluster Boundaries** — LLM-driven EvidenceScope clustering (Sonnet) with coherence assessment and cap enforcement
4. **Stage 4: Generate Verdicts** — 5-step LLM debate pattern (advocate → challenger → reconciliation → self-consistency → validation)
5. **Stage 5: Aggregate Assessment** — Triangulation scoring, weighted aggregation, VerdictNarrative generation, quality gates

**Key metrics:**
- 853 unit tests passing (45 test files, as of 2026-02-18 code review sprint)
- ~18,400 lines of legacy code removed (orchestrated.ts + AC infrastructure)
- 24 UCM-configurable parameters for pipeline tuning
- Schema version: 3.0.0-cb
- Integration test suite with 3 end-to-end scenarios

**Files:**
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — Main pipeline (~1,800 lines)
- `apps/web/src/lib/analyzer/verdict-stage.ts` — Verdict module (~680 lines)
- `apps/web/prompts/claimboundary.prompt.md` — 10 UCM-managed prompt sections

**See:** [ClaimBoundary Architecture](../ARCHIVE/ClaimBoundary_Pipeline_Architecture_2026-02-15.md), [Execution State](../ARCHIVE/CB_Execution_State.md)

### 2026-02-13 Prompt Externalization to UCM (v2.8.2)
**Status: ✅ Complete**

All runtime LLM prompts now load from UCM-managed `.prompt.md` files, compliant with AGENTS.md String Usage Boundary ("All text that goes into LLM prompts must be managed in UCM, not hardcoded inline in code").

**Changes:**
- Monolithic-dynamic system prompts externalized from `buildPrompt()` to `loadAndRenderSection()` (branch: `feat/monolithic-dynamic-prompt-externalization`)
- Orchestrated search relevance mode instructions moved from inline code to prompt file sections (commit ef2def6)
- 4 provider-specific structured output sections added to `monolithic-dynamic.prompt.md`
- Bug fix: changed `## JSON OUTPUT REQUIREMENTS` sub-headings to `###` (level-2 headers were being parsed as separate sections)
- TypeScript prompt modules under `apps/web/src/lib/analyzer/prompts/` retained for `prompt-testing.ts` harness only
- 27 new CI-safe tests validating prompt file structure and content
- Documentation updated: `Docs/ARCHITECTURE/Prompt_Architecture.md`, xWiki Prompt Architecture, Pipeline Variants

**Impact:**
- Both orchestrated and monolithic-dynamic pipelines now load all prompts from UCM
- Prompts are admin-configurable via Admin UI without code changes
- `buildPrompt()` and related TS modules are no longer called from any production pipeline

### 2026-02-13 Report Quality Hardening (Phase 1 + Phase 2)
**Status: ✅ Implemented**

**Completed:**
- Added explicit zero-source warnings for source acquisition collapse patterns:
  - `no_successful_sources`
  - `source_acquisition_collapse` (when searches are high and successful sources remain zero)
- Added prompt hardening for qualifier preservation and direction-semantic interpretation:
  - `UNDERSTAND` and `SUPPLEMENTAL_CLAIMS`: preserve thesis-critical qualifiers
  - `VERDICT_DIRECTION_VALIDATION_BATCH_USER`: semantic interpretation rules + abstract examples
- Updated direction-validation model routing to verdict-tier selection for stronger entailment handling.

> **Earlier changelog entries** (v2.10.2 and prior) moved to [Current_Status_arch.md](../ARCHIVE/STATUS/Current_Status_arch.md).

**See**: [Complete version history with technical details](HISTORY.md)

---

## Performance Characteristics

**Typical Analysis Time:**
- Short text (1-2 claims): 30-60 seconds
- Medium article (5-10 claims): 2-5 minutes
- Long article (20+ claims): 5-15 minutes

**LLM API Calls:**
- Understanding: 1 call
- Research: 2-6 calls (per source, typically 4-8 sources)
- Verdict: 1-3 calls (depending on claim count)
- **Total**: Typically 10-20 calls per analysis

**Search Queries:**
- Typically 3-6 queries per analysis
- Fetches 4-8 sources total
- Parallel source fetching with 5-second timeout per source

**Cost Estimates** (varies by provider and model, standard API pricing):
- Short analysis: $0.10 - $0.50
- Medium analysis: $0.50 - $1.50
- Long analysis: $1.50 - $5.00
- Budget ceiling: ~$1.50/analysis (500K token cap)
- **With Batch API (50% off)**: Halve all estimates above
- See: [API Cost Reduction Strategy](../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

---

## Compliance Status

### AGENTS.md Rules

**Generic by Design**: ✅ Compliant
- Removed hardcoded domain-specific keywords
- Generic context detection and analysis
- Parameterized prompts

**Input Neutrality**: ✅ Compliant
- Question-to-statement normalization at entry
- <5% verdict divergence between formats
- Original format preserved for display only

**Pipeline Integrity**: ✅ Compliant
- All stages execute (Understand → Research → Verdict)
- Quality gates applied consistently
- No stage skipping

**Evidence Transparency**: ✅ Compliant
- All verdicts cite supporting facts
- Counter-evidence tracked and counted
- Source excerpts included

**Context Detection**: ✅ Compliant
- Multi-context detection working
- Distinct contexts analyzed independently
- Generic context terminology

---

## Getting Help

### Resources

- **Complete Issue List**: `Docs/STATUS/KNOWN_ISSUES.md` - All known bugs with workarounds
- **Development History**: `Docs/STATUS/HISTORY.md` - Full version history and architectural decisions
- **Documentation**: `Docs/` folder (organized by category)
- **Architecture**: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System%20Design/WebHome.xwiki`
- **Calculations**: `Docs/ARCHITECTURE/Calculations.md`
- **Getting Started**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Getting Started/WebHome.xwiki`
- **LLM Configuration**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Subsystems and Components/LLM Configuration/WebHome.xwiki`
- **Coding Guidelines**: `Docs/xwiki-pages/FactHarbor/Product Development/DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`

### Debugging

**Check Logs:**
- `apps/web/debug-analyzer.log` - Detailed analysis logs
- API console output - Job lifecycle events
- Browser DevTools - Frontend errors

**Test Configuration:**
- http://localhost:3000/admin/test-config - Validate API keys
- http://localhost:5000/swagger - Test API endpoints directly

### Common Issues

| Issue | Solution |
|-------|----------|
| Job stuck in QUEUED | Check `FH_INTERNAL_RUNNER_KEY` matches `Runner:RunnerKey` |
| Job fails immediately | Check LLM API key is valid |
| No progress updates | Check `FH_ADMIN_KEY` matches `Admin:Key` |
| API not starting | DB is auto-created on startup; check API console for DB errors, and (local dev) delete `apps/api/factharbor.db` to recreate |
| Search not working | Verify Web Search config is enabled in UCM (Admin → Config → Web Search) and the search API key is set |
| No sources fetched | Configure at least one enabled search provider (`SERPAPI_API_KEY`, `GOOGLE_CSE_API_KEY`+`GOOGLE_CSE_ID`, or `BRAVE_API_KEY`) or enable Wikipedia in UCM. See [LLM Configuration](../xwiki-pages/FactHarbor/Product%20Development/DevOps/Subsystems%20and%20Components/LLM%20Configuration/WebHome.xwiki) |

---

## POC Closure Statement (2026-02-19)

**The FactHarbor Proof of Concept is complete.** Tagged as `v1.0.0-poc`.

The POC set out to prove that AI can extract claims from arbitrary text, gather evidence from web sources, and produce structured, evidence-backed verdicts with quality controls. This has been demonstrated:

- **ClaimAssessmentBoundary pipeline** — 5-stage architecture (extract claims, research evidence, cluster boundaries, generate verdicts, aggregate assessment) fully operational
- **LLM debate pattern** — advocate/challenger/reconciliation for verdict quality
- **Quality gates** — Gate 1 (claim validation) + Gate 4 (confidence) enforced
- **Source reliability** — LLM-based evaluation with multi-model consensus and caching
- **Evidence quality filtering** — probative value, source authority, extraction confidence
- **Input neutrality** — question vs statement phrasing within ±4% tolerance
- **Multi-provider LLM** — Anthropic, OpenAI, Google, Mistral with tiered routing
- **UCM** — runtime-configurable parameters, no redeployment needed
- **1047 unit tests passing**, build clean, 2 pipeline variants operational

---

## What's Next — Alpha Phase

All remaining work is Alpha scope. See [Backlog](Backlog.md) for the full prioritized list.

**Alpha priorities:**
1. Close the **current post-fix validation gate** (controls + boundary coverage on commit `31aea55d`)
2. Fix the **jobs-list progress/verdict sync race** and any remaining post-refactor validation telemetry gaps
3. Re-prioritize the next workstream only after the control-quality and boundary-coverage checks are clean
4. Keep remaining optimization work isolated from the active quality track; if optimization is reopened, start with a fresh post-March-30 baseline and keep `P1-A` isolated
5. Continue Alpha hardening work from the canonical [Backlog](Backlog.md)

**See**:
- [ClaimBoundary Architecture](../ARCHIVE/ClaimBoundary_Pipeline_Architecture_2026-02-15.md) for implementation reference
- [Known Issues](KNOWN_ISSUES.md) for complete bug list
- [Backlog](Backlog.md) for prioritized task list

---

**Last Updated**: 2026-04-05
**Actual Version**: 2.11.0 (Code) | 3.0.0-cb (Schema) | `v1.0.0-poc` (Tag)
**Document Status**: Current Alpha snapshot. Historical sections below remain for context; current prioritization lives in the top status block and in [Backlog](Backlog.md).
