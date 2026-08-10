# Current Status — Historical Changelog Archive

**Archived**: 2026-02-19 (v2.10.2 and earlier), 2026-08-10 (2026-02-13 → 2026-04-15)
**Source**: Extracted from `Docs/STATUS/Current_Status.md` in two waves; each wave is headed with its own provenance note below.
**Why archived**: These entries document completed work and historical implementation details. The active current-state sections remain in `Current_Status.md`. For the full version history, see `Docs/STATUS/HISTORY.md`.

Newest wave first: the 2026-08-10 extraction precedes the original 2026-02-19 extraction.

---

## Moved from Current_Status.md — 2026-08-10

**Source**: `Docs/STATUS/Current_Status.md` at commit `89b45abd`.
**Why archived**: dated changelog sections for 2026-02-13 through 2026-04-15, plus completion records and task lists that described code since deleted (`orchestrated.ts`, Monolithic Canonical/Dynamic, the Jan-2026 analyzer-monolith task list). Superseded by the consolidated 2026-04-15 → 2026-08-10 section in `Current_Status.md`.

### Dated changelog, 2026-02-22 → 2026-04-15 (incl. CB Pipeline v1.0 completion record)

## Recent Changes (2026-04-15)

**Stage-1 anchor-preservation hardening shipped (`9a79bc91`):**
- ✅ **Prompt/runtime contract drift narrowed**: `claimboundary.prompt.md` now includes the corrected prompt frontmatter, thesis-direct anchor-carrier wording, binding-appendix fallback/tiebreak rules, finality/binding-effect salience wording, and a concrete chronology anti-inference example.
- ✅ **Stage-1 pruning shipped**: after a contract-approved set survives, fidelity-failed non-anchor extras are pruned when a clean thesis-direct anchor carrier already exists.
- ✅ **Focused Stage-1 tests were refreshed**: prompt-contract, claim-contract-validation, claimboundary-pipeline, and prompt frontmatter drift tests now cover the shipped slice.
- ✅ **Fresh treaty reports confirm the intended effect**: on the fixed prompt hash, the two Bundesrat canaries now collapse to a single accepted anchor-carrying claim instead of the earlier inflated 3-claim sets.
- ⚠️ **Observability gap remains**: persisted `gate1Stats.filteredCount` still does not fully expose the pruning event.

**Anthropic budget-model alias fix shipped (`c7a5ed78`):**
- ✅ **Valid Haiku model ID restored**: Anthropic `budget` now resolves to the pinned release `claude-haiku-4-5-20251001` instead of the non-existent `claude-haiku-4-5-latest` alias.

---

## Recent Changes (2026-04-14)

**Phase 7b binding-mode groundwork shipped (`f48af7bf`, `4adf6f17`, `d8bce23d`):**
- ✅ **Audit-vs-binding mode separation/persistence groundwork**: salience mode wiring and tests now distinguish the bounded Shape B path more explicitly.
- ✅ **Binding anchors now reach Pass 2 and contract audit**: the precommitted anchor inventory is available in binding mode rather than remaining purely an audit artifact.
- ✅ **Audit-mode regression gap closed**: focused tests now guard against accidental loading of binding behavior into audit mode.

**Contract repair pass restored (`97fb7141`):**
- ✅ **`CLAIM_CONTRACT_REPAIR` is live again**: prompt section, render variables, and focused tests now support the narrow repair path instead of silently skipping it.
- ✅ **Prompt runtime surface improved**: the repair prompt is again part of the managed prompt system rather than a dead path in the current stack.

---

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

**Design document:** [ClaimBoundary_Pipeline_Architecture_2026-02-15.md](../ClaimBoundary_Pipeline_Architecture_2026-02-15.md)
**Execution tracking:** [CB_Execution_State.md](../CB_Execution_State.md)

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

### Historical "What Works" blocks (2026-02-12/13)

**API Cost Optimization (2026-02-13):**
- ✅ **Budget defaults reduced**: `maxIterationsPerContext` 5→3, `maxTotalIterations` 20→10, `maxTotalTokens` 750K→500K
- ✅ **Context detection tightened**: `contextDetectionMaxContexts` 5→3, `contextDedupThreshold` 0.85→0.70
- ✅ **Expensive tests excluded from `npm test`**: 4 LLM integration tests now require explicit `test:expensive` script
- ✅ **Cost reduction strategy documented**: Batch API, prompt caching, NPO/OSS programs researched
- See: [API Cost Reduction Strategy](../../WIP/API_Cost_Reduction_Strategy_2026-02-13.md)

