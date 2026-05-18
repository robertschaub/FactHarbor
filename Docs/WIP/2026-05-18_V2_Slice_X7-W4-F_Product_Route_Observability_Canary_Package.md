# V2 Slice X7-W4-F Product-Route Observability Canary Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live job blocked
**Owner:** Lead Developer / Captain Deputy
**Parent implementation packages:**

- `Docs/WIP/2026-05-18_V2_Slice_X7-W4-C_Corpus_Admission_Source_Package.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md`
- `Docs/WIP/2026-05-18_V2_Slice_X7-W4-E_EvidenceCorpus_Extraction_Readiness_Denial_Package.md`

**Parent implementation commits:** W4-C `471d230b`, W4-D `010fb04f`, W4-E `603dbac3`; latest accepted closeout `2ba80404`
**Live-job tranche:** 4 jobs remain. This package may propose exactly one post-implementation product-route canary, counted against that tranche, only after Steering approval and implementation verifiers pass.

## 1. Purpose

W4-D and W4-E are verifier-clean local implementation slices, but they are not yet proven through the product V2 route.

X7-W4-F should prove observability only:

```text
W3-B Source Material
  -> W4-A Source Material to EvidenceCorpus readiness
  -> W4-C Source Material corpus admission
  -> W4-D shell-only EvidenceCorpus
  -> W4-E extraction-readiness denial
  -> public V2 remains pre-cutover and blocked
```

The default path is product-route observability, not positive source-text authorization.

W4-F should not make extraction possible. It should record enough hidden/admin-only evidence to show that the existing W4-C/W4-D/W4-E contracts are reachable in the product route after W3-B and that their closed posture remains intact.

## 2. Baseline Facts

W3-B passed one approved canary:

- job `0964b2da1f534821b2e01bc7f50a7fff`;
- runtime commit `871d6b606c3301c40860bb32ed0886598495f24d`;
- input `Using hydrogen for cars is more efficient than using electricity`;
- public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`;
- W2 produced `9` hidden structural candidates and `13742` bytes;
- W3-A materialized `8` previews;
- W3-B produced one hidden/admin-only `wikimedia_page_summary_extract_text` Source Material record.

W4-C is locally verifier-clean as a text-free source-material corpus-admission input gate.
W4-D is locally verifier-clean as a text-free `EvidenceCorpus` shell.
W4-E is locally verifier-clean as a denial-only extraction-readiness consumer over producer-owned W4-D shell output.

## 3. Recommended W4-F Shape

Implement a narrow product-route observability bridge:

- call the existing W4-C, W4-D, and W4-E runtime owners from the product V2 hidden route after the existing W4-A readiness decision;
- record one bounded hidden/admin-only product-route observability artifact for the W4-C/W4-D/W4-E chain;
- expose that artifact only through an authenticated internal no-store route;
- keep the public result envelope unchanged as `4.0.0-cb-precutover` / `blocked_precutover`;
- run no canary until Steering approves the implemented package and all verifiers/preflights pass.

The preferred artifact shape is one combined chain artifact rather than three separate route families. That keeps W4-F focused on reachability and avoids multiplying public-adjacent admin surfaces before there is analytical content.

## 4. Explicit Non-Goals

X7-W4-F does not authorize:

- implementation before Steering Board review;
- live canary before Steering Board review, implementation commit, runtime refresh, route preflight, and verifier pass;
- more than one canary;
- positive source-text authorization;
- source text in any new artifact;
- extraction input;
- EvidenceItems;
- parser execution;
- packet/frame consumption;
- report, verdict, warning, confidence, truth percentage, or public compatibility behavior;
- public output changes;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- provider expansion;
- W2 endpoint migration;
- new source-material fetches;
- W3-C source-material widening;
- Tier 2 full page/source/html fetch;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 5. Candidate Source Envelope For Later Implementation

This package does not approve source edits.
If accepted, a later implementation should stay inside this candidate envelope unless reviewers change it.

Production:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`, if the existing orchestrator test owns this product-route assertion
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Status/handoff/index files may be added only as completion artifacts.

