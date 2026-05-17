# V2 Slice X7-M Claim Understanding Prompt/Contract Repair Approval Package

**Date:** 2026-05-17
**Status:** implementation complete under explicit Captain authorization; no further prompt/source edits authorized by this package
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `1ec1c75e` (`docs: diagnose v2 x7k claim understanding failures`)
**Parent packages:** X7-K direct-text X7-J live-smoke result, X7-L Claim Understanding live-result diagnosis.
**Gate type:** Captain-gated prompt/contract repair proposal.
**Review result:** LLM Expert APPROVE, Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE after tightening schema-exact skeletons, direct-input versus prepared-snapshot guidance, artifact/raw-payload non-goals, final prompt-diff review, package/file envelopes, cached diff hygiene, and future test assertions.
**Implementation result:** X7-M prompt/test implementation completed after Captain authorization on 2026-05-17. Final prompt diff received LLM Expert APPROVE, Architect APPROVE, and Code/package APPROVE. Implementation touched only `apps/web/prompts/claimboundary-v2.prompt.md`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`, and status/handoff/index documents.

## 1. Purpose

Define the narrow approval boundary for repairing the V2 Claim Understanding prompt contract after X7-K/X7-L.

X7-K proved that the product runner can reach hidden Claim Understanding and the X7-J intake observer while public V2 output remains damaged/precutover. X7-L then showed that meaningful downstream Evidence Lifecycle progress is blocked by Claim Understanding:

- one Captain-approved direct-text job produced a `claim_contract_validation_failed` damaged result because the model emitted a flat `input.selectedAtomicClaimIds` key under `claimContract` instead of the required nested `claimContract.input.selectedAtomicClaimIds`;
- one Captain-approved direct-text job produced a schema-valid `blocked/no_valid_claim` result for an externally assessable legal/fair-trial question.

This package prepares a prompt/contract repair. It does not itself authorize implementation.

## 2. Approval Requested

Approve implementation of X7-M only with the explicit Captain approval wording below.

```text
Approved to implement X7-M Claim Understanding prompt/contract repair under `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`, limited to `V2_CLAIM_UNDERSTANDING_GATE1` wording in `apps/web/prompts/claimboundary-v2.prompt.md` and focused Claim Understanding prompt/contract tests. The implementation may replace dotted-field output bullets with an explicit nested output skeleton and may clarify, in topic-neutral multilingual wording, that externally assessable compliance/standard/requirement questions can produce verifiable AtomicClaims. It may not mention canary topics, change schemas, relax validation, edit model/cache/gateway approvals, run source/provider/search/fetch/parser code, expose public V2 output, expand hidden artifacts, log raw prompt/provider payloads, run live jobs, touch cache/SR/storage, or perform V1 cleanup.
```

This approval text is required because `apps/web/prompts/` edits are analysis-prompt changes. General "continue" instructions and deputy consensus are not sufficient for implementation.

The final prompt diff must receive LLM Expert prompt review and Architect scope acceptance before implementation commit unless the exact final prompt text is quoted in this package and explicitly approved by the Captain.

## 3. Evidence Basis

Primary evidence:

- `Docs/WIP/2026-05-17_V2_Slice_X7-K_Direct_Text_X7J_Intake_Artifact_Live_Smoke_Execution_Package.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-K_Live_Smoke_Result.md`
- `Docs/WIP/2026-05-17_V2_Slice_X7-L_Claim_Understanding_Live_Result_Diagnosis.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-L_CU_Live_Result_Diagnosis.md`

Relevant source contracts inspected:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/src/lib/analyzer-v2/claim-understanding/schemas.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/model-adapter.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts`

## 4. Diagnosis To Repair

### F1 - Dotted-field ambiguity

Current `V2_CLAIM_UNDERSTANDING_GATE1` describes the accepted `claimContract` with bullets such as:

- `input.inputType`
- `input.inputValue`
- `input.resolvedInputText`
- `input.detectedLanguage`
- `input.selectedAtomicClaimIds`

The German direct-text canary produced a schema failure consistent with the model reading a dotted bullet as a literal field name:

- missing required nested field `claimContract.input.selectedAtomicClaimIds`;
- unrecognized flat key `input.selectedAtomicClaimIds` at `claimContract`.

Repair intent:

- remove ambiguity by presenting accepted output as a nested JSON object shape;
- explicitly say not to use dotted property names as literal JSON keys;
- keep the strict runtime schema unchanged.

### F2 - Overblocking externally assessable questions

The legal/fair-trial direct-text canary returned schema-valid `blocked/no_valid_claim`.

The intended V2 Claim Understanding behavior is that a direct question can still carry a verifiable proposition if it asks whether an action, decision, process, event, policy, or outcome complied with an externally assessable law, standard, criterion, requirement, documented procedure, or measurable condition.

Repair intent:

- clarify that such questions may be converted into neutral AtomicClaims without deciding truth;
- keep wording generic and multilingual-safe;
- do not introduce topic, country, person, region, domain, or canary-specific examples.

