# V2 Slice X7-Q Claim Understanding Language-Metadata Repair Package

**Date:** 2026-05-17
**Status:** deputy-approved docs-only implementation package; source/prompt implementation authorized inside this envelope only
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `c6b2f39b` (`docs: record v2 x7p live smoke result`)
**Parent packages/results:** X7-M Claim Understanding prompt/contract repair, X7-N-D clean legal-question smoke, X7-O implementation and hardening, X7-P partial live-smoke result.
**Gate type:** prompt/contract/schema repair approval package for accepted direct-text ClaimContract language metadata.
**Review result:** APPROVE.

## 1. Purpose

X7-P cleanly proved the product V2 route can reach X7-O and write an admin-only no-store Query Planning pre-execution observation artifact. The formal X7-P gate did not pass because X7-O correctly stayed blocked:

```text
preexecutionObservation.status = blocked_pre_query_planning
blockedReason = language_signal_unavailable
sourceLanguageSignal = unavailable
```

The accepted Claim Understanding result and X7-J intake were otherwise valid. This exposes a Claim Understanding contract gap: an accepted direct-text `ClaimContract` can still carry unavailable language metadata (`und` or equivalent) into downstream Evidence Lifecycle, where Query Planning preconditions require a usable source-language signal.

X7-Q defines the narrow repair. It is not a live-smoke package and does not authorize a rerun.

## 2. Approval Requested

Approve implementation of X7-Q after reviewer acceptance.

Captain prompt authorization is required because this package changes `apps/web/prompts/claimboundary-v2.prompt.md`. The active Captain authorization for this package is the 2026-05-17 conversation instruction: `Prompt implementation authorized.` Implementation may proceed only within the wording intent of this package. If the exact prompt diff needs materially different semantics, stop and prepare a revised prompt package.

The repair may:

- update `V2_CLAIM_UNDERSTANDING_GATE1` prompt guidance so accepted direct-text `ClaimContract.input.detectedLanguage` and `ClaimContract.inputGroundingSeed.detectedLanguage` must be concrete non-empty, non-`und` source-language signals;
- state that if the supplied direct-input seed language is `und`, the model must infer the primary language of the submitted/resolved input from the text itself without translating, without English-only assumptions, and without changing claim wording;
- state that mixed-language direct input should use the primary language of the selected AtomicClaims and preserve original-language claim statements;
- keep prepared-snapshot behavior separate: prepared snapshot language metadata remains governed by the prepared snapshot contract until an ACS gate is separately reviewed;
- add strict schema/runtime validation so an accepted direct-input `ClaimContract` with blank or `und` language metadata is rejected before it can become an accepted handoff;
- add focused tests proving prompt guidance, schema rejection, model-adapter retry behavior, and X7-O no-longer-silent-acceptance of direct-input `und` metadata.

This repair must not use deterministic language detection in code. The LLM owns source-language inference. Code may only validate structural contract values such as blank/nonblank and non-`und`.

This package does not authorize:

- Query Planning runtime execution;
- Query Planning input-envelope, prompt-packet, hash construction, prompt rendering, model/provider call, or provider callback creation beyond existing tests;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, public output changes, or public cutover;
- cache IO, durable storage, Source Reliability, ACS/direct URL execution;
- model/cache/gateway approval flips;
- live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, V1 cleanup, or PipelineV1 archive/governance changes.

## 3. Diagnosis

Evidence:

- X7-P job `77f2e9f237e34263a09be50264db3682` reached `SUCCEEDED` on clean commit `03e2bafb`.
- First runner preparation event was `Preparing input (pipeline: claimboundary-v2)`.
- Claim Understanding artifact was accepted.
- X7-J artifact was `intake_ready` with selected AtomicClaim count `2`.
- X7-O artifact was present, admin-only, no-store, and non-public.
- X7-O blocked as `language_signal_unavailable`.

Relevant current prompt wording:

- Direct-input accepted skeleton currently says `"detectedLanguage": "<replace with copied language>"`.
- The runtime input seed can carry `detectedLanguage: "und"` for direct input.
- Copying `und` into an accepted direct-input ClaimContract satisfies current `z.string().min(1)` schema but fails Query Planning language preconditions.

Root-cause hypothesis:

- The V2 Claim Understanding prompt asks the model to copy language metadata even when the supplied seed is `und`.
- The V2 ClaimContract schema currently validates `und` as structurally non-empty, so accepted direct-input contracts can pass runtime validation while still being unusable for Query Planning.

