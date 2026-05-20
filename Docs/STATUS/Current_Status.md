# FactHarbor Current Status

**Version**: v2.11.0
**Last Updated**: 2026-05-20
**Phase**: **Alpha**
**Status**: V2 pipeline rebuild is the current strategic execution track. `Docs/STATUS/Backlog.md` is the authoritative active queue; this file is a high-level snapshot and historical context. V1 ClaimAssessmentBoundary work is maintenance-only until V2 cutover readiness. The V2 hidden direct-text runtime path has advanced through accepted Claim Understanding, Query Planning, bounded Source Acquisition, Source Material, corpus/readiness gates, W5 EvidenceItem extraction/admission/handoff, X7-W5-H retirement of the standalone W4-I route, W6-B contract-only sufficiency intake, W6-C hidden/internal sufficiency assessment implementation at `8f7856b5`, W7-A contract-only Boundary/Verdict Candidate implementation at `00bd1674`, W8-A internal Alpha report stop candidate implementation at `63f1042a`, and W7-B hidden/internal Boundary/Verdict LLM execution in the current closeout commit. Public V2 remains intentionally blocked/precutover/report_damaged, the live-job tranche ledger currently records `currentRemaining = 0`, and W7-B authorizes no live job, product route, public/API/UI/report/export behavior, public report prose, public verdict/truth/warning/confidence behavior, parser/cache/SR/storage/provider expansion, ACS/direct URL support, V1 cleanup, or cutover. The active package is `Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md`; W7-B canary work still requires a separate committed/refreshed canary package and tranche update.
**Current source-acquisition note:** X7-W2 is now the latest implemented product-route hidden Source Acquisition slice. It consumes accepted Query Planning handoff plus X7-V intake, X7-W1A admission, and the X7-W1B candidate-runtime prerequisite, then runs one product-owned hidden candidate-provider network loop through the 7N-3B2 boundary for the W2-approved Wikimedia Core REST Search page-search endpoint only. It records bounded admin-only artifacts with cost/timing/outcome/byte telemetry and no raw query/provider payload exposure. X7-W2 keeps source material, content dereference, EvidenceCorpus, parser/cache/SR/storage, evidence/report/verdict/warning/confidence generation, public output, ACS/direct URL, V1 reuse, and V1 cleanup blocked. X7-W2-QC3 aligned W2 hidden provider-network admission to the reviewed Query Planning maximum of `6` entries with directly dependent `9000ms` total timeouts. DIAG2 through DIAG5 added bounded sanitized transport diagnostics and taxonomy mapping; TR1 repaired the transport path to response streaming; PIV1-A then bounded the existing Wikimedia Core page-search response with the documented `limit` query parameter. PIV1-A passed the one approved canary with W2 `candidate_provider_network_completed`, `9` hidden structural candidates, and `13982` total bytes while public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` with no hidden-marker leak. Do not rerun LS2, LS3, LS4, LS5, LS6, TR1, or PIV1-A. X7-W1C remains the pre-IO fence context; `research_acquisition` gateway policy remains `notImplemented`. C0-S1/C0-S2/C0-S3 are parser-path adjuncts only: they can admit structural P0 metadata, mark runtime-owned admission provenance, and deny parsed-material creation, but parser execution, parsed material, source material, Evidence Lifecycle consumption, product/public/live wiring, and 2D-C remain blocked.
**Current X7-W2 diagnostic addendum:** X7-W2-LS6 has now run once and is classified as `PASS_X7_W2_LS6_DIAG5_MAPPING_CONFIRMED`. Job `20cfb674dc21448e96787c753d402e22` ran on committed/refreshed runtime `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 output `4.0.0-cb-precutover` / `blocked_precutover` with no hidden-marker leak, and produced hidden artifacts through W2. All three W2 network attempts mapped to `address_validation_failure` / `address_selection` / `node_error_code_present`, confirming the DIAG5 taxonomy mapping. W2 still ended `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`, with zero candidates and zero bytes. Do not rerun LS6. Next action is a separate reviewed narrow transport repair package, not endpoint/client redesign yet and not source expansion. LS6 does not authorize source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, ACS/direct URL, V1 work/cleanup, retries, prompt/config/model edits, or additional probes.
**Current X7-W2 transport repair result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Live_Result.md` classifies the one post-repair canary as `PIVOT_REQUIRED_X7_W2_TR1_RESPONSE_STREAM_BYTE_CAP_ZERO_CANDIDATES`. TR1 was committed at `dcd083ee58ee507ccfd10292b4dd4d2b9cd4e2bd` and improved the failure point: W2 now reaches response streaming instead of the prior address-selection failure. The canary job `fcf5135297e449468e881e957d89464d` still produced zero bytes and zero hidden structural candidates because all three attempts stopped with `compressed_byte_cap_exceeded`; public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` with no hidden-marker leak. Do not continue TR1 repair, patch the custom DNS stack, or run another TR1 canary. Next action is Steering Board review of `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1_Endpoint_Client_Response_Size_Pivot_Package.md`.
**Current X7-W2 PIV1-A live result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-PIV1-A_Bounded_Core_Search_Limit_Live_Result.md` classifies the one approved canary as `PASS_X7_W2_PIV1_A_BOUNDED_CORE_SEARCH_LIMIT_LIVE_CANARY`. PIV1-A was implemented at `7c833b53da7d6e5ece6970247671ed4d8bdce7ea` and confirmed that Wikimedia Core page-search accepts `limit` as a GET query parameter before code execution. Canary job `c4ed36f4ce634860b906c74ea1557cc6` used `Using hydrogen for cars is more efficient than using electricity`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` with no refined hidden-marker leak, and produced hidden W2 `candidate_provider_network_completed` with `3` queries, `3` provider/network attempts, `9` total hidden structural candidates, `6991` compressed bytes, `6991` decompressed bytes, and `13982` total bytes. The zero-byte/zero-candidate pivot condition did not trigger. PIV1-A does not authorize source material/content dereference/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, retries, ACS/direct URL, prompt/config/model/schema edits, V1 reuse, or V1 cleanup. Immediate next action is a brief post-W2 Steering Board review before drafting any Source Material package.
**Current X7-W3 Source Material review package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md` is prepared for Steering Board review only. It authorizes no implementation and no live jobs. The package records that current W2 artifacts expose sanitized counts/telemetry only, and current hidden W2 candidate records have opaque `candidateId`/`hiddenLocatorId` placeholders, so they do not expose usable titles, URLs, excerpts, descriptions, or page keys. Any such fields may be used only if safely materialized from the provider-owned search candidate inside the approved W3 path. The amended recommendation is tiered: W3-A / Tier 0 should perform diagnostic-only bounded search-result preview materialization with no extra HTTP call and no source-material record; W3-B / Tier 1 should be the first real bounded page-summary fetch if Tier 0 is insufficient; Tier 2 full page/source/html fetch remains out of scope and requires separate Steering approval. The new live-job tranche is 6; the package proposes at most one post-implementation W3 canary, counted against that tranche, only after Steering Board approval and a later implementation package. Parser, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence, public exposure, second provider, retries, cache/SR/storage, ACS/direct URL, V1 work, and V1 cleanup remain closed.
**Current X7-W3-B live result:** W3-B passed its one approved canary: job `0964b2da1f534821b2e01bc7f50a7fff` ran on clean committed/refreshed runtime `871d6b606c3301c40860bb32ed0886598495f24d`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 `4.0.0-cb-precutover` / `blocked_precutover`, and recorded W2 `candidate_provider_network_completed` with `9` candidates / `13742` bytes, W3-A `8` materialized previews, and W3-B `source_material_page_summary_completed` with one hidden/admin-only `wikimedia_page_summary_extract_text` Source Material record. No hidden markers leaked publicly. Live-job tranche now has `4` remaining. No second W3-B canary is authorized. Tier 2 full page/source/html fetch, parser execution, EvidenceCorpus, EvidenceItems, report/verdict/warning/confidence, public exposure, second provider, retries, cache/SR/storage, ACS/direct URL, W2 endpoint migration, V1 work, and V1 cleanup remain blocked.
**Current X7-W4-A implementation state:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-A_Source_Material_EvidenceCorpus_Readiness_Source_Package.md` has been implemented as a hidden/admin-only Source Material to EvidenceCorpus readiness/denial gate. Product V2 now records a text-free W4-A readiness artifact after W3-B, using producer-owned W3-B runtime provenance and keeping the EvidenceCorpus build gate closed. W4-A creates no EvidenceCorpus, EvidenceItems, parser output, extraction input, report/verdict/warning/confidence, public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL behavior, V1 work, or V1 cleanup. No W4-A live job was run or proposed.
**Current X7-W4-B design package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-B_EvidenceCorpus_Source_Material_Admission_Design_Package.md` is prepared for Steering Board review only. It recommends defining the first EvidenceCorpus source-material admission contract before W3-C source-material widening. It authorizes no implementation, no live job, no EvidenceCorpus creation, no EvidenceItems, no parser, no extraction input, no report/verdict/warning/confidence/public behavior, no cache/SR/storage, no retries, no provider expansion, no W2 endpoint migration, no ACS/direct URL, and no V1 work or cleanup.
**Current X7-W4-C implementation state:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-C_Corpus_Admission_Source_Package.md` is implementation-verified as a hidden/admin-only corpus-admission input gate. W4-C adds a pure text-free admission core, W4-A runtime-owned readiness provenance, a focused W4-A `providerId` / `languageCode` metadata extension, runtime owner, tests, and boundary guards. It creates no EvidenceCorpus, EvidenceItems, parser output, extraction input, report/verdict/warning/confidence/public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, or V1 cleanup. No W4-C live job was run or proposed.
**Current X7-W4-D implementation state:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md` is implementation-verified as the first hidden/admin-only, text-free `EvidenceCorpus` shell from producer-owned W4-C corpus admission. W4-D creates only `kind: "shell_only"` corpus manifest metadata from W4-C hash/ref lineage, keeps `corpusTextAccess: "closed"`, `semanticExtractionAuthorized: false`, `evidenceItemExtractionAuthorized: false`, `extractionInput: null`, and `evidenceItems: []`, and requires downstream consumers to reject shell-only corpora explicitly. It authorizes no live job, product route, artifact route, source text, EvidenceItems, parser, report/verdict/warning/confidence/public behavior, cache/SR/storage, retries, provider expansion, W2 endpoint migration, ACS/direct URL, V1 work, or V1 cleanup.
**Current X7-W4-E implementation state:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-E_EvidenceCorpus_Extraction_Readiness_Denial_Package.md` is implementation-verified as a consumer-side denial-only extraction-readiness contract over producer-owned W4-D shell output. W4-E adds W4-D shell runtime provenance, rejects copied and post-mark-mutated shells, emits only `EvidenceCorpusExtractionReadinessDenial`, and keeps `extractionInput: null`, `evidenceItems: []`, source text, parser, report/verdict/warning/confidence/public behavior, cache/SR/storage, provider expansion, live jobs, ACS/direct URL, W2 endpoint migration, V1 work, and V1 cleanup closed.
**Current X7-W4-F live result:** W4-F passed its one approved product-route observability canary. Job `cd9963e27a62444e80ee1305fa4f6f94` ran on clean committed/refreshed runtime `3c1a6a2cbd31a3c33206b18b6731389fbfb05297`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, and kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` with `report_damaged` and no hidden-marker leak. Hidden/admin-only artifacts on the same ledger recorded W2 `candidate_provider_network_completed` with `9` candidates and `14082` total bytes, W3-A `source_candidate_preview_materialized` with `9` materialized previews, W3-B `source_material_page_summary_completed` with one bounded Source Material record, W4-A `source_material_structurally_admissible_evidence_corpus_gate_closed`, and W4-F W4-C/W4-D/W4-E chain statuses `source_material_admitted_to_corpus_input_gate_closed`, `evidence_corpus_shell_created_extraction_gate_closed`, and `extraction_denied_shell_only` / `shell_only_corpus`. W4-F is closed for this observability gate. Remaining live-job tranche is `3`. No second W4-F canary is authorized. Source text authorization, extraction input, EvidenceItems, parser, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, ACS/direct URL, W2 endpoint migration, V1 work, and V1 cleanup remain blocked.
**Current X7-W4-G live result:** W4-G passed its one approved product-route canary. Job `1535d6e3695743fd88394c2dc3e3a546` ran on clean committed/refreshed runtime `3861568be8a4199b75034d24f52d178f3e375a67`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, and kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` with `report_damaged` and no hidden-marker or source-text leak. Hidden/admin-only no-store artifacts on ledger `1535d6e3695743fd88394c2dc3e3a546:precutover-observability` recorded W2 `candidate_provider_network_completed` with `9` hidden candidates and `14246` total bytes, W3-B `source_material_page_summary_completed` with one bounded `wikimedia_page_summary_extract_text` Source Material record (`613` bytes), W4-F/W4-C `source_material_admitted_to_corpus_input_gate_closed`, W4-F/W4-D `evidence_corpus_shell_created_extraction_gate_closed`, W4-F/W4-E `extraction_denied_shell_only` / `shell_only_corpus`, and W4-G `bounded_corpus_text_sidecar_created_extraction_gate_closed` with one default-redacted bounded text sidecar whose hash equals the W3-B Source Material text hash. The W4-G route returned `defaultProjection: hash_length_provenance_only`, `textReturned: false`, no exact `text` or `sourceMaterialText` key, and no source-text body leak. W4-G is closed for this canary gate. Remaining live-job tranche is `2`. No second W4-G canary is authorized. Extraction input, EvidenceItems, parser, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, V1 work, and V1 cleanup remain blocked.
**Current X7-W4-H live result:** W4-H passed its one approved product-route canary and is closed as `PASS_X7_W4_H_BOUNDED_EXTRACTION_INPUT_CANARY`. Job `df8402362bee46daba2fe83000156b0d` ran on clean committed/refreshed runtime `a652fd70d7a3053ee6f57ca32659cf0e4cc5e901`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, and kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` with `report_damaged` and no exact hidden-marker or source-text leak. Hidden/admin-only no-store artifacts on ledger `df8402362bee46daba2fe83000156b0d:precutover-observability` repeated W2 `candidate_provider_network_completed` with `9` candidates and `14086` total bytes, W3-B `source_material_page_summary_completed` with one bounded Source Material record (`613` bytes), W4-G `bounded_corpus_text_sidecar_created_extraction_gate_closed`, and W4-H `bounded_extraction_input_packet_created_extraction_execution_closed` with exactly one `bounded_text_extraction_input_packet`. The packet was `613` bytes (`<= 4096`), its hash matched the W3-B Source Material text hash and W4-G sidecar hash, and its `providerId` matched the W4-G sidecar provider id (`wikimedia_core`). Default W4-H route projection stayed hash/length/provenance-only with `inputTextReturned: false`. Remaining live-job tranche is `5`. No second W4-H canary is authorized. Extraction execution, EvidenceItems, parser, LLM extraction calls, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, V1 work, and V1 cleanup remain blocked.
**Current X7-W4-I implementation state:** `Docs/WIP/2026-05-19_V2_Slice_X7-W4-I_Exec_Readiness_Denial_Review_Package.md` is locally implemented and verifier-clean as a hidden/admin-only consumer-side execution-readiness denial over only runtime-owned W4-H `bounded_text_extraction_input_packet` state. W4-I records `extraction_input_structurally_eligible_execution_denied` while keeping execution closed, adds an authenticated internal no-store artifact route with hash/length/provenance-only default projection, and records the live-job tranche in `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` (`6` reset, `5` remaining). No W4-I live job has run; a canary remains blocked until separate Steering authorization. W4-I is infrastructure/containment progress only, not report-quality progress. LLM extraction calls, EvidenceItems, parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, retries, provider expansion, W2/W3 widening, ACS/direct URL, prompt/config/model/schema edits, V1 work, and V1 cleanup remain blocked.
**Current X7-W5-A live result correction:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-A_Bounded_Evidence_Value_Live_Result.md` now classifies job `b7f8561316dd4ab18d3e8aeadf496a9c` as `CORRECTED_STOP_X7_W5_A_SHELL_ONLY_NO_HIDDEN_ARTIFACT_EVIDENCE`. Re-inspection of the persisted job payload and authenticated artifact routes showed that the job was a plain V2 pre-cutover damaged shell envelope (`shellOnly: true`, `analyticalStagesExecuted: []`) and does not provide durable evidence that W5-A executed. Do not use the earlier `hidden_no_extractable_evidence` wording as a premise for W6/report progression, W4-I retirement, or extraction-quality diagnosis.
**Current X7-W5-A CU gate canary result:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-A_CU_Gate_Value_Canary_Result.md` records the follow-up Captain-authorized live job `5f7e163ec8274789b98f1892d2d7616b` on runtime `eeae911de991edc2be34c56ce4109b2afb9fc7c3` using the exact Captain-defined input `Plastic recycling is pointless`. The job reached `SUCCEEDED` publicly but stopped at Claim Understanding with `no_valid_claim` / `stage_scope`; W2/W3/W4/W5 hidden routes returned authenticated no-store `404`. Classification is `STOP_X7_W5_A_CLAIM_UNDERSTANDING_NO_VALID_CLAIM`. This consumed one live job but is not W5-A extraction evidence. Live-job tranche now has `5` remaining after the Captain reset to `6`. Prompt/config/schema edits remain approval-gated; if continuing without edits, use a clearer Captain-defined factual claim to test the existing W2-W5 chain.
**Current X7-W5-A runtime activation discriminator result:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-A_Runtime_Activation_Discriminator_Canary_Result.md` records job `64ec6dcfe6e54fff8c90fc00f4c61b0a` on runtime `6cef9c715a98e2c6ec48a0fef0522871380df6d2` with the exact Captain-defined input `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`. It reached `SUCCEEDED` publicly but returned the plain V2 shell-only envelope; Claim Understanding and W2-W5 hidden routes returned `404`. Classification is `STOP_X7_W5_A_SHELL_ONLY_RUNTIME_ACTIVATION_NOT_PROVEN`. Live-job tranche now has `4` remaining. Do not spend more live jobs until the activation/provenance path is locally diagnosed or repaired under a reviewed package.
**Current X7-W5-B implementation state:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-B_Claim_Understanding_Activation_Repair_Package.md` is locally implemented and verifier-clean as the narrow approved Claim Understanding activation repair. `claim_understanding_gate1` is executable and its prompt/model/cache policies all point to the durable Captain approval anchor in `Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-B_Claim_Understanding_Activation_Approval.md`. Focused gateway/runtime/boundary tests, full Analyzer V2 tests, V2 gate validation, gate-register self-test, debt sensors, build, and diff check passed; debt sensors remain `advisory_warn` for existing V2 footprint/guard/doc-volume/consolidation-marker pressure. The package does not authorize prompt text edits, schema edits, public behavior, parser, report/verdict/warning/confidence behavior, cache read/write, provider expansion, ACS/direct URL, or V1 work.

**Current X7-W5-B live result:** W5-B activation is proven, but W5 evidence extraction is not yet successful. Job `0849273afd304c7790e3cd3b7f009811` (`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`) ran on refreshed runtime `077c5394a9646ca47e206ff39b2246e984d349d6`, produced an accepted hidden Claim Understanding artifact, but W2 returned zero candidates. Job `3524dcb15866442ea92bee6351591976` (`Using hydrogen for cars is more efficient than using electricity`) reached W5: hidden CU accepted, Query Planning accepted, W2 produced 9 candidates, W3-B produced one Source Material record, W4-G/H/I were positive through extraction-input eligibility, and W5 invoked the evidence-extraction model, but W5 ended `damaged_execution` / `schema_validation_failed` with zero EvidenceItems. Public V2 remained `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`; no hidden ledger/artifact marker leaked publicly. Remaining live-job budget is `4`. Next action is a narrow W5-C schema/output diagnosis and repair package before any further live job.

**Current X7-W5-C implementation state:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-C_Evidence_Extraction_Schema_Diagnosis_Repair_Package.md` is locally implemented and verifier-clean as bounded W5 schema-failure diagnosis. The existing W5 adapter now records sanitized `executionTelemetry.schemaDiagnostics` for malformed JSON, schema-invalid JSON, and task-contract mismatches without changing prompts, schemas, model/provider routing, retries, fallbacks, parser/report/verdict/warning/confidence behavior, public output, cache/SR/storage behavior, or live-job state. The review-fix pass bounded `issueCount` to emitted issues, replaced task-contract prose diagnostic codes with structural labels, and added sink/route projection sanitization tests with unsafe seeded diagnostics. The temporary diagnostic is Lead Developer-owned and must be removed or folded into stable W5 telemetry after schema-root-cause resolution plus a later Captain-approved canary.

