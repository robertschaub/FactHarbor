# FactHarbor backlog

Current contribution priorities, unresolved issues and operating holds. Engineering remains paused; rows describe work and decisions, not permission to run analyses, activate configuration or deploy. [Current status](Current_Status.md) gives the restart conditions. Closed experiments do not supply a reusable budget.

## Holds and required decisions

| Item | State and required next decision |
|---|---|
| MODEL-AB | STOPPED. Retain deployed allocation. No general model-quality, savings or production-switch conclusion is established. A new comparison needs its own reviewed scope, exact inputs, frozen provenance, budget and GO; preserve earlier stop ledgers separately. |
| EV-TARGET | OPEN. Evidence can be attributed to the wrong target/proceeding. Bounded applicability capture is implemented, offline tested and independently reviewed, default-off. It follows extraction, admission, applicability and scope normalization without changing analytical decisions. Separate enablement, window, retention and storage-capacity decisions precede observation; complete identity links do not imply that all captured text was retained. No prompt/filter change or paid rerun is implied. |
| DECOMP-RULES / Stage 5 | ON HOLD by Captain decision, 24 September 2026. The three-claim expectation stands; aggregation support must be reviewed and implemented together with any decomposition change before joint validation. Do not lower expected counts, raise caps or add an input-specific repair. The parked prompt is not the main/runtime prompt. |
| NARR-INPUT / ADJ-INPUT | PROPOSED, need Captain approval. Changes to narrative/adjudication inputs affect analysis and must be considered with the held Stage 5 work. |
| CLUSTER-CEIL | PROPOSED. Option C is a held prompt/schema change; its replay needs separate spending authority. Do not treat a stalled clustering call or a single-boundary fallback as solved. |
| C14-UNAVAILABLE | DECIDED: retain current count-floor/MT-5 eligibility and final validation. Do not implement the unselected skip for validator unavailability. |
| SR-EQA-BUDGET | OPEN, separate eligibility decision. Current request budget prevents EQA under the existing reservation guard. Cancellation work does not authorize a budget increase, lower reservation or eligibility change. |
| SR-TRANSLATE | Translation-result rejection is implemented and observed. Cap adequacy and prompt/term migration to UCM remain deferred; keep the existing cap and semantics pending approval. |
| SR-IDENTITY | OPEN. Generic identity/root-fallback design and matched-cache comparison remain preparation. Do not extend semantic keyword/suffix heuristics, invalidate caches or assume enabling EQA resolves entity identity. |
| SR-ENTITY-CLEAR | IMPLEMENTED, offline verified. A valid refinement null clears the primary entity. This does not repair historical scores, cached results or the wider identity defect. |
| SR-TIMEOUT | IMPLEMENTED LOCALLY, offline/component/startup checks passed. Keep existing budgets, eligibility, retries, scoring and TTLs. Provider-side cancellation/billing, savings and production deployment are not established by those checks. |
| LLM-300S | OPEN. Non-streaming analyzer calls can exceed the response-header timeout; retries can incur charges even when recorded token counts are zero. Candidate activation requires bounded output policies and focused verification. No timeout/retry or model change is authorized here. |
| CANCEL-ABORT | OPEN. Cancelling a job does not yet abort an in-flight model request; provider spending may continue until the next checkpoint. Terminal-status fixes do not establish immediate provider cancellation. |
| RUNNER-PROD | Deployment evidence gap. The 23 September terminal-status fixes were verified locally, but the record did not establish production deployment. Verify the deployed revision before relying on the fix; a documentation deployment does not deploy the runner or activate prompt/model policy. |
| HYDRO-C4A | PROPOSED, awaiting Captain decision. A Stage-1 single-claim classification tail can leave the approved hydrogen family structurally incomplete. The generic expected-evidence-profile proposal needs separate approval and verification; do not lower the benchmark's decomposition requirements. |
| F35-FOLLOWUP | DEFERRED while paused. Further review and deployment decisions remain open; no repeated wording experiment or paid validation is authorized. |
| F2-PROD / PROD-PINS | Before any authorized paid validation, check actual active prompt and search-configuration versions. Admin-owned blobs do not automatically follow source. Reseeding is an authorized operator action. |
| OPT-GATE | DEFERRED. Optimization reopening needs explicit approval and a fresh runtime/cost baseline. |

No documentation edit authorizes the above behavior changes. Preserve ignored evidence and database backups. Cleanup requires independently backed-up, restorable evidence and separate scope.

## Quality and measurement