**Report Quality Hardening (2026-02-13):**
- ✅ **Zero-Source Warning Coverage**: Added `no_successful_sources` and `source_acquisition_collapse` for source-acquisition failures
- ✅ **Direction Semantics Prompt Hardening**: Added qualifier-preservation and semantic-interpretation guardrails in orchestrated prompts
- ✅ **Direction Validation Tier Update**: Direction validation now routes through verdict-tier model selection

**Phase 2 Quality Improvements (v2.6.41):**
- **Evidence Quality Filtering**: Two-layer enforcement (prompts + deterministic filter) for probative value
  - See: [Evidence Quality Filtering Architecture](../../ARCHITECTURE/Evidence_Quality_Filtering.md)
- **probativeValue Field**: Quality assessment (high/medium/low) with admin-configurable weights
- **SourceType Classification**: 9 source types with reliability calibration factors
- **Schema Backward Compatibility**: Optional fields + deprecated aliases for smooth migration
  - See: [Schema Migration Strategy](../../xwiki-pages/FactHarbor/Product Development/Specification/Implementation/Schema%20Migration%20Strategy/WebHome.xwiki)
- **Provider-Specific Prompts**: Optimized formatting for Anthropic, OpenAI, Google, Mistral
  - See: [Provider Prompt Formatting](../../xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt%20Engineering/Provider-Specific%20Formatting/WebHome.xwiki)

**LLM Text Analysis Pipeline (v2.9+):**
- **Four Analysis Points**: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
- **LLM-Only Contract**: All analysis points are always LLM-driven (no hybrid/heuristic fallback)
- **Multi-Pipeline Support**: Works across ClaimAssessmentBoundary and Monolithic Dynamic pipelines
- **Telemetry**: Built-in metrics for success rates, latency
- **Bug Fix (v2.8.1)**: Counter-claim detection removed from verdict prompt (was overriding better understand-phase detection)
- **Prompt Files**: Located in `apps/web/prompts/text-analysis/` with README documentation
- - See: [LLM Text Analysis Pipeline Deep Analysis](../LLM_Text_Analysis_Pipeline_Deep_Analysis.md)
- - See: [LLM Classification System Architecture](../../ARCHITECTURE/LLM_Classification_System.md)

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
- Plan reference removed: the source plan file no longer exists.

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

### Open Topics / Task List (Jan 2026)

Retired: written against `apps/web/src/lib/analyzer.ts` (deleted with the Orchestrated pipeline) and uses pre-CB "Context" terminology.

### Open Topics / Task List (Jan 2026)

- [ ] **Inverse-input symmetry hardening**: Keep `scripts/inverse-scope-regression.ps1` green; add 2-3 more inverse pairs and explicitly define which pairs require *strict* context symmetry vs *best-effort* symmetry (to avoid overfitting to a single example).
- [ ] **Evidence-driven context refinement guardrails**: Add lightweight metrics/logging so we can tell how often context refinement is applied vs rejected, and why (avoid over-splitting into “dimensions” that are not bounded contexts).
- [ ] **Central-claim evidence coverage**: When a central claim has zero supporting/counter facts, do a bounded “missing-evidence” retrieval pass per claim (best-effort; must respect search limits and avoid infinite loops).
- [ ] **Context guidelines**: Document (in a short developer note) what qualifies as a distinct “Context” vs a “dimension” so future prompt tweaks remain consistent with `AGENTS.md`.
- [ ] **Analyzer modularization (defer unless needed)**: `apps/web/src/lib/analyzer.ts` is still monolithic; any split should be planned and done incrementally to minimize risk.

### Recent Test Results (v2.6.23/v2.6.24)

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

### Dated changelog, 2026-02-13 → 2026-02-20

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

**See:** [Calibration_Harness_Design_2026-02-20.md](../Calibration_Harness_Design_2026-02-20.md)

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

**Open items:** `maxOutputTokens` ceiling; schema unification with CB; prompt framing for sensitive content (needs Captain approval). See [Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md](../Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md).

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
- Full acceptance criteria: [Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md](../Lead_Developer_Companion_Claim_Fidelity_2026-02-18.md)

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

**See:** [ClaimBoundary Architecture](../ClaimBoundary_Pipeline_Architecture_2026-02-15.md), [Execution State](../CB_Execution_State.md)

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