**Current X7-W5-C live result:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5-C_Evidence_Extraction_Schema_Diagnosis_Live_Result.md` records two W5-C follow-up jobs after Captain reset the live-job budget to `6`. Job `273975edbe2a4acc8bc48325df603069` was an activation/runtime-flag miss and is not W5 evidence. Job `7774d72df7734844ad9272967c5d3c7d` reached hidden Claim Understanding, Query Planning, W2, W3-B, W4-G, W4-H, W4-I, and W5; W5 invoked the evidence-extraction model and failed closed as `damaged_execution` / `schema_validation_failed`. W5-C diagnostics captured `outputParseStatus: parsed`, `failureCategory: schema_validation`, `issueCount: 8`, and structural issue paths centered on `evidenceItems.[non_structural].evidenceScope.*`; W4-G/W4-H/W4-I/W5 default projections and public result did not expose source text. Remaining live-job budget is `4`. Next action is the review-only X7-W5-D prompt/contract alignment package; do not run another live job or edit prompt text until that package is approved.

**Current X7-W5-D live result:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-D_Evidence_Extraction_Prompt_Contract_Live_Result.md` classifies the valid W5-D canary as `PASS_X7_W5_D_EVIDENCE_EXTRACTION_SCHEMA_REPAIR_VERIFIED`. W5-D was implemented at `76984bca` after Captain-approved analysis prompt edits and post-edit LLM Expert review by Claude Opus 4.6 plus an independent LLM Expert. One wrong-variant operational miss, job `ee086cd0e9b44c3ea88c388e96f2eaf6`, was submitted as legacy `claimboundary`, cancelled, and is not V2 evidence. The valid job `08291671a7d44a74b9fc048b6a32a7b5` ran `claimboundary-v2` on runtime `76984bca20840c3c2e9c02449a0e481ec151a02b`, reached hidden CU -> Query Planning -> W2 -> W3-B -> W4-G/H/I -> W5, and W5 completed as `hidden_evidence_item_extraction_completed` with `extractionResultStatus: accepted`, `extractionStatus: evidence_extracted`, `evidenceItemCount: 2`, and `schemaDiagnostics: null`. Public V2 remained `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` with zero public evidence items and no source-text leak. Remaining live-job tranche is `4` after counting both the cancelled wrong-variant job and the valid canary against the latest Captain-declared 6-job budget. No second W5-D canary is authorized. Next step should be a reviewed downstream EvidenceItem admission/consumption package or a consolidation package to fold W5-C diagnostics and W4-I/W4-chain proof debt; do not open parser/cache/SR/storage, provider expansion, ACS/direct URL, public/report/verdict/warning/confidence behavior, or V1 work without separate approval.