| Item | Current public contract or remaining work |
|---|---|
| QCODE-ANNOT | OPEN, Captain decision needed. Some multi-branch families cannot satisfy both current Q-S1.1 and Q-S1.3 annotations. Judge those results manually or by their approved bands until resolved; do not silently change the benchmark. |
| REF-ALIGN | GATED. Dossier-backed C1/C3 remain diagnostic-only until manual/judge agreement is at least 85% on every axis. Kappa applies only with at least 30 adjudicable units per axis and a non-degenerate distribution: target 0.70 or higher, below 0.60 is no-go. Adjudication and any paid judge run need their own scope. |
| NEUTRALITY-1 | VALIDATION. Cross-language divergence remains open. EN supplementary retrieval stays default-off until the [promotion gate](../ARCHITECTURE/Multilingual_Language_Handling.md#5-validation-state-and-promotion-gate) passes. |
| NEUTRALITY-PAIRS | OPEN, Captain-defined exact question/statement pairs needed. Framing symmetry is not a replacement for the required input-neutrality check. Do not synthesize test inputs. |
| GATE-INTERLEAVE | Standing comparison rule: interleave approved A/B arms while keeping comparator jobs isolated. Record cache carryover and evidence-pool differences; weak overlap is not evidence of a meaningful pass. |
| S5-TRANSPORT | OPEN. Bounded transport observations do not establish general reliability or model superiority. Separate schema failures, semantic failures, retries and missing telemetry. |
| GROUND-REJ | OPEN. Grounding diagnostics can misclassify rejected challenge citations. Keep the current disabled enforcement policy until separately corrected and verified. |
| RECON-SPREAD | OPEN. Measure suspected truth changes for confidence spread or out-of-scope reasoning before changing prompts; do not disable consistency assessment to hide disagreement. |
| ANCHOR-SUBSTR / LLMINT-2 | OPEN. Residual deterministic semantic judgments require review under root AGENTS.md. Aggregation changes remain subject to the Stage 5 hold. |
| F2-CENSUS | OPEN. Repair efficacy at volume is unmeasured; a successful individual firing is not population evidence. |
| UPQ-1 | OPEN-DEFERRED. Boundary-concentration behavior work remains gated by retrieval-language and evidence-sufficiency work plus stage isolation. |
| DIR-1 / GRND-1 / NARR-1 / QLT-1 / QLT-3 | MONITOR. Prior fixes and bounded observations do not establish general closure. |
| DIR-2 / STG1-DECOMP | OPEN. Preserve honest MIXED-versus-UNVERIFIED semantics and investigate decomposition instability without input-specific patches. |
| ERA-COMPARE / V1-RECOVER / MULTI-VARIANT | Paused or deferred. Historical comparison/porting needs its own source review, working environment and approved inputs; no wholesale port or new variant is authorized. |
| C9 / C13 / C17 | Open research/evaluation concerns. [Calibration policy](Calibration_Baseline_v1.md) preserves the applicable historical-baseline and promotion constraints; no new run is authorized. |

The exact eight scored families, controls, bands and comparator distinctions remain in [Captain Quality Expectations](../AGENTS/Captain_Quality_Expectations.md) and the consumed JSON/Reference_Dossiers contracts. All four [prompt issue identities](../AGENTS/Prompt_Issue_Register.md) remain open/unconfirmed. Build or documentation checks do not close them.

## Operating and contributor work

| Item | State |
|---|---|
| SEC-ADMIN-SR | OPEN: review the source-reliability page's admin-gate exemption. |
| SEC-INVITE | DECLINED on 10 August 2026; gap remains documented. Reopen on evidence of probing or before open signup. |
| OPS-MONITOR | DEFERRED on 10 August 2026; manual checks are the accepted interim control. Revisit when exposure changes. |
| CI-DOTNET | OPEN coverage gap: extend beyond job-status tests to auth, invite quotas, rate limiting and runner integration when assigned. |
| PROMPTFOO-GUARD | OPEN: provider-calling evaluations require spending controls. Listing/viewing results is separate from running evaluations. |
| HOOK-FP | OPEN: safety-hook false positives need a bounded correction that preserves destructive-command protection. |
| SCRIPT-PATHS | OPEN: remove machine-specific assumptions from diagnostic helpers when assigned. |
| SEARCH-2 | OPEN: the documented zero throttle value is not honored. Cancellation improvements did not change spacing semantics. |
| SR-MAP-STALE | OPEN: process-local source scores/failures can outlive intended cache validity. An accepted pilot constraint does not close the product defect. |
| COST-EXPLQUAL | OPEN: decide how unused explanation-quality output should be handled; no configuration change is implied. |
| PROMPT-ARCH-1 | OPEN: prompt loading, admin editability and provenance need consistent ownership. Do not assume every prompt-like string is controlled by a UCM file. |
| TELEM-UI / TELEM-D5PIPE / TELEM-EVID | Deferred/scoped observability work. Metrics-only claims must remain distinguishable from analysis changes and new data collection. |
| OSS-LICENCE | Verify path coverage and distribution notices for each release, including packaged artifacts. |
| OSS-MATURITY / OSS-CURATION | Keep current behavior, proposals and historical observations distinguishable; preserve self-contained public contribution and documentation paths. |
| EGA-LINK | Proposed integration only, separately activated and funded. See the [public project overview](https://github.com/robertschaub/our-ai-charter/blob/main/docs/Assurance/Concepts/evidence-gated-agents.md). No production or live-analysis authority follows. |

For other reported limitations, use [Known issues](KNOWN_ISSUES.md). A new public task should record the concrete symptom, current source, authority, proposed change and focused verification, without copying unrelated investigation history.