---


### v2.10.2 Prompt Optimization v2.8.0-2.8.1 Complete (February 4, 2026)
**Status: ✅ APPROVED** - All phases complete, Lead Dev review passed

**Goal**: Make prompts leaner and more precise without losing effectiveness (~30% token reduction).

**✅ Key Achievements:**

1. **Format-Only Provider Variants**
   - Anthropic variant reduced by ~52% (220 → 84 lines)
   - Removed concept re-explanations, kept only formatting guidance
   - Rating direction guidance retained (explicitly exempted)

2. **Generic Examples Policy**
   - All domain-specific examples replaced with abstract placeholders
   - Uses "Institution A/B", "Technology A/B", "Region X" patterns
   - No test-case terms in prompts

3. **Terminology Clarity**
   - AnalysisContext vs EvidenceScope clearly distinguished
   - Backward compatibility maintained

4. **Multi-Phase Implementation**
   - Phase 1: Low-risk token reduction (15-20%)
   - Phase 2: Validated changes (+5-10%)
   - Phase 3: Provider variant pilot (~10-15%)

**📝 Files Modified:**
- `apps/web/src/lib/analyzer/prompts/base/*.ts` - Base prompts
- `apps/web/src/lib/analyzer/prompts/providers/*.ts` - Provider variants
- Documentation updated

**🗂️ Archived Review Documents:**
- [Prompt_Optimization_Code_Review.md](../REVIEWS/Prompt_Optimization_Code_Review.md)
- [Prompt_Optimization_Architecture_Review.md](../REVIEWS/Prompt_Optimization_Architecture_Review.md)

See: [Prompt Optimization Summary](../Prompt_Optimization_Investigation.md)

---

### v2.10.0 UCM Pre-Validation Sprint Complete (January 31, 2026)
**Status: ✅ 100% Complete** - All 6 Low-Hanging Fruits implemented

**Goal**: Ship professional UX and operational tools BEFORE validation period to enable better debugging and system understanding.

**✅ New Admin Features:**

1. **Toast Notifications** (Day 1.1)
   - Replaced all 22 `alert()` calls with professional `react-hot-toast` notifications
   - Non-blocking, auto-dismiss, color-coded by type (success/error/info)
   - Files: `layout.tsx`, `admin/config/page.tsx`, `admin/source-reliability/page.tsx`

2. **Export All Configs** (Day 1.2)
   - New API: `GET /api/admin/config/export-all`
   - Complete backup of all active configurations as JSON
   - UI button on admin dashboard with loading state
   - Timestamped filename: `factharbor-config-backup-YYYY-MM-DD.json`

3. **Active Config Dashboard** (Day 2)
   - New API: `GET /api/admin/config/active-summary`
   - Visual overview on `/admin/config` showing all active configs
   - Color-coded cards by config type with version labels and timestamps
   - Immediate system state visibility

4. **Config Diff View** (Day 3-4)
   - New API: `GET /api/admin/config/diff?hash1=&hash2=`
   - Checkbox selection in history tab to compare any 2 versions
   - JSON configs: Field-by-field diff with color-coded changes
   - Prompts: Side-by-side text comparison
   - Helps understand impact of config changes

5. **Default Value Indicators** (Day 5.1)
   - New API: `GET /api/admin/config/default-comparison?type=&profile=`
   - Shows which fields are customized vs using defaults
   - Green banner = defaults, Yellow banner = customized (with count/percentage)
   - Expandable list of customized field paths

6. **Config Search by Hash** (Day 5.2)
   - New API: `GET /api/admin/config/search-hash?q=`
   - Search input at top of config page
   - Find configs by full or partial hash (min 4 chars)
   - Click-to-navigate to any found version
   - Essential for debugging job reports

**✅ Technical Details:**
- 5 new API endpoints (all read-only GET)
- TypeScript compilation clean
- No changes to core analysis/report logic
- All changes isolated to admin UI

**📝 Documentation Updated:**
- UCM Enhancement Recommendations - Sprint completion documented
- Unified Config Management User Guide - New Section 7 added

**🎯 Next Step:** Proceed to Phase 0 Validation with complete operational toolkit.

---

### 2026-02-02: UCM Terminology Cleanup + Phase 2 Complete

**Major Implementation:** Unified Config Management terminology and save-to-file functionality