**Current X7-W5-E implementation state:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_And_Consolidation_Review_Package.md` is locally implemented and verifier-clean. W5-E adds one hidden/internal `bounded_evidence_items_admitted_internal_consumption_pending` admission decision over runtime-owned accepted W5 bounded evidence-extraction state, carried by the existing W5 artifact sink/route with hash/length/provenance-only default projection and an 18-field ceiling. It does not add a new route/sink and does not expose EvidenceItem text, source text, input text, public result fields, reports, verdicts, warnings, confidence, parser/cache/SR/storage behavior, provider expansion, ACS/direct URL, or V1 behavior. The W4-I route is now explicitly marked `historical_same_ledger_eligibility_evidence`, merged by W5-E, with removal trigger `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`. No W5-E live job has run; a canary still requires a separate approved package and committed/refreshed runtime.
**Current X7-W5-E live result:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_Canary_Result.md` classifies job `68f7dba28c9441b7ab702e5a7b2c1a17` as `STOP_X7_W5_E_MISSING_ADMISSION_SNAPSHOT`. The job used explicit `claimboundary-v2` and reached `SUCCEEDED` on runtime result metadata commit `51b2264d7360a1b4176cfa9faef80c0d8fb3ad0d`; public output stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` with no public EvidenceItems or source-text leak. Corrected authenticated same-ledger checks proved hidden routes reachable through Claim Understanding, intake, W2 candidate-provider network, and W3 source material. The W5 bounded-evidence-extraction route initially returned `500` due a missing W5-E admission snapshot; local fail-closed projection repair now returns JSON showing W5 accepted EvidenceItems (`evidenceItemCount = 2`) but W5-E `admissionStatus = evidence_item_admission_damaged`, `damagedReason = missing_runtime_admission_snapshot`, and `admittedEvidenceItemCount = 0`. Remaining live-job budget is `3`. No second W5-E canary is authorized; W5-E admission remains unproven until a separate approved fresh canary after repair commit/runtime refresh.
**Current X7-W5-E2 live result:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E2_EvidenceItem_Admission_Fresh_Canary_Result.md` classifies job `9584597389504d74af6dcfd684755bff` as `STOP_X7_W5_E2_W3B_DEFAULT_ADMIN_SOURCE_TEXT_EXPOSURE`. The job used explicit `claimboundary-v2`, ran on runtime commit `c0c8f9cc8f40ac87c5d0fa05ccb0973d620f890c`, reached `SUCCEEDED`, and kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged` with no W5/W5-E marker leak. W5-E admission itself worked: W5 accepted `1` EvidenceItem and W5-E admitted `1` with `admissionStatus = bounded_evidence_items_admitted_internal_consumption_pending`, matching hash/length metadata, and no `blockedReason` or `damagedReason`. The package still stopped because same-ledger W3-B source-material page-summary admin output returns `sourceMaterialText` by default, violating W5-E2's default-admin no-source-text containment criterion. Remaining live-job budget is `2`. No second W5-E2 canary is authorized. Next action is a narrow W3-B default-admin redaction repair package before any further canary.
**Current X7-W3B redaction repair state:** `Docs/WIP/2026-05-20_V2_Slice_X7-W3B_Default_Admin_Redaction_Repair.md` is implemented and verifier-clean. The existing W3-B source-material page-summary admin route now defaults to hash/length/provenance-only output by removing `sourceMaterialText` from the route response while preserving stored runtime text for downstream W4/W5 internal consumption. Focused W3-B/W5 tests, V2 gate validation, debt sensors, build, and a manual route check passed. No live job was run. W5-E2 remains stopped until a separately packaged rerun proves both W5-E admission and same-ledger default-admin containment after this repair commit/runtime refresh.
**Current X7-W5-E3 live result:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-E3_EvidenceItem_Admission_Containment_Rerun_Result.md` classifies job `b827c14c474d4a12b4f4e9c876e5cb12` as `PASS_X7_W5_E3_EVIDENCE_ITEM_ADMISSION_AND_CONTAINMENT_CANARY`. The job used explicit `claimboundary-v2`, ran on runtime commit `c2ad605e27a97ca9d9f5602aa719035d4c70d157`, reached `SUCCEEDED`, and kept public V2 pre-cutover/damaged with no W5/W5-E marker leak. Same-ledger hidden routes were present from Claim Understanding through W5. W3-B default admin output no longer exposed `sourceMaterialText` or known source text, while retaining hash metadata and `sourceMaterialTextReturned: false`. W5 accepted `2` EvidenceItems, W5-E admitted `2`, statement hash/byte-length arrays matched the admitted count, and W5-E had no block/damage reason. Remaining live-job budget is `1`. No second W5-E3 canary is authorized. Next package should address evidence-handoff convergence and the W4-I route merge/removal trigger.
**Current X7-W5-F implementation state:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-F_EvidenceItem_Handoff_Implementation_Result.md` records X7-W5-F as implemented and verifier-clean. W5 default admin artifact projection now carries one hidden/internal `EvidenceItemHandoffOwner` decision over accepted W5/W5-E state. It reuses the existing W5 route, exposes only hash/length/provenance-safe metadata, marks W4-I historical eligibility evidence as merged, retires `remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`, and replaces it with `after_w5f_handoff_route_projection_verified`. W4-I route deletion was not performed; W4-I remains temporary inspection debt until the W5-F route projection is accepted and no downstream inspection still needs it. No live job was run. Remaining live-job budget is `1`. X7-W5-F authorizes no public/report/verdict/warning/confidence/parser/cache/SR/storage/provider/prompt/model/config/schema/ACS/direct URL/V1 work.
**Current X7-W5-G canary package:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-G_EvidenceItem_Handoff_Projection_Canary_Package.md` is prepared as a Steer-Co-consented execution package for exactly one product-route `claimboundary-v2` canary after X7-W5-F commit `4deb595c`. The canary must prove that W5-F `evidenceItemHandoff` appears in the live W5 default projection, W5/W5-E remain accepted and count/hash/byte-length aligned, W4-I reports `mergedBy = x7-w5-f_evidence_item_handoff_projection` with the retired and replacement triggers, and public/default-admin containment remains text-free. It consumes `1` live-job slot if submitted; the machine ledger currently records `1` remaining before X7-W5-G. No source changes, second canary, public/report/verdict/warning/confidence/parser/cache/SR/storage/provider expansion/prompt/model/config/schema/ACS/direct URL/V1 work is authorized.
**Current X7-W5-G live result:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-G_EvidenceItem_Handoff_Projection_Canary_Result.md` classifies job `19f831aa36084ab6a2cee9e89698f87c` as `PASS_X7_W5_G_EVIDENCE_ITEM_HANDOFF_PROJECTION_CANARY`. The job used explicit `claimboundary-v2`, ran on runtime commit `8d36e68ab81e09c0a59ebd60aa1f37cced610a33`, reached `SUCCEEDED`, and kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`. Same-ledger hidden routes showed W2 completed, W3-B present, W4-I present, and W5 accepted `1` EvidenceItem with W5-E admitted `1`. W5 default projection included `evidenceItemHandoff` with `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`; W5-F lineage matched W5/W5-E; W4-I reported `mergedBy = x7-w5-f_evidence_item_handoff_projection`, the retired W5-E trigger, and replacement trigger `after_w5f_handoff_route_projection_verified`. Refined leak scan found no forbidden statement/source/input/snippet/summary text terms. Remaining live-job budget is `0`. No second W5-G canary is authorized.

**Current X7-W5-H implementation state:** `Docs/WIP/2026-05-20_V2_Slice_X7-W5-H_W4I_Standalone_Route_Retirement_Result.md` records the standalone W4-I internal admin route and route test as retired after W5-G satisfied the W5-F replacement trigger. W4-I core denial, runtime ownership, provenance, and process-local sink remain for W5 lineage; no new W4-I consumers, live jobs, public behavior, parser, cache/SR/storage, provider expansion, prompt/model/config/schema edits, ACS/direct URL, report/verdict/warning/confidence behavior, or V1 work are authorized.

**Current W6-B implementation state:** `Docs/AGENTS/Handoffs/2026-05-20_Lead_Developer_V2_W6-B_Sufficiency_Intake_Implementation.md` records W6-B as committed at `d1458c96` and verifier-clean. W6-B adds one contract-only `SufficiencyIntakeDecision` owner that consumes the W5-F `EvidenceItemHandoffDecision` and projects only hash/length/provenance lineage with `assessmentExecution = closed_contract_only`. It adds no LLM sufficiency execution, route/sink/product/orchestrator wiring, live job, public behavior, prompt/model/config/schema/UCM/gateway edit, provider/parser/ACS/direct URL widening, Source Reliability/truth/confidence/sufficiency formula, W4-I direct access, report/verdict/warning/confidence behavior, or V1 work.

**Current W6-C implementation state:** `Docs/AGENTS/Handoffs/2026-05-20_Lead_Developer_V2_W6-C_Sufficiency_Assessment_Implementation.md` records W6-C as committed at `8f7856b5` and verifier-clean. W6-C adds one hidden/internal `SufficiencyAssessmentDecision` owner that consumes W6-B sufficiency intake plus accepted W5 EvidenceItems, admits only EvidenceItem statements into the process-local provider input packet, reduces evidence-scope/provenance text to hash/length/structural projections, and keeps the default decision projection text-free. It adds no live job, product route, public behavior, report/verdict/warning/confidence behavior, parser/cache/SR/storage/provider expansion, ACS/direct URL support, prompt/schema text edit, direct W4-I dependency, fixed sufficiency formula, V1 work, or V1 cleanup.

---

## Historical Execution Snapshot (2026-05-18)