## 5. Proposed Prompt Changes

The future implementation may change only the `V2_CLAIM_UNDERSTANDING_GATE1` section.

### 5.1 Accepted Contract Shape

Replace the dotted-field bullet list for accepted `claimContract` with explicit nested skeletons.

The skeletons should be abstract and should use placeholders only. They should not include Captain-defined canary text or domain-specific examples. They must be schema-exact: no ellipsis keys, pseudo-fields, comments inside JSON, omitted required fields, or "when present" wording for required fields.

Candidate direct-input accepted structure:

```json
{
  "schemaVersion": "v2.claim_contract.0",
  "input": {
    "inputType": "text",
    "inputValue": "<copy supplied input value>",
    "resolvedInputText": "<copy supplied resolved text>",
    "detectedLanguage": "<copy supplied language>",
    "selectedAtomicClaimIds": ["AC_DIRECT_01"]
  },
  "inputGroundingSeed": {
    "source": "direct_input",
    "inputType": "text",
    "inputValue": "<copy supplied input value>",
    "resolvedInputText": "<copy supplied resolved text>",
    "detectedLanguage": "<copy supplied language>",
    "currentDate": "<copy supplied current date>",
    "acsSnapshotHash": null,
    "inputGroundingSeedHash": "<copy supplied grounding seed hash or null>"
  },
  "atomicClaims": [
    {
      "id": "AC_DIRECT_01",
      "statement": "<verifiable assertion preserving meaning and original language>",
      "selected": true,
      "source": "v2_claim_understanding",
      "gate1Status": {
        "status": "passed",
        "source": "v2_claim_understanding",
        "summary": "<concise contract status summary>",
        "reasons": []
      },
      "integrityEvents": []
    }
  ],
  "integrityEvents": [],
  "acsMigration": null
}
```

Candidate prepared-snapshot accepted structure:

```json
{
  "schemaVersion": "v2.claim_contract.0",
  "input": {
    "inputType": "text",
    "inputValue": "<copy supplied input value>",
    "resolvedInputText": "<copy supplied resolved text>",
    "detectedLanguage": "<copy supplied language>",
    "selectedAtomicClaimIds": ["<copy selected prepared claim id>"]
  },
  "inputGroundingSeed": {
    "source": "acs_prepared_snapshot",
    "inputType": "text",
    "inputValue": "<copy supplied input value>",
    "resolvedInputText": "<copy supplied resolved text>",
    "detectedLanguage": "<copy supplied language>",
    "currentDate": "<copy supplied current date>",
    "acsSnapshotHash": "<copy supplied ACS snapshot hash>",
    "inputGroundingSeedHash": "<copy supplied grounding seed hash or null>"
  },
  "atomicClaims": [
    {
      "id": "<copy selected prepared claim id>",
      "statement": "<copy selected prepared claim statement exactly>",
      "selected": true,
      "source": "acs_prepared_snapshot",
      "gate1Status": {
        "status": "passed",
        "source": "acs_prepared_snapshot",
        "summary": "<concise contract status summary>",
        "reasons": []
      },
      "integrityEvents": []
    }
  ],
  "integrityEvents": [],
  "acsMigration": {
    "sourceSchemaVersion": "prepared-stage1-v1",
    "status": "accepted",
    "selectedClaimFinalityPreserved": true
  }
}
```

The prompt should state:

- `claimContract` must be a nested object;
- dotted names in prose describe object paths only;
- do not use dotted path names as literal JSON keys;
- do not emit placeholder keys, ellipsis keys, comments, or pseudo-fields in JSON output;
- the gateway remains authoritative for hashes, provenance, prompt/model/config metadata, and ACS migration metadata.

### 5.2 Direct-Question Gate 1 Clarification

Add topic-neutral wording under the direct-input selection or Gate 1 rules:

- A direct question can contain a verifiable assertion when it asks whether an action, decision, process, event, policy, or outcome complied with an externally assessable law, standard, criterion, requirement, documented procedure, or measurable condition.
- Convert such input into one or more neutral AtomicClaims preserving the submitted meaning and original language.
- Do not decide truth, fairness, legality, or confidence.
- Return `blocked/no_valid_claim` only when no externally assessable assertion can be formed.

This wording must remain generic. It must not mention the live-smoke topics, people, countries, institutions, regions, or any equivalent substitutions.

## 6. File Envelope

If explicitly approved, X7-M implementation may touch only:

- `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`
- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- one X7-M implementation handoff under `Docs/AGENTS/Handoffs/`
- `Docs/AGENTS/index/handoff-index.json`

The future implementation should not need source changes outside tests. If the repair appears to require schema, adapter, model policy, gateway policy, runtime, API, UI, config, or package changes, stop and create a new reviewed package.

## 7. Explicit Non-Goals

X7-M must not:

- change `ClaimContractSchema`, `ClaimUnderstandingResultSchema`, or JSON schema fixtures;
- relax strict validation or accept flat dotted keys;
- add deterministic text-analysis logic, language-specific rules, regex classification, or keyword lists;
- mention or encode Captain canary topics in prompt text;
- change model, cache, gateway, approval, runtime activation, provider factory, or product wiring;
- change hidden runtime artifact schemas, artifact sinks, artifact routes, artifact projections, or public/admin serialization;
- add raw prompt text, rendered prompt text, provider request payloads, raw provider responses, raw model output, environment values, secrets, API keys, or expanded telemetry to artifacts, logs, public output, status docs, or handoffs;
- seed `claimboundary-v2` as a public/default prompt profile;
- run live jobs or expensive validation;
- execute Query Planning, X5-X7 harnesses, source-provider/search/fetch/content-dereference/provider-network/parser code, Source Reliability, cache IO, durable storage, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup;
- expose V2 public output as valid or alter UI/API/report/export behavior.

## 8. Review Questions

LLM Expert:

- Does the nested skeleton remove the dotted-field ambiguity without overconstraining useful language?
- Does the direct-question clarification preserve generic, multilingual, topic-neutral behavior?
- Does the package avoid teaching to the two live-smoke cases?

Architect:

- Does the repair preserve strict V2 contracts and the Claim Understanding -> Evidence Lifecycle handoff boundary?
- Are downstream gates still blocked until accepted `ClaimContract` output is proven?

Security/runtime:

- Does the package avoid public exposure, source/provider/parser execution, live jobs, cache/SR/storage, and artifact expansion?
- Are the stop conditions strong enough if implementation pressure expands scope?

Code/package:

- Is the file envelope enforceable?
- Are the verifier commands sufficient for a prompt/contract-only repair?

## 9. Required Verifiers For Future Implementation

Before committing an approved implementation:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git status --short --untracked-files=all -- apps/web/prompts apps/web/test/unit/lib/analyzer-v2/claim-understanding Docs/STATUS Docs/AGENTS
```

The implementation tests must explicitly assert:

- prompt guidance contains a nested `claimContract.input.selectedAtomicClaimIds` path and does not instruct literal flat dotted keys;
- strict schemas continue to reject flat dotted-key outputs instead of accepting or repairing them;
- prompt text contains no Captain canary topics or full Captain-defined input strings;
- direct-question guidance is generic and externally assessable without topic-specific examples;
- at least one abstract multilingual-safe/static scenario is represented without reusing X7-K topics;
- prepared-snapshot guidance still preserves selected claim IDs, prepared-snapshot source labels, accepted `acsMigration`, and direct-input `acsMigration: null`.

Do not run live jobs in X7-M implementation. If a post-repair smoke is needed, create a separate reviewed execution package after the implementation commit.

## 10. Completion Requirements For This Approval Package

Before committing this package:

- collect LLM Expert, Architect, Security/runtime, and Code/package review;
- record reviewer decisions in this file;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` as approval-package pointers only;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a package handoff under `Docs/AGENTS/Handoffs/`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- stage only the exact approval-package envelope:
  - `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`
  - `Docs/STATUS/Current_Status.md`
  - `Docs/STATUS/Backlog.md`
  - `Docs/AGENTS/Agent_Outputs.md`
  - one X7-M package handoff under `Docs/AGENTS/Handoffs/`
  - `Docs/AGENTS/index/handoff-index.json`
- run package verification commands:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

## 11. Current Recommendation

X7-M implementation is ready for focused commit after final verifier completion.

Do not run live jobs under X7-M. If post-repair smoke is needed, create a separate reviewed execution package after the implementation commit.

## 12. Implementation Closeout

Explicit Captain authorization was received in conversation on 2026-05-17:

```text
Prompt implementation authorized.
```

Implemented changes:

- `V2_CLAIM_UNDERSTANDING_GATE1` now treats direct questions about externally assessable laws, standards, criteria, requirements, documented procedures, or measurable conditions as potentially verifiable AtomicClaim inputs without deciding truth, fairness, legality, compliance, or confidence.
- Accepted `claimContract` guidance now uses schema-exact nested direct-input and prepared-snapshot JSON skeletons instead of dotted-field output bullets.
- Prompt guidance explicitly forbids literal flat dotted keys such as `input.selectedAtomicClaimIds`, placeholder markers, ellipsis keys, comments, or pseudo-fields in JSON output.
- Prompt contract tests pin nested `ClaimContract` guidance, canary-topic exclusion, generic direct-question wording, and prepared-snapshot/direct-input migration expectations.
- Claim contract tests pin strict rejection of flat dotted-key output drift.

Final prompt-diff reviews:

- LLM Expert: APPROVE.
- Architect: APPROVE.
- Code/package: APPROVE after the fairness wording was aligned and pinned.

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts` - PASS, 3 files / 39 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding` - PASS, 9 files / 86 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - PASS, 74 files / 523 tests.
- `npm -w apps/web run build` - PASS.
- `npm run validate:v2-gates` - PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` - PASS.

Known worktree caveat:

- Unrelated unstaged X7-J route/test edits exist outside the X7-M envelope and must be excluded from the X7-M commit unless separately reviewed.