- ✅ File-backed defaults for all 6 config types (pipeline, search, calc, SR, lexicons)
- ✅ Schema versioning with validation and fallback
- ✅ Concurrency warnings with updatedBy tracking (from earlier Alpha work)
- ✅ Bidirectional sync (Save-to-file) with environment gating
- ✅ Drift detection endpoint (GET /api/admin/config/:type/drift)
- ✅ Health check config validation (status: degraded on invalid config)
- ✅ Terminology cleanup (Context vs EvidenceScope) complete throughout codebase
- ✅ Monolithic pipeline timeouts now configurable via UCM
- 🐛 Fixed: Aggregation-lexicon keywords refined (completed in previous work)

**Breaking Changes:**
- `LLM_PROVIDER` env variable deprecated (use UCM `pipeline.llmProvider`)
- `.env.example` updated to remove deprecated vars

**Recent Commits (2026-01-30 to 2026-02-02):**
1. `ucm: make monolithic pipeline timeouts configurable`
2. `ucm: add drift detection and health config validation`
3. `docs: update UCM response plan status`
4. `ucm: implement save-to-file functionality (Phase 2)`
5. `docs: add Phase 2 save-to-file implementation guide`

**Implementation Time:** ~4 days (Terminology + Phase 2)

**Deferred to Beta:**
- Optimistic locking (full solution)
- Detailed diff views in admin UI
- Automatic schema migration
- Audit logging with full history

---

### v2.9.0 Unified Configuration Management - Phase 1 In Progress (January 30, 2026)
**Status: ✅ 100% Complete** - All 4 phases complete (settings + snapshots + SR modularity + admin UI)

**✅ What's Complete:**
- **Extended Config Types**: Added Pipeline and Source Reliability (SR) config types to unified config system
  - `pipeline` config: Model selection, LLM tiering, analysis behavior, budget controls
  - `sr` config: Source reliability settings with modularity for future standalone extraction
  - Admin UI forms for both config types with full CRUD support
- **Prompt Import/Export/Reseed APIs**: Complete workflow for prompt management
  - `POST /api/admin/config/prompt/:profile/import` - Upload .prompt.md files with validation
  - `GET /api/admin/config/prompt/:profile/export` - Download prompts with metadata
  - `POST /api/admin/config/prompt/:profile/reseed` - Re-seed from disk for dev workflow
  - Text-analysis profiles now supported: `text-analysis-input`, `text-analysis-evidence`, `text-analysis-context`, `text-analysis-verdict`
- **Comprehensive Test Coverage**: 158 unit tests for config system (A+ grade)
  - `config-schemas.test.ts`: 50 tests for validation, parsing, canonicalization
  - `config-storage.test.ts`: 26 tests for CRUD, caching, env overrides
  - `source-reliability-config.test.ts`: 32 tests for SR scoring and caps
  - `budgets.test.ts`: 22 tests for iteration and token budget tracking
  - `evaluator-logic.test.ts`: 28 tests for source evaluation logic
- **Bug Fixes**:
  - Fixed `SOURCE_TYPE_EXPECTED_CAPS` constant naming (was `SOURCE_TYPE_CAPS`)
  - Fixed `getBudgetConfig()` to respect `DEFAULT_BUDGET.enforceHard` when env var unset
  - Fixed budget test to use explicit values since defaults changed in v2.8.2

**✅ Phase 1: High-Value Settings Migration (Complete)**
- **Updated Analyzer Modules** to accept `PipelineConfig`:
  - `budgets.ts`: `getBudgetConfig()` - budget limits (4 settings)
  - `config.ts`: `getAnalyzerConfigValues()` - analysis behavior (4 settings)
  - `llm.ts`: `getModelForTask()` - model selection (3 settings)
  - `model-tiering.ts`: Updated tiering check (1 setting)
  - `metrics-integration.ts`: `initializeMetrics()` - metrics config (reuses settings)
  - `text-analysis-service.ts`: Feature flag configuration
- **Main Pipeline Integration**: `orchestrated.ts` fully threaded with config hot-reload
  - Calls `getAnalyzerConfig()` to load DB → defaults (UCM is source of truth)
  - Passes `pipelineConfig` through entire call chain (11 functions updated)
  - TypeScript compilation: ✅ No errors