- **Canonical queue:** `Docs/STATUS/Backlog.md` is authoritative for active execution order. ACTIVE/OPEN rows in the April monitor queue now carry owner and next-action/blocker fields.
- **V2 implementation state:** 4C3b through X7-F plus X7-G1/X7-G2 and C0-S1/C0-S2/C0-S3 are implementation-complete, and C0-S3A has hardened the audit-only gate register. X4 added the public cutover guard: V2 result contracts now carry `meta.publicCutoverStatus`, and TypeScript/C# public compatibility projections fail closed unless the schema is `4.0.0-cb` and the status is explicitly `approved`. X5 adds a hidden, non-product integration harness under `apps/web/src/lib/analyzer-v2/hidden-integration-harness.ts` that composes accepted Claim Understanding handoff, Evidence Lifecycle intake, hidden Query Planning runtime with injected provider callback, query-plan inspection, and Source Acquisition request/handoff as `ready_not_executable`. X6 adds `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness.ts`, which accepts an already-created X5 result and caller-created candidate authority/allowlist/budget/provider boundary, then calls the 7N-3B1 candidate runtime only when the allowlist is test-injected-only. X6-P adds `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness-provenance.ts`, a sidecar that marks runtime-created X6 results and rejects spread/JSON/structured-clone copies through its reader. X7-A adds `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/readiness.ts` plus a hidden runtime adapter that reduces X6 to sanitized counts/status facts and keeps source-material, extraction input, and evidence-corpus build readiness blocked. X7-B adds `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-material/contract.ts` and `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard.ts`; these consume X7-A readiness only as source-material absence/rejection and return negative evidence-corpus guard states. X7-G1 adds pure-core `apps/web/src/lib/analyzer-v2/evidence-lifecycle/downstream-denial/` code that consumes only X7-B guard output and returns downstream blocked/no-corpus state with all downstream analytical/public outputs null or false. X7-G2 adds producer-owned X7-F/C0-S3 result provenance and a hidden `analyzer-v2-runtime` adapter that consumes only those owned denial outputs, strips them into structural no-corpus input, and maps them through the X7-G1 core with all downstream analytical/public outputs null or false. X7-C adds `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-provider-network-readiness.ts`, which validates existing 7N-3B2 authority/endpoint/budget prerequisites plus X7-B guard output as `not_executable_pre_live_gate` or blocked. X7-D adds `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-readiness-composition.ts`, which consumes an already-created X6 result, derives X7-A readiness, and calls X7-C as summary-only `composition_not_executable_pre_live_gate` or blocked. X7-E updates that composition to consume only the X6-P provenance reader and reject copied/non-runtime-owned X6 inputs as `x6_not_runtime_owned` before downstream readiness. X7-F adds `apps/web/src/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate.ts` as a closed no-IO execution-denial gate. C0-S1 adds `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission.ts` as a structural P0 admission contract, C0-S2 adds `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-worker-admission-provenance.ts` for process-local runtime-owned admission checks, and C0-S3 adds `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-parser-admission-parsed-material-denial.ts` to prove runtime-owned admission still cannot create parsed material. Product runner/orchestrator/API/UI/report/export paths are not wired to these harnesses.
- **Prior X7-E gate:** X7-E is implementation-complete under `Docs/WIP/2026-05-16_V2_Slice_X7-E_Hidden_Source_Acquisition_Composition_X6_Provenance_Gate_Source_Package.md`. It closes the X7-D copied-X6 limitation by requiring X6-P runtime ownership before the hidden no-IO composition can proceed. Focused tests and boundary guards prove spread, JSON, and structured-clone X6 copies fail as `x6_not_runtime_owned`, while production X7-D imports only the sidecar reader and not the owner-only mark function, X6 runner, candidate runtime, transport/factory, product/public, cache/SR/storage, prompt/config/model/schema, or V1 code.
- **Gate register state:** X8 introduced the audit-only register refresh, and X7-W2 now advances `Docs/AGENTS/V2_Gate_Register.json` so `gate.research_acquisition` points to `implemented_product_internal_candidate_provider_network_hidden_no_source_material`. The register records the W2 source package, T1 telemetry projection package, W1C/W1B/W1A/V prerequisites, and parser adjunct context. X3-B removes the repaired `prompt_frontmatter_required_sections_lag` drift marker from `gate.evidence_query_planning` and makes the validator fail if that marker is reintroduced. Validator self-tests fail if the row silently drops W2, the Wikimedia endpoint posture, C0-S1/C0-S2/C0-S3 package refs, `parser-worker execution`, `parsed-material creation`, or the C0/P0/2D-C blocker note tokens. The register remains audit-only, cannot approve execution, is not consumed by runtime, and marks live jobs blocked. `research_acquisition` remains `notImplemented` in gateway policy.
- **Latest V2 source-acquisition boundary:** X7-V is implementation-complete under `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md`. It runs inside the product V2 hidden orchestrator path after accepted Query Planning, validates the existing Query Planning handoff plus Source Acquisition request as `intake_ready_not_executable`, records a bounded admin-only no-store intake artifact, and keeps all source/search/fetch/provider/parser/SR/cache/evidence/report/verdict/public execution flags false. It does not authorize live jobs, source execution, structural executor invocation, provider-network transport/factory calls, real source IO, source-material population, extraction, evidence-corpus building, parser 2D-C, or V1 cleanup.
- **Latest parser adjunct:** C0-S1 is implementation-complete under `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S1_P0_Parser_Worker_Admission_Source_Package.md`. It adds a structural parser-worker admission decision for P0 only: fixture/control or synthetic inert metadata may be admitted as `p0_admitted_fixture_or_synthetic_inert`, but parser execution, worker spawn, byte consumption, 2C-A packet/frame consumption, real fetched bytes, product/public/live wiring, Evidence Lifecycle consumption, cache/SR/storage, prompt/config/model/schema edits, and 2D-C remain blocked.
- **Latest parser provenance adjunct:** C0-S2 is implementation-complete under `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S2_Parser_Admission_Provenance_Source_Package.md`. It adds process-local runtime-owned C0-S1 admission provenance, rejects copied/JSON/structured-clone/reconstructed/mutated admission objects, and does not approve parser execution, worker spawn, byte consumption, parsed material, source material, Evidence Lifecycle consumption, product/public/live wiring, or 2D-C.
- **Latest parser denial adjunct:** C0-S3 is implementation-complete under `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0-S3_Parser_Admission_Parsed_Material_Denial_Source_Package.md`. It adds a hidden denial owner that consumes only C0-S2 runtime-owned admission provenance and still returns no parsed material, no parser output, no source material, no extraction input, and no evidence corpus. It does not approve parser execution, worker spawn, byte consumption, Evidence Lifecycle consumption, product/public/live wiring, or 2D-C.
- **Prompt and live-smoke gates:** X7-M Claim Understanding prompt/contract repair is implementation-complete and no longer a pending prompt edit, but X7-M itself does not authorize live jobs. X3-B query-planning prompt frontmatter/text alignment is implementation-complete after explicit Captain approval, using the reviewed package at `Docs/WIP/2026-05-17_V2_Slice_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md`; it aligns metadata/text for the already-approved hidden/internal query-planning loader only and does not authorize Query Planning live execution, source execution, product/public wiring, or model/cache/gateway approval flips. X7-N was the separate reviewed post-repair direct-text smoke package and is now classified as `PROVENANCE_CONTAMINATED_PARTIAL_OBSERVATION`, not pass, because the first job recorded a dirty execution hash after unrelated docs churn reappeared during the run. The second X7-N canary was not run. X7-N-A then attempted the one approved clean German rerun and hard-failed because the runtime silently fell back to V1 when the V2 shell gate was effectively closed; job `29b8f95866964b3c805e7df243f004ea` was cancelled after V1 search/fetch/XLSX parsing/Source Reliability/verdict work had already appeared. The route-selection repair is now committed: explicit `claimboundary-v2` requests fail closed instead of falling back to V1, while normal `claimboundary` jobs still run V1. If clean evidence is still required after runtime refresh, use a separate reviewed follow-up package; do not rerun under spent X7-N-A. Any provider-network transport/factory call, source material, candidate acquisition change, evidence-corpus population, live job, product wiring, public output, parser 2D-C, or V1 cleanup needs a separate reviewed gate. Separately, 7N-3B3-2D-B2 remains the latest parser-isolation source state: `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B2_OCI_Parser_Isolation_Proof_Source_Package.md` has been implemented only as a hidden proof contract, OCI proof owner, default `parser_isolation_unavailable`, approval checks, denial-probe result mapping, focused tests, and boundary guards. Docker and Podman are not available on this machine, so the positive sandbox verifier was not run locally and local proof remains fail-closed/unavailable. This does not authorize real fetched-byte parsing, fixture/control parsing, packet consumption, product/public wiring, live jobs, prompt/model/config/schema changes, cache/SR integration, Evidence Lifecycle consumption of parsed text, ACS/direct URL execution, or V1 cleanup. 2D-C parser work remains blocked until a positive deployment-candidate rootless OCI sandbox proof passes on a provisioned host. X7-K is now complete as the reviewed live-smoke gate for the two Captain-approved direct-text canaries; do not run more live jobs for this blocker until a separate reviewed execution package exists. Separately review the `Plastic recycling is pointless` `blocked/no_valid_claim` outcome before treating broad benchmark claims as quality evidence.
- **Post-route-repair live-smoke result:** X7-N-B passed on committed package/runtime `7f104139`: job `585dcad36a3044928f6c29edab0d3b86` used the exact German Captain-approved direct-text input, recorded clean created/executed hash `7f104139932afccfef49a3ef4ba3d97780dbfaaa`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, produced one internal-only Claim Understanding artifact with `schemaOutcome.status: accepted`, and produced one internal-only X7-J intake artifact with `intake_ready` / `contract_only_no_provider_execution` / `not_executable_precutover`. Public output stayed `_schemaVersion: 4.0.0-cb-precutover` and `meta.publicCutoverStatus: blocked_precutover`, and non-admin public inspection found no hidden artifact markers. This proves only the one direct-text route-repair smoke objective; it does not approve the Bolsonaro canary, live-job expansion, Query Planning execution, source/provider/parser execution, EvidenceCorpus/report/verdict behavior, cache/SR/storage, ACS/direct URL, public cutover, or V1 cleanup.
- **X7-N-C legal-question live-smoke result:** X7-N-C job `d441e8d3e5fe4fbda40c8b31ce3e6830` functionally showed the Bolsonaro/fair-trial direct-text path can produce accepted hidden Claim Understanding output and X7-J intake readiness through the product V2 route while public output stayed `_schemaVersion: 4.0.0-cb-precutover` / `meta.publicCutoverStatus: blocked_precutover`. It is not a passing gate because the package-required post-inspection clean-worktree checkpoint failed after unrelated PipelineV1 archive cleanup reappeared. Treat X7-N-C as `PROVENANCE_CONTAMINATED_FUNCTIONAL_OBSERVATION`, not `PASS_X7_N_C`; do not submit a second X7-N-C job. A clean legal-question rerun requires a separate reviewed follow-up package after unrelated docs churn is isolated.
- **X7-N-D clean legal-question live-smoke result:** X7-N-D passed on committed package/runtime `92c9fff6`: job `fbccbbc9dc234991bb74c0990664e8ba` used the exact Captain-approved Bolsonaro/fair-trial input, first prepared `pipeline: claimboundary-v2`, recorded clean executed hash `92c9fff60e0d5f745667d793bbe149d7ef844e1f`, reached `SUCCEEDED`, produced accepted internal Claim Understanding and X7-J intake artifacts, kept public output `_schemaVersion: 4.0.0-cb-precutover` / `meta.publicCutoverStatus: blocked_precutover` with `report_damaged`, and leaked no hidden markers in non-admin public inspection. This proves only the clean legal-question smoke objective and does not approve truth/legal/fairness/report conclusions, live-job expansion, Query Planning execution, source/provider/parser execution, public cutover, V1 work, or V1 cleanup.
- **Implemented X7-O Query Planning pre-execution observation package:** `Docs/WIP/2026-05-17_V2_Slice_X7-O_Product_Internal_Query_Planning_Preexecution_Observation_Artifact_Source_Package.md` is implementation-complete. Product V2 now builds a sanitized Query Planning pre-execution structural observation after X7-J intake, records it in a bounded process-local admin-only artifact sink, and exposes it only through an authenticated internal no-store route. Post-review hardening now enforces blank/trimmed/overlong ledger-id rejection at the sink boundary, not only at the route boundary. Public output remains damaged/precutover and contains no X7-O artifact state. Query Planning runtime execution, input-envelope/prompt-packet/hash construction, prompt rendering, model/provider calls, source/provider/parser work, cache/SR/storage, live jobs, prompt/config/model/schema edits, approval flips, ACS/direct URL, V1 work, and V1 cleanup remain blocked.
- **Prepared X7-P X7-O live-smoke package:** `Docs/WIP/2026-05-17_V2_Slice_X7-P_X7O_Query_Planning_Observation_Live_Smoke_Package.md` is a deputy-approved docs-only execution package for one exact Captain-approved legal-question direct-text job after package commit, clean worktree, runtime refresh, admin-route preflight, and non-expensive verifiers. It is only an artifact-reachability/public-non-leak smoke for Claim Understanding, X7-J, and X7-O; it does not authorize Query Planning execution, source/provider/parser execution, public cutover, prompt/config/model/schema edits, extra live jobs, or V1 cleanup.
- **X7-P X7-O live-smoke result:** X7-P job `77f2e9f237e34263a09be50264db3682` is `PARTIAL_X7_P_LANGUAGE_SIGNAL_UNAVAILABLE`, not pass. The run used committed package/runtime `03e2bafb`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, produced accepted Claim Understanding and X7-J `intake_ready` artifacts, produced an admin-only no-store X7-O artifact, and leaked no hidden markers publicly. It failed the formal X7-P pass bar because X7-O correctly stayed `blocked_pre_query_planning` with `blockedReason: language_signal_unavailable` / `sourceLanguageSignal: unavailable` instead of `structural_prerequisites_observed_not_executed_precutover`. Do not rerun X7-P. Next candidate is a reviewed X7-Q language-metadata repair package; no Query Planning execution, source/provider/parser execution, public cutover, extra live jobs, or V1 cleanup is authorized.
- **Implemented X7-Q Claim Understanding language-metadata repair:** X7-Q is implemented under `Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md`. `V2_CLAIM_UNDERSTANDING_GATE1` now requires accepted direct-input ClaimContracts to provide concrete non-`und` source-language metadata, with LLM-owned source-language inference when the direct-input seed is `und`. Global `ClaimContractSchema` now rejects direct-input blank/`und` language metadata and mismatched direct-input language fields; X7-O and Query Planning input-envelope raw invalid direct-input cases block as `claim_contract_invalid`. Verifiers passed through full Analyzer V2 unit slice and build. X7-Q does not authorize live jobs, Query Planning execution, source/provider/parser execution, public cutover, or V1 cleanup.
- **X7-R post-X7-Q live-smoke result:** X7-R passed as `PASS_X7_R_POST_X7Q_X7O_OBSERVED` on job `c72f57c379be42e7852313896563b82e`. The run used package commit `ce3a774e` descended from X7-Q implementation `4bd9dcfa`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, and leaked no hidden markers publicly. Hidden artifacts showed accepted Claim Understanding, X7-J `intake_ready`, and X7-O `structural_prerequisites_observed_not_executed_precutover` with `sourceLanguageSignal: present` and all execution flags false. Caveats: API-created hash fields were null while result metadata recorded clean executed web hash `ce3a774e`; unrelated agent-governance dirt reappeared after the live inspection and is recorded as post-run workspace dirt, not runtime contamination. X7-R does not authorize Query Planning/source/provider/search/fetch/parser/cache/SR/report/verdict/public/V1 work.
- **Post-X7-R hardening:** The Claim Understanding internal artifact route now emits `Cache-Control: no-store` on success, unauthorized, and bad-request responses, aligning it with the X7-J and X7-O internal artifact routes. This closes the bounded no-store caveat carried from X7-R without changing product/public behavior, artifacts, prompts, models, source execution, cache/SR/storage, reports, verdicts, or V1 state. A follow-up admin reinspection of X7-R through both API and web proxy returned non-null `gitCommitHash`, `createdGitCommitHash`, and `executedWebGitCommitHash` matching the X7-R package commit, so no API-created hash source repair is currently needed; future live gates should still record admin hash proof.
- **Implemented X7-S hidden Query Planning execution:** `Docs/WIP/2026-05-17_V2_Slice_X7-S_Product_Internal_Query_Planning_Execution_Package.md` is implemented inside its approved envelope. Product V2 now passes a separate default-closed Query Planning activation status, freezes an X7-S activation/config snapshot in `PipelineRunContext`, creates an injected Anthropic provider callback from that validated snapshot only when X7-S is open, runs the existing hidden 7L-1 Query Planning runtime after accepted Claim Understanding plus X7-O observation, and records bounded admin-only no-store runtime artifacts. Public V2 output remains damaged/precutover and does not expose Query Planning artifacts. X7-S does not authorize live jobs, source/search/fetch/parser/SR/cache IO, evidence/report/verdict/warning/confidence behavior, prompt/config/schema edits, public exposure, ACS/direct URL, V1 reuse, or V1 cleanup.
- **X7-T-S final launcher-exact smoke result:** X7-T-S job `4b9c0db413b742b8a47806daa568e95d` ran on clean commit/runtime `10db25989d297944197b439f514e0daf89f12270` and is classified as `PARTIAL_X7_T_S_QUERY_PLANNING_SCHEMA_VALIDATION_FAILED`. It first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, produced accepted Claim Understanding, X7-J `intake_ready`, and X7-O `structural_prerequisites_observed_not_executed_precutover` artifacts, then invoked hidden Query Planning runtime and model call. Query Planning completed as damaged with `schema_validation_failed`, `queryEntryCount=0`, missing `sourceLanguagePolicy`, and source-acquisition handoff `blocked`. Public output stayed `4.0.0-cb-precutover` / `blocked_precutover` with no hidden marker leak; source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence execution remained off. No English canary was submitted. Next action is a separate reviewed X7-U Query Planning schema-output diagnosis/repair package before any further live job.
- **Implemented X7-U0 Query Planning adapter diagnostics:** `Docs/WIP/2026-05-17_V2_Slice_X7-U0_Query_Planning_Adapter_Diagnostics_Source_Package.md` is implementation-complete. The hidden X7-S Query Planning runtime artifact now carries bounded, sanitized, admin-only `adapterAttemptDiagnostics` derived only from existing adapter attempts, and the authenticated internal no-store route returns them. Damaged Query Planning artifacts still expose zero query entries, no source-language policy, and blocked source-acquisition handoff. X7-U0 does not authorize prompt edits, schema/config/model/provider changes, retries, source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public exposure, ACS/direct URL, V1 reuse, or V1 cleanup; it also did not run live jobs.
- **X7-U1 Query Planning diagnostic live-smoke result:** X7-U1 passed as `PASS_X7_U1_DIAGNOSTIC_CAPTURED` on job `83c76b93bea746e9b4848c020c8f34a1`, using committed/refreshed runtime `6ca35b35eb3a202c966fea504069a7abcdf071fd` and the exact German Captain-defined direct-text input. The job first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public output `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, and leaked no hidden markers publicly. Hidden artifacts showed accepted Claim Understanding, X7-J `intake_ready`, X7-O `structural_prerequisites_observed_not_executed_precutover`, and X7-S Query Planning runtime execution. Query Planning remained damaged with `schema_validation_failed`; X7-U0 diagnostics identified the strict-contract mismatch: `integrityEvents.0.type` required, `integrityEvents.0.references` required, and unrecognized `eventType`. Next action is X7-U2 Query Planning task-event prompt contract repair; do not relax schema, normalize aliases in the adapter, change models, or add retries before that repair is implemented and reviewed.
- **Implemented X7-U2 Query Planning task-event prompt contract repair:** `Docs/WIP/2026-05-17_V2_Slice_X7-U2_Query_Planning_Task_Event_Prompt_Contract_Repair.md` amends only the rendered `V2_EVIDENCE_QUERY_PLANNING` prompt section and focused tests so the task-event object contract is explicit (`type`, `severity`, `message`, `references`) and malformed `eventType` output remains rejected rather than normalized. X7-U2 does not authorize schema relaxation, adapter aliasing, model/config/provider changes, source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public output, ACS/direct URL, V1 reuse, or V1 cleanup. A committed/refreshed post-repair live rerun remains the next validation step.
- **X7-U2 Query Planning task-event prompt contract live result:** X7-U2 live validation passed as `PASS_X7_U2_SCHEMA_REPAIR_VERIFIED` on job `3f75f309c9a8484381fb6c596589296c`, commit/runtime `606e776240443104f33e30a609a4a6c5098ce93c`, prompt hash `2a78ce4f36869f6099dbd1af0b4626fd08f8b4a15f6a57fdb20df256f4049478`. Hidden Query Planning adapter diagnostics show one accepted provider attempt with zero structural issues, so the X7-U1 `eventType`/missing-`references` schema drift is repaired. Query Planning then returned a valid `blocked` result with `blockedReason: source_acquisition_not_executable`; source-acquisition handoff remained blocked as `query_planning_not_accepted`. This is a separate stage-boundary posture question, not a failed X7-U2 repair. Next step is a reviewed decision on whether hidden Query Planning should produce accepted bounded query plans while source acquisition remains non-executable.
- **Implemented X7-U3 Query Planning downstream-gate posture prompt clarification:** `Docs/WIP/2026-05-17_V2_Slice_X7-U3_Query_Planning_Downstream_Gate_Posture_Prompt_Clarification.md` amends only the rendered `V2_EVIDENCE_QUERY_PLANNING` section and focused prompt tests so closed downstream Source Acquisition is treated as execution posture, not by itself a Query Planning block. The handoff contract already maps accepted Query Planning output to Source Acquisition `ready_not_executable`; X7-U3 aligns the prompt with that contract. Next validation step is a committed/refreshed one-job German canary. X7-U3 does not authorize source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public output, schema relaxation, adapter normalization, model/config/provider changes, ACS/direct URL, V1 reuse, or V1 cleanup.
- **X7-U3 Query Planning downstream-gate posture live result:** X7-U3 passed as `PASS_X7_U3_QUERY_PLANNING_ACCEPTED_READY_NOT_EXECUTABLE` on job `9d70aa3a2ac54edaa44df8b0935e961c`, commit/runtime `8e1ea52ee07b700b31129b152d7aaf1241f4faa8`, prompt hash `8621b011ed1fabf694cc1fd67650562efff57ce6c02cd6ecdb5ff7bcffb2bd12`. Hidden Query Planning returned `accepted`, produced 3 bounded query entries and source-language policy `de`, and Source Acquisition handoff was `ready_not_executable`; public V2 stayed damaged/precutover with no hidden leak and all forbidden downstream execution flags false. Caveat: the X7-S artifact top-level `selectedAtomicClaimIds` diagnostic field is empty while the handoff/inspection path is ready; record as diagnostic cleanup, not a pass blocker.
- **Implemented X7-U4 Query Planning artifact selected-IDs diagnostic cleanup:** `Docs/WIP/2026-05-17_V2_Slice_X7-U4_Query_Planning_Artifact_Selected_Ids_Diagnostic_Cleanup.md` fixes the X7-U3 caveat as a projection-only cleanup. X7-S runtime artifacts now take top-level selected IDs from the ready handoff or inspection before falling back to run context, so direct jobs without preselected ingress IDs can still display the ClaimContract-selected IDs used by Query Planning. No live rerun is required for this cleanup unless reviewers ask.
- **Implemented X7-V Source Acquisition intake boundary:** `Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md` adds a product-internal, hidden, no-IO intake boundary after accepted Query Planning. Product V2 now builds the existing Source Acquisition request, validates it against the accepted Query Planning handoff, and records a bounded admin-only intake artifact as `intake_ready_not_executable`. X7-V does not run live jobs and does not authorize source/search/fetch/provider/parser/SR/cache IO, source material, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public exposure, prompt/config/schema/model/provider changes, ACS/direct URL, V1 reuse, or V1 cleanup.
- **X7-V-LS1 X7-V live-smoke result:** X7-V-LS1 passed on committed/refreshed package/runtime `b8be9bc21bbdd6345efafe60f6cb5f3391cbea12` with job `f850f5f7fc6540e7910138906c0a79fe`. The exact Captain-defined German direct-text input reached the product V2 route, accepted hidden Claim Understanding, X7-J `intake_ready`, X7-O structural prerequisites observed, X7-S accepted Query Planning with 2 bounded query entries, and X7-V Source Acquisition intake `intake_ready_not_executable` on the same ledger. Public V2 stayed `_schemaVersion: 4.0.0-cb-precutover`, `publicCutoverStatus: blocked_precutover`, and `report_damaged`, with no hidden marker leak. X7-V-LS1 does not authorize Source Acquisition execution, structural executor invocation, source/search/fetch/provider/parser/SR/cache IO, source material, EvidenceCorpus, evidence/report/verdict behavior, public cutover, prompt/config/schema/model/provider edits, ACS/direct URL, V1 work, or V1 cleanup. The separate `X7-W` label remains reserved for a reviewed candidate-runtime admission proposal, not immediate implementation.
- **Prepared and reviewed X7-W candidate-runtime admission proposal:** `Docs/WIP/2026-05-17_V2_Slice_X7-W_Hidden_Product_Internal_Source_Acquisition_Candidate_Runtime_Admission_Proposal.md` is a proposal-only package for the next Source Acquisition direction. Architect, Security/runtime, and code review approved the amended proposal with no remaining blockers. It recommends X7-W1A as hidden product-internal candidate-runtime admission after X7-V, with Position A admission-only/no executable runtime or provider invocation as the default and Position B one concrete provider boundary only if Security explicitly approves the source package and 7N-3B2-grade SSRF matrix. X7-W does not authorize implementation, executable candidate-runtime invocation, provider-boundary invocation, provider-network execution, content dereference, parser work, cache/SR/storage, source material, EvidenceCorpus, evidence/report/verdict behavior, public cutover, live jobs, ACS/direct URL, V1 work, or V1 cleanup.
- **Implemented X7-W1A candidate-runtime admission:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1A_Product_Internal_Candidate_Runtime_Admission_Source_Package.md` is implementation-complete inside the approved envelope. Product V2 now builds a product-owned candidate-runtime admission authority/snapshot after X7-V and records a bounded admin-only artifact with zero provider attempts, zero candidates, zero bytes, and no executable candidate-runtime or provider-boundary invocation. X7-W1A does not authorize source/search/fetch/provider/parser/SR/cache IO, source material, EvidenceCorpus, evidence/report/verdict behavior, public cutover, live jobs, ACS/direct URL, V1 work, or V1 cleanup.
- **Implemented X7-W1B closed candidate-runtime loop:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1B_Product_Internal_Closed_Candidate_Runtime_Loop_Source_Package.md` is implementation-complete inside its approved envelope. Product V2 now exercises `executeSourceAcquisitionCandidateRuntime(...)` after X7-W1A only through a product-owned closed local no-IO boundary, records bounded admin-only closed-loop artifacts, returns deterministic zero-candidate/zero-byte structural outcomes, uses opaque per-query projection, and has poison leakage coverage for raw queryId/queryText/source-language/provider-request data. X7-W1B does not authorize real provider/network/source IO, parser/cache/SR/storage, source material, EvidenceCorpus, evidence/report/verdict/warning/confidence behavior, public cutover, live jobs, ACS/direct URL, X6/X7-D forward-path reuse, V1 work, or V1 cleanup.
- **Implemented X7-W1C path consolidation / pre-IO fence:** `Docs/WIP/2026-05-17_V2_Slice_X7-W1C_Source_Acquisition_Path_Consolidation_And_Pre_IO_Fence_Package.md` is implementation-complete as docs/register/boundary-guard only. It keeps X7-W1B as the latest product-route runtime proof, makes W1C a non-executable `pre_io_fence_documented_no_execution` governance fence for later W2 review, demotes X6/X7-D/X7-E/X7-F/X7-G1/X7-G2 and parser adjuncts to regression/historical context, and forbids runtime owner/artifact/route creation, real provider/network/source IO, parser/cache/SR/storage, source material, EvidenceCorpus, evidence/report/verdict/warning/confidence behavior, public cutover, live jobs, ACS/direct URL, and V1 work.
- **Implemented X7-W2 hidden candidate-provider network:** `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md` is implementation-complete inside its approved envelope. Product V2 now runs a hidden product-owned candidate-provider network loop after X7-V/X7-W1A/X7-W1B, using only the W2-approved Wikimedia Core REST Search page-search endpoint and recording bounded admin-only artifacts with cost/timing/outcome/byte telemetry. W2 treats Wikimedia as a time-bound hidden proof dependency. It does not authorize live jobs, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus, evidence/report/verdict/warning/confidence behavior, public cutover, ACS/direct URL, V1 work, or V1 cleanup.
- **Prepared X7-W2-LS1 live-smoke package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Smoke_Package.md` is a Claude Opus-reviewed docs-only execution package for exactly one committed/refreshed live job after endpoint-status re-check, focused verifiers, runtime-gate proof, admin-route preflight, and clean idle checkpoint. It proves only hidden W2 candidate-provider artifact reachability for the approved Wikimedia endpoint and keeps public V2 damaged/precutover; it does not authorize source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public cutover, broader provider expansion, ACS/direct URL, V1 work, or V1 cleanup.
- **X7-W2-LS1 live result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Result.md` records `HARD_FAIL_X7_W2_LS1_OPERATOR_CANCELLED_AND_QUERY_CAP_BLOCKED` for job `41056d2c77794c0bbfa3f1a8d4f5c05f`. The run used clean package/runtime `90a98f18` and first prepared `pipeline: claimboundary-v2`, but was cancelled by an executor polling bug. Hidden artifacts reached W2, where W2 blocked before provider-network execution with `query_count_exceeds_w2_cap` because Query Planning emitted 3 entries while W2 allows 2. This is partial defensive evidence only; no provider/network execution proof, source material, evidence, report, verdict, public cutover, or rerun authorization follows. Next safe step is a separate docs-only Query Planning query-count estimation package before choosing either a compatible canary or a reviewed W2 cap-alignment source amendment.
- **Prepared X7-W2-QC1 query-count estimation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC1_Query_Planning_Query_Count_Estimation_Package.md` is docs-only and non-executing. It defines the evidence contract for the next W2 decision: either identify a Captain-defined input that currently produces at most 2 Query Planning entries without W2/source execution, or justify a reviewed W2 cap-alignment source package from Query Planning cardinality evidence. QC1 does not authorize live jobs, W2/source/provider/network execution, cap changes, source material, EvidenceCorpus, evidence/report/verdict behavior, public cutover, ACS/direct URL, or V1 work.
- **X7-W2-QC2 diagnostic result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC2_Query_Planning_Distribution_Diagnostic_Result.md` records the committed local diagnostic on `046acef8`. The harness ran Claim Understanding plus Query Planning only, stopped at `STOP_AFTER_QUERY_PLANNING_INSPECTION`, and produced accepted Query Planning counts of `2`, `5`, and `3` for three exact Captain-defined inputs. This rejects a blind compatible-canary path as the next default and supports a reviewed W2 cap-alignment source package. QC2 does not authorize live jobs, Source Acquisition/W2/provider-network/content/parser/cache/SR/storage/EvidenceCorpus/report/verdict/public behavior, prompt/config/schema/model/provider policy edits, ACS/direct URL, V1 work, or W2 cap changes without the next package.
- **Implemented X7-W2-QC3 W2 cap alignment:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md` is implemented at `c2fdcd9c`. W2 hidden candidate-provider-network query admission is now cap `6`, matching the reviewed Query Planning maximum, with directly dependent total candidate/network timeouts `9000ms`. Per-query timeout `1500ms`, max candidates per query `3`, byte cap `32768`, one-provider/no-credential posture, retry policy `none`, redirect `deny`, proxy `none`, hidden/admin-only artifacts, and all no-source-material/no-content/no-parser/no-cache/SR/storage/no-EvidenceCorpus/no-evidence/report/verdict/warning/confidence/no-public/no-ACS/no-V1 constraints remain unchanged. QC3 ran no live jobs; a later LS2-style package is required before any live provider-network canary.
- **X7-W2-LS2 post-QC3 live-smoke result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS2_Post_QC3_Candidate_Provider_Network_Live_Result.md` classifies job `36c9c6779b6947babbb895b42e916040` as `HARD_FAIL_X7_W2_LS2_PROVIDER_NETWORK_DAMAGED_STRUCTURAL`, not pass. The run used clean package/runtime `028eb1c6`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, and public output stayed `4.0.0-cb-precutover` / `blocked_precutover` with no hidden leak. Hidden artifacts reached Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and X7-W2. X7-S produced 3 accepted Query Planning entries, so QC3 cap alignment worked for admission. W2 did not complete: `candidateProviderNetwork.status` was `candidate_provider_network_damaged_structural`, with `damagedReason: candidate_runtime_query_coverage_invalid`; all three W2 attempts were sanitized `transport_failure` with zero candidates and zero bytes. Do not rerun LS2 or repair inside it; next action is a separate reviewed diagnostic/repair package.
- **X7-W2-DIAG1 transport failure diagnostic:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG1_Transport_Failure_Diagnostic.md` is docs-only complete after Claude Opus recommendation. It confirms existing sanitized LS2 telemetry can classify the failure but cannot distinguish host TLS/socket failure, Wikimedia user-agent policy rejection, custom lookup behavior, local network/proxy/firewall behavior, or endpoint connection reset. Next action should be a reviewed DIAG2 source package for bounded sanitized transport diagnostics, not another live job and not a broad provider/source expansion.
- **Implemented X7-W2-DIAG2 sanitized transport diagnostics:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG2_Sanitized_Transport_Diagnostics_Source_Package.md` is implementation-complete inside the approved diagnostic-only envelope. W2 hidden network-attempt telemetry/artifacts now propagate existing lower-level DNS/final-address/response/content states and add bounded `selectedAddressFamily` plus `transportFailureClass` enums. Raw URL/path/query/payload/body/header/IP/error messages/stacks/causes/source material/candidates/cache/SR/evidence/report/verdict/warning/confidence remain excluded. DIAG2 ran no live job and authorizes no LS2 rerun, repair, provider expansion, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict behavior, public output, ACS/direct URL, prompt/config/model/schema/provider-policy edits, V1 work, or V1 cleanup.
- **X7-W2-LS3 DIAG2 diagnostic live-smoke result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS3_DIAG2_Transport_Diagnostics_Live_Result.md` classifies job `4f7e60c3a3eb4c3193744c30c522f188` as `PASS_X7_W2_LS3_DIAG2_TELEMETRY_CAPTURED`. The run used clean package/runtime `e4bbf8ac`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 damaged/precutover with no hidden leak, and produced hidden artifacts through W2. All three W2 attempts include the required DIAG2 fields (`dnsAddressCount`, `selectedAddressFamily`, `finalAddressValidation`, `responseStatusCodeCategory`, `contentTypeState`, `transportFailureClass`). This is not W2 provider-network success: W2 still ended `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`, with all attempts `transport_failure` / `unknown_transport_failure`, zero candidates, and zero bytes. Do not rerun LS3 or repair inside it; next action needs a separate reviewed diagnostic/repair package.
- **Implemented X7-W2-DIAG3 sanitized transport phase diagnostics:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG3_Sanitized_Transport_Phase_Diagnostics_Source_Package.md` is implementation-complete and Opus-reviewed. W2 hidden source-acquisition network diagnostics now expose enum-only `transportFailurePhase`, `transportErrorShape`, and `nodeErrorCodeCategory` through transport diagnostics, provider-attempt telemetry, and W2 product-internal artifacts. W2 completion semantics remain unchanged. No live job was run; no live provider expansion, loopback listener, parser/cache/SR/storage, source material, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, prompt/config/model/schema change, ACS/direct URL, or V1 work/cleanup was added. Next live observation, if needed, requires a separate reviewed LS4-style package.
- **Prepared X7-W2-LS4 DIAG3 live-observation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS4_DIAG3_Transport_Phase_Live_Observation_Package.md` is Claude Opus-approved. It is docs-only and authorizes exactly one post-DIAG3 live job, after package commit/runtime refresh/endpoint re-check/route preflight/verifiers, to observe the new enum-only `transportFailurePhase`, `transportErrorShape`, and `nodeErrorCodeCategory` fields in the hidden W2 product-route artifact. It does not authorize repair, W2 completion-semantics changes, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work/cleanup, retries, or a second canary.
- **X7-W2-LS4 DIAG3 transport phase live-observation result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS4_DIAG3_Transport_Phase_Live_Result.md` classifies job `07ac604f6af74ef989e8b675e4953abd` as `PASS_X7_W2_LS4_DIAG3_TELEMETRY_CAPTURED`. The run used committed/refreshed runtime `a58a0430`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 damaged/precutover with no hidden marker leak, and produced hidden artifacts through W2. All three W2 attempts include DIAG2 plus DIAG3 fields, but W2 still ended `candidate_provider_network_damaged_structural` / `candidate_runtime_query_coverage_invalid`, with zero candidates and zero bytes. Do not rerun LS4 or repair inside it; the next action is a separate reviewed diagnostic/repair decision package for `node_error_code_present` / `other_known` before final-address validation.
- **Implemented X7-W2-DIAG4 node-error category taxonomy:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG4_Node_Error_Category_Taxonomy_Source_Package.md` is implementation-complete and Claude Opus-reviewed. V2 source-acquisition network transport now maps standard Node/POSIX code families to bounded hidden categories for `network_unreachable`, `host_unreachable`, and `address_family_failure`, and maps HTTPS-only `EPROTO` plus `ERR_SSL_*` to existing `tls_protocol`. DIAG4 ran no live job and does not prove provider-network success; it adds no raw-code probe, provider/source expansion, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work/cleanup, or W2 completion-semantics change.
- **Prepared X7-W2-LS5 DIAG4 taxonomy live-observation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS5_DIAG4_Taxonomy_Live_Observation_Package.md` is Claude Opus-approved as a docs-only package for exactly one post-DIAG4 live job after package commit, runtime refresh, endpoint re-check, route preflight, and verifiers. It observes whether the real product-route W2 failure now maps to `network_unreachable`, `host_unreachable`, `address_family_failure`, `tls_protocol`, or still `other_known`. It authorizes no repair, no raw-code probe, no source material/content/parser/cache/SR/storage, no EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, no provider expansion, no ACS/direct URL, no V1 work/cleanup, no retry, and no second canary.
- **X7-W2-LS5 DIAG4 taxonomy live-observation result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS5_DIAG4_Taxonomy_Live_Result.md` classifies job `2a3727899bdc41cd8d356c7d5212d3a1` as `PASS_X7_W2_LS5_DIAG4_OBSERVED_OTHER_KNOWN_REMAINS`. The run used committed/refreshed runtime `4f95576c`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 damaged/precutover with no hidden marker leak, and produced hidden artifacts through W2. All three W2 attempts still show `nodeErrorCodeCategory: other_known`, `transportFailurePhase: unknown_phase`, and `transportFailureClass: unknown_transport_failure`. Do not rerun LS5 or repair inside it; the next action is a separate reviewed diagnostic decision package for local-only raw-code probing or endpoint/client design review.
- **Prepared X7-W2-RP1 local raw-code probe package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Package.md` is Claude Opus-approved as a docs-only package for exactly one transient operator-local probe outside the repo. It must mirror the product `https.request` transport path, use no product runtime/admin route/live job, destroy any response without body read, delete the temp helper, and commit only a categorical result with `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]`. It does not authorize source/test/prompt/config/schema/model edits, committed helper scripts, live jobs, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, endpoint redesign, ACS/direct URL, V1 work/cleanup, retries, or additional probes.
- **X7-W2-RP1 local raw-code probe result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Result.md` is `PASS_X7_W2_RP1_OBSERVED_UNMAPPED_STANDARD_NODE_CODE`. The raw code was observed locally and intentionally not recorded; committed docs use `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]`. The probe reproduced the pre-response product-parity `https.request` failure with one DNS address and IPv4 selection, deleted the temp helper, and left the repo clean. Next safe action is a separate reviewed DIAG5 taxonomy/mapping source package; do not implement DIAG5 inside RP1.
- **Implemented X7-W2-DIAG5 RP1-observed taxonomy mapping:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG5_RP1_Observed_Node_Code_Taxonomy_Source_Package.md` is implementation-complete. It adds only the generic `address_validation_failure` taxonomy family for the RP1-observed standard Node-style address-validation failure, keeps raw literal exposure confined to approved source/test mapping literals, and preserves W2 damaged/completion semantics. Focused and broad V2 verifier suites plus build and gate checks passed. DIAG5 authorizes no live jobs, endpoint/client repair, provider expansion, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work/cleanup, retries, or additional probes.
- **X7-W2-LS6 DIAG5 taxonomy live-observation result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS6_DIAG5_Taxonomy_Live_Result.md` classifies job `20cfb674dc21448e96787c753d402e22` as `PASS_X7_W2_LS6_DIAG5_MAPPING_CONFIRMED`. The job ran on committed/refreshed runtime `40f832bcd30e2e356f0a30c4d46c9b9c26dd2068`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public V2 damaged/precutover with no hidden-marker leak, and produced hidden artifacts through W2. All three W2 attempts mapped to `address_validation_failure` / `address_selection` / `node_error_code_present`. W2 still failed structurally with zero candidates and zero bytes. Next action is a separate reviewed narrow transport repair package; no source expansion, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, ACS/direct URL, V1 work/cleanup, retry, or second canary is authorized.
- **Implemented X7-W2-TR1 standard-client transport repair:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-TR1_Standard_Client_Transport_Repair_Source_Package.md` is implementation-verified. The production default W2 transport request now uses the standard Node HTTPS connection path without the custom pinned lookup callback. The repair preserves DNS pre-resolution/public-address validation, final remote-address validation, endpoint allowlist, redirect-deny, proxy-none, no-credentials, byte/timeout caps, W2 hidden-only artifacts, and all no-source-material/no-public/no-downstream boundaries. Required verifiers passed. The next step after focused commit/runtime refresh is exactly one post-repair live canary; if that canary does not produce nonzero bytes and candidates, the next step is an endpoint/client pivot package, not further TR1 repair.
- **Prepared downstream denial package:** `Docs/WIP/2026-05-17_V2_Slice_X7-G_Downstream_Evidence_Lifecycle_No_Corpus_Denial_Package.md` is a reviewed docs-only package that records the invariant that no accepted source material and no EvidenceCorpus means no downstream semantic Evidence Lifecycle execution, no evidence/report/verdict behavior, and no live eligibility. It does not approve source edits, downstream LLM execution, prompt edits, product/public/live wiring, or a live-smoke gate.
- **Latest pure-core downstream denial implementation:** X7-G1 is implementation-complete under `Docs/WIP/2026-05-17_V2_Slice_X7-G1_Downstream_No_Corpus_Denial_Source_Package.md`. It adds pure-core downstream no-corpus denial: X7-B no-source-material guard output in, downstream blocked/no-corpus state out. It excludes runtime adapters, X7-F/C0-S3 runtime-owned inputs, source/provider/search/fetch/parser execution, downstream LLM execution, product/public/live wiring, prompt/config/model/schema edits, cache/SR/storage, EvidenceCorpus/EvidenceItems, V1 work, and 2D-C.
- **Latest runtime downstream denial adapter implementation:** X7-G2 is implementation-complete under `Docs/WIP/2026-05-17_V2_Slice_X7-G2_Runtime_Downstream_No_Corpus_Denial_Adapter_Source_Package.md`. It adds producer-owned provenance sidecars/readers for X7-F and C0-S3 result objects, producer marking, an additive pure-core structural no-corpus input, and a hidden `analyzer-v2-runtime` adapter that strips runtime-produced denial outputs before calling the X7-G1 downstream-denial core. It does not approve live-smoke readiness, live jobs, source/provider/search/fetch/parser execution, downstream semantic LLM execution, EvidenceCorpus/EvidenceItems, product/public wiring, prompt/config/model/schema edits, cache/SR/storage, ACS/direct URL, B3 proof execution, 2D-C, V1 work, or V1 cleanup.
- **Prepared direct-text live-smoke readiness package:** `Docs/WIP/2026-05-17_V2_Slice_X7-H_Direct_Text_Live_Smoke_Readiness_Criteria_Package.md` is a docs-only, non-authorizing package that defines criteria for a later executable direct-text smoke package. It does not approve live jobs, prompt edits, source/provider/search/fetch/parser execution, EvidenceCorpus/EvidenceItems/report/verdict behavior, product/public wiring, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.
- **Direct-text Route B live-smoke result:** X7-I passed on commit `cc249312` after package commit, clean worktree, runtime refresh, pre-run verifier suite, and admin-only artifact-route verification. Jobs `8af2b1970bf14e0a8e316f15a299e51f` and `c44eb9273946488897e26eb7643d2406` both executed `claimboundary-v2`, stayed on public `_schemaVersion: 4.0.0-cb-precutover` with `publicCutoverStatus: blocked_precutover`, and wrote one internal-only Claim Understanding artifact each. The smoke proves only hidden Claim Understanding runtime continuity and fail-closed public behavior; it does not approve X3-B prompt edits, source-provider/search/fetch/content-dereference/provider-network/parser execution, X5-X7 product wiring, EvidenceCorpus/EvidenceItems/report/verdict behavior, cache/SR/storage, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.
- **Latest product-internal observation implementation:** X7-J is implementation-complete under `Docs/WIP/2026-05-17_V2_Slice_X7-J_Product_Internal_Evidence_Lifecycle_Intake_Artifact_Source_Package.md`. It adds a narrow product-internal observer bridge: after Claim Understanding, the V2 orchestrator builds the existing Evidence Lifecycle intake decision and writes a sanitized, bounded, admin-only intake artifact while public output remains damaged/precutover. It does not approve Query Planning execution, X5-X7 harness execution, source-provider/search/fetch/content-dereference/provider-network/parser execution, EvidenceCorpus/EvidenceItems/report/verdict behavior, cache/SR/storage, public exposure, live jobs, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.
- **Direct-text X7-J intake-artifact live-smoke result:** X7-K passed its narrow artifact/fail-closed objective on commit `6a728471`: jobs `0e3901f2c5e74af8bbde2383297d1b5e` and `7da66e060e104e88a958c858533f22c2` both executed `claimboundary-v2`, stayed public `4.0.0-cb-precutover` / `blocked_precutover`, wrote one Claim Understanding artifact and one X7-J intake artifact each, and exposed no X7-J/runtime artifact markers publicly. Important blocker: Claim Understanding still did not produce an accepted ClaimContract; job 1 was damaged (`claim_contract_validation_failed`) and job 2 was blocked (`no_valid_claim`). X7-K does not approve X3-B prompt edits, Query Planning execution, X5-X7 harness execution, source-provider/search/fetch/content-dereference/provider-network/parser execution, EvidenceCorpus/EvidenceItems/report/verdict behavior, cache/SR/storage, public exposure, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.
- **Latest Claim Understanding diagnosis:** X7-L is documented in `Docs/WIP/2026-05-17_V2_Slice_X7-L_Claim_Understanding_Live_Result_Diagnosis.md`. It identifies exact schema evidence for the German canary: the model emitted flat `input.selectedAtomicClaimIds` under `claimContract` instead of nested `claimContract.input.selectedAtomicClaimIds`, likely due dotted-field prompt wording. It also records the Bolsonaro canary as schema-valid `no_valid_claim`, likely requiring topic-neutral Gate 1 clarification for externally assessable compliance/fairness/standard questions. Recommended next step is a Captain-gated Claim Understanding prompt/contract repair approval package; no prompt/source edits are authorized yet.
- **Prepared Claim Understanding repair gate:** X7-M was reviewer-approved as a docs-only approval package at `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`. It defined the prompt/contract repair for the X7-K/X7-L failures: schema-exact nested `ClaimContract` output guidance, prepared-snapshot preservation, topic-neutral externally assessable question handling, strict rejection of flat dotted keys, no artifact/raw-payload expansion, and no live jobs. Captain authorization and final prompt-diff review are now recorded in the implementation state below.
- **Latest Claim Understanding repair implementation:** X7-M prompt/contract repair is implementation-complete after explicit Captain authorization. `V2_CLAIM_UNDERSTANDING_GATE1` now uses schema-exact nested direct-input and prepared-snapshot `ClaimContract` guidance, forbids literal flat dotted keys, and clarifies topic-neutral externally assessable direct-question handling without deciding truth/fairness/legal/compliance outcomes. Focused and broad Analyzer V2 tests plus build and gate validators passed. X7-M does not authorize live jobs; a post-repair smoke requires a separate reviewed execution package.
- **Prepared post-repair live-smoke package:** X7-N is reviewer-approved as a docs-only execution package at `Docs/WIP/2026-05-17_V2_Slice_X7-N_Post_X7M_Direct_Text_Live_Smoke_Execution_Package.md`. After package commit, clean worktree, runtime refresh, pre-run verifiers, and admin-route preflight, it may run at most the two exact Captain-approved direct-text canaries to verify hidden Claim Understanding `ClaimContract` acceptance after X7-M while public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`. It does not approve Query Planning execution, source/provider/search/fetch/content-dereference/parser execution, EvidenceCorpus/EvidenceItems/report/verdict/confidence behavior, cache/SR/storage, ACS/direct URL, public cutover, B3/2D-C, V1 work, or V1 cleanup.
- **X7-N live-smoke result:** first canary job `515865dd08c64fd7be501ba8d5ba0dc9` functionally showed accepted hidden Claim Understanding contracts and X7-J intake readiness for `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`, while public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` and exposed no runtime artifact markers. The result is not a passing gate because the job recorded dirty provenance (`a6f6a43ca4ce814af849914a6cbd5c3a24e7b5c7+0a06eb2f`) after unrelated docs changes reappeared during execution. Treat X7-N as `PROVENANCE_CONTAMINATED_PARTIAL_OBSERVATION`; the second X7-N canary was not run. A clean rerun requires a separately reviewed X7-N-A amendment and clean worktree proof before and after submission.
- **Prepared X7-N-A clean-provenance rerun amendment:** `Docs/WIP/2026-05-17_V2_Slice_X7-N-A_Clean_Provenance_Rerun_Amendment.md` is reviewer-approved for exactly one German canary rerun after amendment commit, clean worktree, runtime refresh, prompt/config hash recording, inherited admin-route preflight, and focused verifiers. It does not authorize the second X7-N canary or any downstream/public/source/parser/cache/SR/ACS/V1 behavior.
- **X7-N-A hard-fail and route-selection repair:** X7-N-A job `29b8f95866964b3c805e7df243f004ea` was cancelled at 70% after V1-only behavior appeared despite stored `pipelineVariant = claimboundary-v2`. Hidden Claim Understanding artifacts were empty, X7-J intake artifacts were not found, no result/report was stored, and the job is classified as `HARD_FAIL_ROUTE_SELECTION_V1_FALLBACK`. The repair changes explicit V2-disabled and unsupported variants from automatic V1 fallback to blocked/fail-closed selection; normal `claimboundary` jobs still run V1. X7-N-A is spent and must not be rerun.
- **Prepared provisioned proof gate:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B3_Provisioned_OCI_Deployment_Candidate_Proof_Package.md` is the draft docs-only package for running the B2 positive sandbox verifier on a provisioned rootless OCI host. It authorizes no source edits and no 2D-C parser implementation. It requires an independent pre-run image approval record whose exact image reference and digest match the configured verifier env image. Only `parser_isolation_verified` with `proofScope = deployment_candidate` and `runtimeAuthority = rootless_oci`, accepted by Architect/Security review, may allow a later 2D-C source package to be drafted.
- **Prepared B3 proof intake:** `Docs/WIP/2026-05-17_V2_Slice_7N3B3-2D-B3A_Provisioned_OCI_Proof_Intake_Runbook.md` is a docs-only runbook for future provisioned-host evidence intake and rejection. It does not approve running B3 locally, 2D-C, source edits, parser execution, live jobs, or product/public wiring.
- **Windows-local isolation decision:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-B4_Windows_Local_Isolation_Alternative_Decision.md` records the expert consensus that containers are not intrinsically required, but a proven OS-level denial boundary is required. B3/rootless OCI remains the deployment-candidate path. A Windows-local boundary may be proposed only as a separate local-only proof for inert text/JSON/passive HTML, and cannot unlock deployment readiness, product/public wiring, live jobs, Evidence Lifecycle consumption, or V1 cleanup.
- **Infomaniak deployment note:** If production remains on Infomaniak managed Node.js hosting, do not assume the required parser sandbox authority exists there. Deployment-candidate parser execution likely requires an Infomaniak container/custom infrastructure option or a separate isolated parser worker service; otherwise real fetched-byte parser execution stays disabled in deployment.
- **Provisional parser architecture:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2D-C0_Parser_Worker_Architecture_And_Provisional_Isolation.md` defines the parser-worker contract and P0/P1/P2 profile ladder, and C0-S1 now implements the P0 admission seam. P0 is intentionally not a security boundary: it may support fixture/control or synthetic inert parser-interface metadata only, while parser execution and real hostile fetched-byte parsing remain blocked until later reviewed P1/P2 and 2D-C gates.
- **Input capability roadmap:** V2 production readiness is staged. Direct text is the first production target. Simple web page text/HTML support requires later parser-worker, isolation, parsed-material lifecycle, and Evidence Lifecycle gates. PDF parsing is a later high-risk package and must not be bundled into first web-page support.
- **V1 posture:** V1 analyzer tasks remain maintenance-only for correctness, integrity, observability, and safety. Do not interpret V1 monitor work as a plan to continue or preserve V1 beyond V2 cutover.
- **Open planning risk:** Static `CAPTAIN_APPROVAL` remains planned temporary debt until UCM/task-policy-derived activation authority exists.