Any source text authorization, extraction input, EvidenceItem, parser, report/verdict/warning/confidence, public surface, UI/report/export surface, non-artifact API surface, cache/SR/storage, provider, W2 endpoint, prompt/config/model/schema, ACS/direct URL, or V1 file edit is outside this package.

## 6. Required Product-Route Chain

The later implementation should add this product-route sequence inside the existing hidden V2 runtime try/catch boundary:

```text
sourceMaterialEvidenceCorpusReadiness
  -> buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision(...)
  -> buildEvidenceLifecycleEvidenceCorpusShellDecision(...)
  -> buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision(...)
  -> recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact(...)
```

The chain must use existing runtime-owned owners and provenance readers.
It must not reconstruct decisions from route output, docs, logs, JSON copies, public result fields, or raw source material.

The public damaged/precutover envelope must not depend on the W4-F artifact write.
Artifact write failure, oversize, bad ledger id, route failure, or W4-chain failure must be hidden/admin-only diagnostic state and must never improve or degrade the public result into a meaningful V2 report.

## 7. Expected Artifact Shape

Recommended artifact version:

```text
v2.evidence-lifecycle.evidence-corpus-observability-artifact.x7w4f
```

Required top-level fields:

- `artifactVersion`;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- ledger id, run id, and created UTC;
- source `product_v2_orchestrator_after_evidence_corpus_extraction_readiness_denial`;
- W4-C corpus-admission decision or sanitized exact projection;
- W4-D shell decision or sanitized exact projection;
- W4-E extraction-readiness denial decision or sanitized exact projection;
- product execution closure flags;
- public cutover status `blocked_precutover`.

Required closed execution flags:

- `sourceTextAuthorized: false`;
- `extractionInputCreated: false`;
- `evidenceItemGenerated: false`;
- `parserExecuted: false`;
- `cacheRead: false`;
- `cacheWrite: false`;
- `storageWrite: false`;
- `sourceReliabilityCalled: false`;
- `reportGenerated: false`;
- `verdictGenerated: false`;
- `warningGenerated: false`;
- `confidenceGenerated: false`;
- `publicSurfaceWritten: false`.

Forbidden artifact fields:

- source-material text;
- raw provider JSON;
- raw URL;
- raw page title;
- raw page key;
- provider-returned URL;
- request URL;
- headers;
- cookies;
- secrets;
- stack traces;
- low-level exception text;
- parser packet or parsed material;
- LLM prompt text;
- extraction input packet;
- EvidenceItems;
- evidence statements;
- Source Reliability score;
- probative value;
- claim direction;
- verdict label;
- truth percentage;
- confidence;
- warning;
- report prose;
- public compatibility fields.

## 8. Expected Decision Statuses

A passing W4-F product-route canary must show all of these hidden/admin-only statuses on the same ledger:

| Stage | Expected status | Expected stop reason / posture |
|---|---|---|
| W2 | `candidate_provider_network_completed` | nonzero hidden structural candidates and nonzero bytes |
| W3-A | `source_candidate_preview_partial` or stronger accepted materialization status | at least one materialized runtime-owned locator |
| W3-B | `source_material_page_summary_completed` | exactly one bounded hidden Source Material record is enough |
| W4-A | `source_material_structurally_admissible_evidence_corpus_gate_closed` | `not_stopped`, EvidenceCorpus build still closed |
| W4-C | `source_material_admitted_to_corpus_input_gate_closed` | `not_stopped`, `evidenceCorpus: null`, `extractionInput: null`, `evidenceItems: []` |
| W4-D | `evidence_corpus_shell_created_extraction_gate_closed` | `not_stopped`, `kind: "shell_only"`, closed corpus text access |
| W4-E | `extraction_denied_shell_only` | `shell_only_corpus`, `extractionInput: null`, `evidenceItems: []` |
| Public V2 | `4.0.0-cb-precutover` / `blocked_precutover` | `report_damaged`, no hidden-marker leak |

## 9. Pass Criteria For The One Proposed Canary

If implementation is later approved and committed, W4-F passes only if one product-route live canary:

