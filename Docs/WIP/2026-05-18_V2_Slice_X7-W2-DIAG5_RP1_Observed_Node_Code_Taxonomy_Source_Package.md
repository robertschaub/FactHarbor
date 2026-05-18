# V2 Slice X7-W2-DIAG5 RP1-Observed Node Code Taxonomy Source Package

**Date:** 2026-05-18
**Status:** Claude Opus-reviewed and approved; source edits allowed only after package commit
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Result.md`
**Baseline:** `fd963941` (`docs: record v2 w2 rp1 result`)

## 1. Purpose

X7-W2-RP1 classified the remaining post-DIAG4 W2 transport failure as:

```text
rp1_observed_unmapped_standard_node_code
[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]
```

DIAG5 is the narrow source package that converts that single RP1-observed standard Node-style code family into bounded W2 transport taxonomy. It must not fix the underlying network behavior, broaden endpoint/client design, or make W2 provider-network success more likely. It only removes the current diagnostic blind spot where product W2 reports:

```text
transportFailureClass = unknown_transport_failure
transportFailurePhase = unknown_phase
transportErrorShape = node_error_code_present
nodeErrorCodeCategory = other_known
```

DIAG5 is not a live-observation package, endpoint/client repair, source-material package, W2 completion-semantics repair, report-quality gate, public-readiness gate, provider expansion, or V1-cleanup gate.

## 2. Debate Result And Decision

Post-RP1 review consensus:

- Claude Opus 4.6: `APPROVE` proceeding to DIAG5. Source/test literals are acceptable because taxonomy mapping must match actual Node error-code strings, but raw literals must stay out of narrative docs, product/admin/public artifacts, logs, and chat.
- Security/runtime review: `APPROVE` DIAG5, with source/test promotion allowed only in a reviewed package and only as mapping literal plus synthetic fixture.
- Implementation/architecture review: `APPROVE` DIAG5 before endpoint/client redesign, with a separate LS6-style live observation after implementation if runtime confirmation is needed.

Lead Developer decision: proceed with DIAG5 as a narrow mapping package. Do not redesign the endpoint/client path yet.

## 3. Raw Literal Handling Policy

DIAG5 may promote the RP1-observed raw code literal into source and focused tests only.

Allowed raw-literal locations:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts` mapping logic;
- focused unit tests in the approved test envelope.

Forbidden raw-literal locations:

- WIP package prose;
- result docs;
- status files;
- handoffs;
- Agent_Outputs;
- commit messages;
- chat responses;
- product runtime artifacts;
- admin route JSON;
- public API/UI/report/export output;
- logs, screenshots, or helper scripts committed to the repo.

Committed narrative docs must continue to use:

```text
[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]
```

The source/test diff is the only reviewed place where the raw literal may appear.

## 4. Taxonomy Contract

DIAG5 may add exactly one bounded category family for the RP1-observed standard Node-style code:

| Contract field | Approved value |
|---|---|
| `nodeErrorCodeCategory` | `address_validation_failure` |
| `transportFailureClass` | `address_validation_failure` |
| `transportFailurePhase` | `address_selection` |
| `transportErrorShape` | `node_error_code_present` |

Rationale: the RP1-observed code is a standard Node-style address validation failure in the product-parity `https.request` path before response or byte handling. The category is intentionally generic and not named after the raw literal.

Any additional raw code, category, failure class, phase, or semantic repair requires a separate reviewed package.

## 5. Source Envelope

Allowed production edits:

- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`
- `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`

Allowed test edits:

- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts` only if pass-through expectations need a focused enum update
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts` only if pass-through expectations need a focused enum update
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts` only if hidden artifact allowlist expectations need a focused enum update
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts` only if hidden route allowlist expectations need a focused enum update
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts` only if product-route artifact assertions need a focused enum update
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if a focused boundary/leak guard update is required

Allowed governance/status files:

- this source package
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG5_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## 6. Required Behavior

DIAG5 implementation must:

- apply `/debt-guard` compact path before source edits because this is a targeted diagnostic repair;
- map only the RP1-observed standard Node-style code to the section 4 category;
- keep W2 completion/damaged/success semantics unchanged;
- keep public V2 output unchanged and pre-cutover/damaged;
- expose only bounded enum values in hidden W2/admin artifacts;
- keep raw Node codes, raw error messages, stacks, causes, URLs, paths, query text, headers, IP addresses, provider payloads, source/candidate data, and content bytes out of product/admin artifacts;
- use injected synthetic test errors only;
- prove serialized transport outcomes and W2 hidden artifacts do not contain the raw literal;
- preserve all existing DIAG2/DIAG3/DIAG4 mappings.

## 7. Explicitly Forbidden

DIAG5 must not:

- submit live jobs;
- call the approved Wikimedia endpoint;
- call any live provider host;
- add local, loopback, or operator probes;
- add committed scripts or helper tools;
- fix or redesign the custom lookup/client behavior;
- change endpoint, timeout, headers, redirect policy, proxy policy, credentials, provider allowlist, query construction, or W2 budget;
- change W2 damaged/success semantics;
- add retries, redirects, proxies, provider SDKs, credentials, cache IO, durable storage, Source Reliability, parser execution, source material, content dereference, EvidenceCorpus/evidence/report/verdict/warning/confidence generation, public output, ACS/direct URL behavior, V1 reuse/work/cleanup, package files, or lockfiles;
- change prompts, configs, models, schemas outside the enum type contract above, or provider policies.

## 8. Completion Bar

DIAG5 implementation is complete only if:

- the enum contract includes `address_validation_failure` and no additional new category/failure-class values;
- the RP1-observed standard Node-style code maps to:
  - `nodeErrorCodeCategory: address_validation_failure`;
  - `transportFailureClass: address_validation_failure`;
  - `transportFailurePhase: address_selection`;
  - `transportErrorShape: node_error_code_present`;
- existing DNS, connection, network, host, address-family, TLS, HTTP parser, timeout, cancellation, code-absent, and non-error cases keep prior semantics;
- hidden/public leak tests prove the raw literal, raw error message, stack, URL, secret, and payload markers are not serialized;
- no source material/content/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior changes occur.

DIAG5 does not require and does not authorize a live job. If live confirmation is needed after implementation, create a separate reviewed LS6-style package.

## 9. Required Verifier Set

Before completion, run:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

Do not run expensive LLM tests, validation batches, live jobs, or additional local probes for DIAG5.

## 10. Post-Implementation Direction

After DIAG5 implementation is committed, the next runtime confirmation, if needed, must be a separate LS6-style package.

Expected LS6 diagnostic objective:

- one committed/refreshed live job only;
- same Captain-defined input discipline as LS2-LS5 unless a new package explicitly chooses otherwise;
- W2 may still fail structurally, but attempts should no longer report `nodeErrorCodeCategory: other_known` or `transportFailurePhase: unknown_phase` for the RP1-observed failure;
- public V2 output must remain damaged/precutover;
- raw code must not appear in public output, admin artifacts, status docs, handoffs, logs, or chat.

If LS6 still reports `other_known` / `unknown_phase`, stop and move to endpoint/client design review rather than DIAG6.

## 11. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG5_RP1_Observed_Node_Code_Taxonomy_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Focus on whether DIAG5 is the right next step after RP1:

- source/test raw-literal promotion is allowed only inside this reviewed taxonomy package;
- narrative docs and product/admin/public artifacts still never expose the raw literal;
- the new category `address_validation_failure` is generic and correctly scoped;
- the source envelope is narrow;
- W2 completion semantics stay unchanged;
- no live jobs, provider expansion, endpoint/client repair, retries, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, public output, ACS/direct URL, V1 work, or V1 cleanup are authorized.

## 12. Review Decision

| Role | Reviewer | Date | Decision | Notes |
|---|---|---:|---|---|
| Claude Opus 4.6 senior architect/security | Claude Opus 4.6 via `scripts/agents/invoke-claude.cjs` | 2026-05-18 | APPROVE | Reviewer confirmed DIAG5 is correctly sequenced after RP1, source/test raw-literal promotion is properly bounded, narrative/product/admin/public artifacts remain raw-literal-free, `address_validation_failure` is generic and correctly scoped, the source/test envelope is narrow, W2 completion semantics stay unchanged, no live job or endpoint/client repair is authorized, and the verifier set is complete. |