- **Migration Complete for High-Value Settings**: 13 unique settings now hot-reloadable
  - Model: `llmTiering`, `modelUnderstand`, `modelExtractEvidence`, `modelVerdict`
  - LLM Flags: `llmInputClassification`, `llmEvidenceQuality`, `llmContextSimilarity` (legacy: `llmScopeSimilarity`), `llmVerdictValidation`
  - Budgets: `maxIterationsPerContext` (legacy: `maxIterationsPerScope`), `maxTotalIterations`, `maxTotalTokens`, `enforceBudgets`
  - Analysis: `analysisMode`, `deterministic`, `allowModelKnowledge`, `contextDedupThreshold` (legacy: `scopeDedupThreshold`)
- **Code Review & Regression Fixes**:
  - Preserved legacy key aliases for backward compatibility (`scope*` → `context*`)
  - Reverted default value changes to maintain backwards compatibility
  - Fixed missing report model fallback in `llm.ts`
  - Added schema documentation for `maxTokensPerCall` exclusion
- **Migration Pattern**: Functions accept optional config param; env fallbacks removed for analysis settings

**✅ Phase 2: Job Config Snapshots (Complete)**
- **Database Schema**: `job_config_snapshots` table stores full resolved configs per job
  - Migration: `003_add_job_config_snapshots.sql`
  - Stores PipelineConfig and SearchConfig as JSON blobs
  - Stores SR summary fields (maintains modularity per review Rec #22)
  - Indexed by job_id for fast lookups
- **Config Snapshots Module**: `config-snapshots.ts` with capture/retrieval API
  - `captureConfigSnapshot()`: Persist complete config for a job
  - `captureConfigSnapshotAsync()`: Non-blocking background capture
  - `getConfigSnapshot()`: Retrieve snapshot by job_id
  - `formatSnapshotForDisplay()`: Format for admin UI display
- **Analyzer Integration**: Snapshots captured at analysis start
  - Loads both PipelineConfig and SearchConfig
  - Captures SR summary (enabled/score/threshold)
  - Async capture (non-blocking), awaited before return
  - Handles optional jobId gracefully (no-op if undefined)
- **Success Metric Achieved**: ✅ Can view complete config that produced any job

**✅ Phase 3: SR Modularity Interface (Complete)**
- **SR Service Interface**: Clean contract between analyzer and SR system
  - `ISRService` interface with 6 core methods
  - `SRConfigReadOnly` for read-only config access
  - `SREvaluation`, `SRPrefetchResult` types
- **Default Implementation**: `SRServiceImpl` wraps existing SR module
  - Factory function: `createSRService(options?)`
  - Singleton: `getDefaultSRService()`, `setDefaultSRService()`
  - DI support for testing: `resetDefaultSRService()`
- **Analyzer Integration**: Uses SR service for prefetch operations
  - `orchestrated.ts` updated to use `srService.prefetch(urls)`
  - Backwards compatible: `getTrackRecordScore()` still works
  - Clear separation enables future SR extraction
- **Success Metric Achieved**: ✅ SR can be extracted without breaking FactHarbor

**✅ Phase 4: Admin UI Polish (Complete)**
- **Job Config Snapshot Viewer**: `/admin/quality/job/[jobId]`
  - Displays complete resolved config (pipeline + search + SR summary)
  - Shows metadata (captured time, analyzer version, schema version)
  - Markdown export for documentation
  - API: `GET /api/admin/quality/job/[jobId]/config`
- **Config Validation Warnings**: Detects dangerous config combinations
  - 7 pipeline warnings (deep mode budget, tiering, context dedup, etc.)
  - 5 search warnings (disabled search, low limits, timeouts, etc.)
  - 2 cross-config warnings (deep mode with few results, etc.)
  - API: `GET /api/admin/config/warnings`
  - Severity levels: danger/warning/info
- **Admin Page Reorganization**: Separated FactHarbor Quality vs SR sections
  - Clear visual hierarchy for admin tasks
  - Job Audit & Debugging section with snapshot viewer
- **Success Metric Achieved**: ✅ Can view complete config via admin UI + dangerous configs warned

**🟡 Remaining Env Vars (65 reads):**
- **26 refs**: Already migrated settings (env fallbacks for backwards compatibility)
- **11 refs**: SR config now behind interface (extractable)
- **14 refs**: Low-level tuning parameters (timeouts, thresholds) - should remain env vars
- **8 refs**: Debug/AB testing - low priority
- **6 refs**: Legacy monolithic pipelines - low priority

**🎯 All Phase Success Metrics Achieved:**
1. ✅ Settings change without restart (Phase 1)
2. ✅ Can view complete config for any job (Phase 2)
3. ✅ SR extractable without breaking FactHarbor (Phase 3)
4. ✅ Admin UI with snapshot viewer and validation warnings (Phase 4)

**📝 Optional Future Enhancements:**
- Integration test demonstrating end-to-end hot-reload (~1 day)
- Additional admin UI features (config comparison, rollback UI, etc.)

See: [Implementation Review](../REVIEWS/Unified_Configuration_Management_Implementation_Review.md)

---

### v2.8.0 LLM Text Analysis Pipeline (January 29-30, 2026)
- **LLM Text Analysis Pipeline**: Approved for implementation after senior architect review
  - 4 analysis points: Input Classification, Evidence Quality, Context Similarity, Verdict Validation
  - ITextAnalysisService interface with HeuristicTextAnalysisService, LLMTextAnalysisService, HybridTextAnalysisService
  - Per-analysis-point feature flags for gradual rollout
  - Multi-pipeline support (Orchestrated, Dynamic) — Canonical was later removed in v2.10.x
  - Cost estimate: $0.007-0.028/job (~5.3% increase with Haiku)
- **Search Provider Documentation**: Clarified that all pipelines require search credentials
  - Added Section 8 to Pipeline Architecture doc
  - Added troubleshooting for "No sources fetched" issue

### v2.8.3 LLM-Only Text Analysis (January 30, 2026)
- **Contract Updated**: Text analysis is LLM-only for all 4 analysis points (no heuristic fallback)
- **Prompt-Code Alignment Complete**: All prompts now contain exact patterns from heuristic code
  - `text-analysis-evidence.prompt.md` v1.2.0: Complete vague phrases list
  - `text-analysis-verdict.prompt.md` v1.2.0: Inversion patterns, extended evidence keywords
- **Database Reseeded**: Updated prompts active for analysis

### v2.8.1 Bug Fix & File Reorganization (January 30, 2026)
- **Critical Bug Fix**: Counter-claim detection removed from verdict validation
  - **Issue**: LLM text analysis produced worse results than heuristics alone
  - **Root Cause**: Verdict prompt detected counter-claims with insufficient context, overriding better understand-phase detection
  - **Impact**: False counter-claim detection caused incorrect verdict inversions (85% → 15%)
  - **Fix**: Removed `isCounterClaim` and `polarity` from verdict prompt (v1.0.0 → v1.1.0)
- **Prompt File Reorganization**
  - Moved text-analysis prompts to `prompts/text-analysis/` subfolder
  - Added `getPromptFilePath()` helper to `config-storage.ts`
  - Created `prompts/text-analysis/README.md` documentation
- **Database Reseeded**: All 4 text-analysis prompts reseeded with new file locations

### v2.6.41 (January 27-28, 2026)
- **Unified Configuration Management**: Complete config system with database-backed version control
  - Three-table design: `config_blobs` (immutable versions), `config_active` (activation pointers), `config_usage` (per-job tracking)
  - Configuration types: search, calculation, prompt
  - Admin UI at `/admin/config` with edit, history, effective, and export tabs
  - Schema validation with Zod, version history, one-click rollback
  - Export/import with deep linking from job reports
- **Prompt Unification**: Migrated prompts from file-based system to Unified Config Management
  - Prompts now stored in `config_blobs` with `type='prompt'`
  - Deleted legacy `/admin/prompts` page and `/api/admin/prompts/*` routes
  - Deleted `prompt-storage.ts` and associated database tables
  - Updated analyzers to use `recordConfigUsage()` instead of legacy functions
- **Bug Fixes**:
  - Fixed race condition when switching config types on edit tab
  - Fixed import validation to check JSON structure matches config type

### v2.6.40 (January 26, 2026)
- **Context/EvidenceScope Terminology Fix**: Fixed inline prompts using wrong terminology
  - `assessedStatement` now passed correctly to verdict phase
  - Renamed "SCOPE" to "CONTEXT" in ~10 inline prompt locations

### v2.6.39 (January 26, 2026)
- **Assessed Statement Feature**: Added `assessedStatement` field to AnalysisContext
  - Displays what specific statement is being evaluated in each context card
  - Improves clarity for multi-context analyses

### v2.6.38 (January 26, 2026)
- **Context Overlap Detection Improvements**: Refined LLM-driven context detection
  - **Temporal Guidance Clarification**: Fixed contradiction between "incidental temporal mentions" (don't split) vs "time period as primary subject" (do split)
  - **Context Count Warning**: Added logging when 5+ contexts detected (may indicate over-splitting)
  - **Claim Assignment Validation**: Catches claims assigned to non-existent contexts (orphaned claims unassigned for fallback handling)
  - **UI Reliability Field**: Added `articleVerdictReliability` ("high" | "low") to signal when overall average is meaningful
  - **UI Improvements**:
    - De-emphasize overall average when reliability is low (60% opacity, "(avg)" label)
    - Explanatory note: "ℹ️ This average may not be meaningful because contexts answer different questions"
    - Emphasize individual context verdicts section (⭐ header, increased font weight)
  - **Documentation**: Updated `Calculations.md` with "When is the Overall Average Meaningful?" section
  - **Architecture Decision**: Simple averaging + transparency approved (see Opus review in agent transcripts)

### v2.6.37 (January 24, 2026)
- **Entity-Level Source Evaluation**: Prioritize organization reputation (e.g., SRF, BBC) over domain-only metrics
  - **Entity-Level Evaluation**: New rule to evaluate the WHOLE ORGANIZATION if the domain is its primary outlet
  - **Consensus Confidence Boost**: +15% confidence when independent models (Claude + GPT-5 mini) agree
  - **Fallback Logic**: Always return a result (more confident model) even if consensus fails
  - **Adaptive Evidence Pack**: Added entity-focused queries and better abbreviation detection
  - **UI Updates**: Display `identifiedEntity` name and fallback reasons in Admin UI

### v2.6.36 (January 24, 2026)
- **Source Reliability Evaluation Hardening**: Major improvements for propaganda/misinformation scoring
  - **SOURCE TYPE SCORE CAPS**: Deterministic enforcement (`propaganda_outlet` → ≤14%, `state_controlled_media` → ≤42%)
  - **Adaptive Evidence Queries**: Negative-signal queries (`propaganda`, `disinformation`) added when results sparse
  - **Brand Variant Matching**: Handles `anti-spiegel` ↔ `antispiegel`, suffix stripping (`foxnews` → `fox news`)
  - **Asymmetric Confidence Gating**: High scores require higher confidence (skeptical default)
  - **Unified Thresholds**: Admin + pipeline + evaluator share same defaults (0.8 confidence)
  - **AGENTS.md Compliance**: Abstract examples only (no real domain names in prompts)
- **New Shared Config**: `apps/web/src/lib/source-reliability-config.ts` centralizes SR settings
- **46+ new tests** for scoring calibration, brand variants, and caps enforcement

### v2.6.35 (January 24, 2026)
- **Source Reliability Prompt Improvements**: Comprehensive LLM prompt enhancements
  - Quantified thresholds for insufficient data, confidence scoring, and negative evidence caps
  - Mechanistic confidence formula (base 0.40 + additive factors)
  - Evidence quality hierarchy and recency weighting
  - Expected: ~25% improvement in insufficient data detection, 50% reduction in confidence variance
- **Schema Cleanup**: Removed unused `dimensionScores` field (YAGNI - never integrated)
- **Documentation**: New `Source_Reliability_Prompt_Improvements.md`, updated main SR docs to v1.1

### v2.6.34 (January 2026)
- **Source Reliability Service Implemented**: Full LLM-powered source evaluation with multi-model consensus
  - Batch prefetch + sync lookup pattern for pipeline integration
  - SQLite cache with 90-day TTL
  - Evidence weighting affects verdict calculations
  - Admin interface for cache management
  - 90 tests covering all functionality (42 unit + 16 cache + 13 integration + 19 API logic)
- Documentation updates: Merged proposal into main docs, archived historical documents

### v2.6.33 (January 2026)
- Fixed counter-claim detection - thesis-aligned claims no longer flagged as counter
- Auto-detect foreign response claims as tangential for legal proceeding theses
- Contested claims WITH factual counter-evidence get reduced weight in aggregation

### v2.6.32 (January 2026)
- **Multi-context verdict fallback fixed**: Recovery from NoObjectGeneratedError
- Debug log path resolution fixed
- Terminology consistency: ArticleFrame, AnalysisContext, EvidenceScope

### v2.6.30-31 (January 2026)
- Complete input neutrality implementation
- Removed detectedInputType override
- Modularized debug and config modules