## April Monitor Context (2026-04-24)

- **Strategic direction:** V2 pipeline is intended to replace the V1 ClaimAssessmentBoundary pipeline. There is no longer a plan to “complete” V1; V1 work is maintenance-only (correctness, safety, integrity, and observability) until V2 reaches cutover readiness.
- **Quality and integrity remain first.** The next slice should improve evidence/provenance invariants, citation integrity, warning materiality, and Stage 1 diagnostics before broad optimization.
- **Stage 1 time-to-selection is still open.** Heavy URL/PDF/article inputs still spend roughly 60-122 seconds in preparation before Atomic Claim Selection becomes available. The current diagnosis is full evidence-seeded Stage 1 latency, not the recommendation call alone.
- **Stage 1 quality remains a targeted investigation track.** The Bundesrat one-claim collapse now has a validator-context fix, and a follow-up prompt fix separates independently verifiable status/finality/binding-effect qualifiers from branch chronology/procedure when needed. First live validation of that split showed the contract validator still forced a retry via a self-contradictory status-carrier assessment; a validator-prompt repair is now pending live validation. Broad URL/PDF inputs such as the SVP packet remain open. Fix from concrete failing packets only; do not weaken contract validation or introduce deterministic semantic branch detection.
- **Stage 2 evidence lifecycle/provenance is now a first-slice integrity priority.** Live runs showed normalization/fallbacks, cap drops, reconciliation deltas, and applicability/directness label inconsistencies that need invariant accounting.
- **Duplicate-run stability remains under monitor.** Clean Bundesrat reruns now split Stage 1 into the expected Volk/Parlament claims, but evidence volume and source concentration still varied downstream. Stage 4 deterministic-mode stochastic reruns were fixed; Stage 2 evidence-pool variance remains open.
- **Verdict citation integrity guard is implemented and under monitor.** The guard removes invalid/non-direct/bucket-mismatched citations and safely downgrades directional verdicts when the decisive citation side collapses.
- **Runner concurrency claiming is fixed.** API-side transactional claim prevents local Next.js runtime/process-local state from bypassing `FH_RUNNER_MAX_CONCURRENCY`.
- **Report markdown stub was fixed.** The clean validation job no longer showed the ClaimAssessmentBoundary markdown stub and kept admin-only `info` diagnostics out of user-facing quality warnings.
- **Live validation provenance must be tightened.** Future validation jobs must be committed, runtime-refreshed, and prompt/config-current before submission.
- **Monitor UX still has gaps.** `SUCCEEDED` plus progress `99`, long clustering/reconciler plateaus, and browser-control screenshot/tool availability issues remain documented but not fully resolved.