Rejected shortcut:

- Do not make only X7-O read fallback language from `PipelineRunContext` or another observer-only path. Later Query Planning input-envelope code also reads ClaimContract language fields and would still block. A local X7-O fallback would make the observer diverge from the real execution precondition.

## 4. Proposed Prompt Repair

Modify only `V2_CLAIM_UNDERSTANDING_GATE1`.

Add topic-neutral, multilingual-safe guidance:

- For accepted direct input, `claimContract.input.detectedLanguage` and `claimContract.inputGroundingSeed.detectedLanguage` must be concrete source-language signals, not blank and not `und`.
- If `inputGroundingSeedJson.detectedLanguage` is already concrete, copy that value.
- If `inputGroundingSeedJson.detectedLanguage` is `und`, infer the primary language from the submitted/resolved direct input text itself. Use a concise stable language code or label. Do not translate the claim and do not change the claim statement language.
- For mixed-language direct input, use the primary language of the selected AtomicClaims.
- If the model cannot responsibly identify a source-language signal for an otherwise accepted direct input, it must not emit an accepted ClaimContract with `und`; it should follow the normal valid-output recovery policy and allow gateway validation to reject invalid accepted output rather than inventing unrelated metadata.

Update direct-input accepted skeleton placeholders from copied language to non-`und` source-language signal wording. Keep prepared-snapshot skeleton copied-language wording unless a separate ACS language package is reviewed.

Do not mention any Captain canary topics, countries, people, legal proceedings, or live-smoke input strings.

## 5. Proposed Contract/Runtime Repair

Add structural validation for direct-input `ClaimContract` language metadata.

Allowed implementation direction:

- refine `ClaimContractSchema` so a direct-input contract is invalid when:
  - `inputGroundingSeed.source === "direct_input"` and either language field is blank or normalizes to `und`;
  - direct-input `input.detectedLanguage` and `inputGroundingSeed.detectedLanguage` disagree after trimming, unless a reviewed reason exists to permit divergence.
- accepted-result validation must inherit this rule through `ClaimContractSchema`; do not create a second accepted-result-only language validator.
- keep prepared-snapshot/ACS contracts out of this direct-input rule unless they already satisfy the direct-input condition.
- expose validation failures as existing schema validation failures; do not add a new public warning or user-facing report behavior.
- keep retry behavior inside the existing model-adapter schema-retry path. Do not add a new repair loop, fallback language detector, or post-hoc language mutation.

X7-O and the Query Planning input envelope remain downstream defense-in-depth observers. After the global `ClaimContractSchema` repair, deliberately constructed raw direct-input contracts with `und` or blank language should be rejected as `claim_contract_invalid` before language-precondition evaluation. `language_signal_unavailable` remains a downstream reason for inputs that pass the contract schema but still lack a usable language signal under a separately reviewed contract path such as prepared snapshots.

This validation is structural contract validation, not text-analysis logic. It must not determine language using regex, keyword lists, or rules.

## 6. File Envelope

Allowed implementation files after reviewer acceptance:

- `Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/claim-understanding/schemas.ts`
- `apps/web/test/fixtures/analyzer-v2/schemas/claim-contract-v2.schema.json`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-Q package or implementation handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

If implementation appears to require model-policy changes, runtime activation changes, Query Planning input-envelope production changes, source/provider/parser code, public result code, API/UI/report/export code, package files, or scripts, stop and create a separate reviewed package.

The ClaimContract JSON schema fixture is in scope because this is a ClaimContract contract repair. Other schema fixtures are out of scope unless tests prove they embed the changed contract directly and must be synchronized to avoid drift.

## 7. Required Tests

Prompt tests must prove:

- direct-input accepted skeleton and instructions require a concrete non-`und` language signal for accepted direct input;
- if the seed language is `und`, prompt guidance instructs LLM source-language inference from the direct input without translation;
- prepared-snapshot copied-language behavior is not accidentally rewritten as direct-input inference;
- prompt text contains no Captain canary topics or full Captain-defined input strings;
- no English-only language assumptions, regex/keyword instructions, or topic examples are introduced.

ClaimContract/schema tests must prove:

- accepted direct-input `ClaimContract` with `input.detectedLanguage: "und"` is rejected;
- accepted direct-input `ClaimContract` with `inputGroundingSeed.detectedLanguage: "und"` is rejected;
- blank/whitespace direct-input language values are rejected;
- valid direct-input concrete language still passes;
- prepared-snapshot behavior remains unchanged unless it also violates existing schema rules;
- flat dotted-key rejection from X7-M still holds.

Model-adapter tests must prove:

- first provider attempt returning an accepted direct-input contract with `und` language is treated as schema invalid;
- the existing schema retry can accept a second valid direct-input contract with a concrete language signal;
- telemetry/status remains an existing schema-validation path, not a new semantic repair or warning path.

X7-O/preexecution tests must prove:

- the observer blocks deliberately constructed raw direct-input `und`/blank language as `claim_contract_invalid` after the global ClaimContract schema repair;
- accepted direct-input concrete language still reaches `structural_prerequisites_observed_not_executed_precutover`;
- public damaged/precutover output still adds no new public fields, no hidden ClaimContract/artifact content, and no new language metadata beyond the existing V2 precutover public contract.

Query Planning input-envelope tests must prove:

- deliberately constructed raw direct-input `und`/blank language is blocked as `claim_contract_invalid` before accepted input-envelope construction;
- concrete direct-input language still reaches structural preconditions;
- this stays contract-only and does not render prompts, construct prompt packets, call models, call providers, or execute source acquisition.

Boundary guard must prove:

- no deterministic language-detection helpers, language keyword lists, or regex language classifiers were introduced in Analyzer V2 or Analyzer V2 runtime;
- no new imports from Query Planning runtime/prompt/model/source/provider/parser/cache/SR/public/V1 paths were added by the repair.

## 8. Verifiers

Before committing an approved implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all -- apps/web/prompts apps/web/src/lib/analyzer-v2/claim-understanding apps/web/test/unit/lib/analyzer-v2 Docs/STATUS Docs/AGENTS Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md
```

Do not run live jobs in X7-Q. A post-repair X7-P rerun needs a separate reviewed execution package after implementation commit and runtime refresh.

Docs-only approval package verifier before committing this package:

```powershell
npm run index
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
git status --short --untracked-files=all -- Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md Docs/STATUS Docs/AGENTS
git diff --name-only --staged
```

The docs-only approval commit must stage only:

- `Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-Q_Language_Metadata_Repair_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## 9. Review Questions

LLM/semantic:

- Is it acceptable for the Claim Understanding LLM to infer a concrete source-language signal from direct input when the supplied seed is `und`?
- Does the proposed wording avoid English-only assumptions, topic leakage, and translation-as-prerequisite behavior?

Architect:

- Is direct-input language metadata part of the Claim Understanding contract rather than an X7-O-only observer concern?
- Does schema validation avoid divergence between X7-O observation and later Query Planning input-envelope preconditions?

Security/runtime:

- Does the package avoid new raw text/artifact exposure, public output changes, runtime execution, cache/SR/storage, and live jobs?
- Is rejecting `und` as an accepted direct-input language signal safe as a fail-closed behavior?

Code/package:

- Is the file envelope enforceable?
- Are schema/prompt/model-adapter tests sufficient without adding a separate repair mechanism?

## 10. Reviewer Decisions

Implementation is forbidden unless all review slots below are `APPROVE`.

| Role | Reviewer | Date | Decision | Required Changes / Notes |
|---|---|---:|---|---|
| LLM/semantic | Galileo | 2026-05-17 | APPROVE | LLM-owned language inference from direct input is acceptable; no deterministic language detection, English-only assumption, translation prerequisite, or canary/topic leakage is authorized. |
| Architect | Kuhn | 2026-05-17 | APPROVE | Direct-input language metadata belongs in the ClaimContract contract. Query Planning input-envelope coverage and ClaimContract JSON schema fixture are in scope. Global `ClaimContractSchema` enforcement with downstream `claim_contract_invalid` defense is accepted. |
| Security/runtime | Descartes | 2026-05-17 | APPROVE | Public-output guard is clarified. Enforcement surface is explicit: global `ClaimContractSchema`; accepted-result validation inherits it; X7-O/QP raw direct-input `und`/blank cases block as `claim_contract_invalid`. |
| Code/package | Parfit | 2026-05-17 | APPROVE | Captain prompt authorization is recorded, docs-only verifier/staged-path assertion is present, and schema scope includes `claim-contract-v2.schema.json`. |