- uses the exact Captain-defined input `Using hydrogen for cars is more efficient than using electricity`;
- runs on clean committed/refreshed runtime from the W4-F implementation commit;
- reaches `SUCCEEDED`;
- records hidden/admin-only artifacts through W3-B and W4-F on the same ledger;
- shows W2 nonzero hidden structural candidates and nonzero bytes;
- shows W3-B completed with one bounded hidden Source Material record;
- shows W4-C, W4-D, and W4-E statuses exactly as defined in Section 8;
- shows all closed execution flags as false;
- exposes the W4-F artifact only through the authenticated internal no-store route;
- returns unauthenticated artifact-route access as `401` with no-store headers;
- returns missing-ledger reads as `404` with no-store headers;
- returns malformed ledger ids as `400` with no-store headers;
- keeps public result `_schemaVersion` at `4.0.0-cb-precutover`;
- keeps public cutover status `blocked_precutover`;
- keeps public result damaged/precutover and not a meaningful V2 report;
- leaks no hidden W4-C/W4-D/W4-E/W4-F markers into public result JSON, report markdown, UI, export, or compatibility projection;
- consumes exactly one live job from the 4-job tranche, leaving 3.

## 10. Stop Criteria

Stop and return to Steering Board without a second canary if any of these occur:

- implementation needs source edits outside the approved envelope;
- W3-B does not produce exactly the bounded hidden Source Material path needed for this proof;
- W4-A is absent or not structurally admissible;
- W4-C does not reach `source_material_admitted_to_corpus_input_gate_closed`;
- W4-D does not create a `shell_only` corpus with closed text access;
- W4-E does not deny extraction as `extraction_denied_shell_only`;
- any artifact contains source text, raw provider payload, raw URL/title/key, extraction input, EvidenceItems, report/verdict/warning/confidence data, or public compatibility fields;
- any closed execution flag is true;
- public V2 changes away from `4.0.0-cb-precutover` / `blocked_precutover`;
- hidden markers leak publicly;
- route preflight fails;
- local verifiers fail and the root cause is not a narrow W4-F formatting/type/test issue;
- runtime cannot be refreshed cleanly from the committed W4-F implementation.

## 11. Required Verifiers Before Any Future Canary

Before committing a W4-F implementation package:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-observability-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

If an orchestrator-specific test is amended, include it in the focused verifier set.

Before the one proposed canary:

- confirm `git status --short --untracked-files=all` is clean;
- confirm `git rev-parse HEAD` matches the implementation commit used for runtime;
- refresh/restart runtime from that commit;
- run the product runner route preflight used by recent W2/W3 canaries;
- run authenticated and unauthenticated W4-F artifact-route preflight;
- confirm public V2 route still prepares `pipeline: claimboundary-v2` and remains pre-cutover;
- confirm no unrelated dirty docs/tooling/source files exist.

Do not run expensive LLM tests.
Do not run the canary from this review package.

## 12. Review Questions

Architect:

- Is a single combined W4-F chain artifact the right observability shape, or should W4-C/W4-D/W4-E remain independently routed?
- Does W4-F prove enough product-route reachability before any source-text authorization package?
- Are the pass/stop criteria tight enough to prevent accidental extraction semantics?

Security/runtime:

- Are the forbidden fields and no-store/admin-only route rules sufficient?
- Does the candidate source envelope avoid creating a public-adjacent source text channel?
- Should the W4-F artifact carry full decisions or sanitized exact projections?

Code/package:

- Is the orchestrator edit acceptable as observability-only product-route wiring?
- Are the tests and boundary guards enforceable without broadening W4-D/W4-E?
- Is one route/sink for the chain enough to keep admin artifact surface maintainable?

Product/quality/cost:

- Is one live job worth spending to prove W3-B through W4-E reachability after local verifier-clean slices?
- Is the known W3-B successful input the right canary for continuity?
- Should W4-F be required before any positive source-text authorization package?

## 13. Completion Requirements For This Docs Package

Before committing this docs package:

- append `Docs/AGENTS/Agent_Outputs.md`;
- create a completion handoff under `Docs/AGENTS/Handoffs/`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as a pointer to the review package;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
```

Do not run live jobs or expensive LLM tests.