## Recent Changes (2026-04-24)

**Monitor-driven report, runner, and verdict integrity fixes:**
- Report markdown now renders real ClaimAssessmentBoundary content instead of the old stub and separates admin-only diagnostics from user-facing warnings.
- Stale pre-repair verdict direction diagnostics are suppressed after successful repair.
- Prepared Stage 1 failures preserve retry history for diagnosis.
- Stage 2 exact same-run relevance reuse and explicit budget exhaustion warning paths landed.
- Runner scheduling now uses API-side SQLite-transaction claiming before starting analysis.
- Claim-selection initialization no longer lets stale seeded `selectedClaimIds` override current recommendations before user interaction.
- Verdict citation integrity now removes invalid/non-direct/bucket-mismatched citations and safe-downgrades directional verdicts when decisive citations collapse.
- Stage 1 contract and single-claim atomicity validators now receive input-derived `distinctEvents` context, and the prompt reconciles that context before approving near-verbatim one-claim extractions.
- Clean validation job `d1689dfbd8ff46d98e76730bfd16fafb` completed on the post-runner-claim stack with `LEANING-TRUE` 68/70 and no user-visible warnings.
- Stage 4 deterministic mode now disables self-consistency sampling and lowers challenger sampling to the schema floor when `deterministic=true`, avoiding two stochastic verdict reruns and reducing cost/latency for the default profile.
- Stage 1 prompt/validator rules now allow a generic independent-status split: one thesis-direct status/modifier claim plus separate branch chronology/procedure claims when the qualifier and branch relation are independently verifiable. The contract validator prompt now also instructs per-claim drift fields not to reject the valid status carrier merely because branch chronology is preserved by sibling claims.

## Open Monitor Findings (2026-04-24)

- **Stage 1 latency:** still the dominant source of delayed claim selection on heavy inputs.
- **Stage 1 broad-input quality:** still needs concrete failing-packet analysis for omitted branches, bundled consequences, and contract-preservation failures. The SVP PDF job `3328ed201dd744148678efc015d7c33a` is the current broad-input packet; it failed closed as UNVERIFIED after omitting major thesis branches and a priority anchor.
- **Bundled status-plus-chronology canary:** needs live validation after the validator-prompt repair to confirm the Bundesrat input produces stable status/chronology atomization rather than mixed branch claims.
- **Stage 2 evidence lifecycle:** needs invariant accounting for source identity, provenance, normalization/fallbacks, cap drops, reconciliation deltas, and admission/drop reasons.
- **Evidence-pool variance:** duplicate clean-code runs on the same input still produced different evidence counts/source mixes; this is not closed by the Stage 4 deterministic fix.
- **Stage 3 / long stages:** concentration metrics and progress heartbeats are still needed for large evidence pools.
- **Runtime provenance:** dirty/later-runtime validation jobs must not be treated as clean validation.
- **Terminal progress:** investigate jobs ending `SUCCEEDED` at progress `99`.
- **Warning materiality:** continue auditing warning severity and visibility through `warning-display.ts`.
- **Deterministic semantic hotspot:** replace `claimNeedsPrimarySourceRefinement()` token-overlap logic with LLM assessment before extending it.
- **Browser tooling:** in-app screenshot capture and resumed `node_repl` availability were unreliable during monitoring; this is a tooling issue, not an app root cause.

---

## Current Focus (2026-04-15)

- **Phase 7 is the active bounded engineering track.** The immediate job is no longer “discover the problem”; it is to finish the next bounded Shape B slice on top of the now-hardened prompt/runtime surface.
- **Phase 7b groundwork is shipped.** Audit-vs-binding mode separation/persistence groundwork, binding anchors into Pass 2 and contract audit, and audit-mode regression coverage all landed on 2026-04-14.
- **The narrow prompt + Stage-1 hardening slice is shipped and live-validated locally.** `CLAIM_CONTRACT_REPAIR` is restored, prompt/runtime drift is corrected, and fresh treaty jobs on the fixed prompt hash now keep only the anchor-carrying claim instead of an inflated 3-claim set.
- **The current E2 packet is still not a reproduced closeout.** Treat `Docs/WIP/2026-04-14_Phase7_E2_Measurement.md` as architecturally supportive, not decisive empirical closure.
- **Broader Shape B remains incomplete.** The next bounded slice is claim-to-anchor preservation mapping plus validator evolution from post-hoc discovery to audit against pre-committed anchors.
- **Prompt rollout is still an operational risk.** Prompt runtime is DB-first/UCM-managed, not file-first. System-seeded prompts can auto-refresh; admin-owned prompts require explicit import/activate verification per environment.
- **Salience still rides the shared `understand` lane.** If salience quality needs a stronger model, the safe next move is a dedicated `modelSalience` / task key, not changing `modelUnderstand` or silently reusing `context_refinement`.
- **Phase 7 observability is still incomplete.** The pruning behavior is improved, but persisted telemetry still under-describes some Stage-1 events and provenance paths.
- **Grounding false-positive fixes remain in monitor mode, not active redesign.** Claim-local grounding scope, source-ID backfill, and the single-citation-channel contract are still the current baseline; the remaining gate is live monitoring and deployed validation.
- **Stage-5 narrative tension cleanup remains in monitor mode.** The first-pass cleanup is shipped; the next report-quality work stays upstream in Stage 2/3 evidence-pool quality, query anchoring, and boundary concentration.
- **UPQ-1 remains the main broader quality track outside Phase 7.** The strongest current upstream finding is seeded-evidence dominance, not cross-claim reallocation from `existingEvidenceSummary`.
- **Cross-linguistic neutrality remains the largest broader comparative quality gap.** Proposal 2 multilingual/report-language groundwork is shipped; the EN supplementary lane is still experimental/default-off and awaits validation/promotion gating.
- **Flat-Earth false-ambiguity remains review-ready and unimplemented.** The prompt-only narrowing is still available if the team wants a small non-Phase-7 slice.

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
- ⚠️ Phase 1 policies **disabled** as of 2026-03-05 (both set to `disabled` in active UCM config due to false-positive concerns). `warn_and_cap` softer mode remains only a deferred idea — see `Docs/ARCHIVE/PipelineV1/Quality_Improvement_Pending_fwd.md`
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

**Last Updated**: 2026-05-19
**Actual Version**: 2.11.0 (Code) | 3.0.0-cb (Schema) | `v1.0.0-poc` (Tag)
**Document Status**: High-level Alpha snapshot. Current prioritization lives in [Backlog](Backlog.md); historical sections above remain for context and must not override the canonical active queue.
