# V2 Slice X7-W4-E EvidenceCorpus Extraction Readiness Denial Package

**Date:** 2026-05-18
**Status:** Steering Board review package only; implementation and live jobs blocked
**Owner:** Lead Developer / Captain Deputy
**Parent implementation package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md`
**Parent implementation commit:** `010fb04f`
**Live-job tranche:** 4 jobs remain. This package proposes no live job.

## 1. Purpose

X7-W4-D created the first hidden/admin-only `EvidenceCorpus` shell from producer-owned W4-C corpus admission.
That shell is deliberately text-free and non-analytical:

- `evidenceCorpus.kind: "shell_only"`;
- `corpusTextAccess: "closed"`;
- `semanticExtractionAuthorized: false`;
- `evidenceItemExtractionAuthorized: false`;
- `extractionInput: null`;
- `evidenceItems: []`.

X7-W4-E should define the consumer-side extraction-readiness denial contract before any extraction input, parser path, EvidenceItem generation, report, verdict, confidence, warning, or public behavior is considered.

The key invariant is:

```text
A shell-only EvidenceCorpus is a manifest, not extraction input.
```

W4-E should make this invariant mechanically hard to bypass by requiring downstream consumers to receive an explicit denial-only readiness decision, not just a non-null corpus object.

## 2. Expert Review Consolidation

Claude Opus 4.6 reviewed the next-step choices after W4-D commit `010fb04f` and recommended the denial-only W4-E shape.

Consolidated recommendation:

- draft W4-E as a closed extraction-readiness denial package over W4-D shell only;
- do not use W4-E to authorize source text, extraction input, parser execution, EvidenceItems, report/verdict/warning/confidence, public behavior, or product observability;
- add W4-D shell runtime provenance in the later implementation so W4-E consumes only producer-owned shell decisions;
- split any future positive extraction-readiness or source-text authorization path into a later reviewed package.

Rejected alternatives:

- Source-text authorization is premature because W4-D has not approved text access or extraction input.
- Product observability/artifact routing is premature because W4-D has no live job and no product-route observability approval.
- Another generic readiness marker would not add enough value unless it explicitly becomes the consumer-side denial contract.

## 3. Explicit Non-Goals

X7-W4-E does not authorize:

- implementation before Steering Board review;
- live jobs;
- product-route observability wiring;
- artifact sink or artifact route;
- source text;
- source-material widening;
- W3-C Source Material sweep;
- additional source-material fetches;
- multiple Source Material records;
- second provider;
- W2 endpoint migration;
- source-text authorization;
- extraction input;
- EvidenceItems;
- LLM evidence extraction;
- semantic relevance assessment;
- parser execution;
- full page/source/html fetch;
- report, verdict, warning, confidence, truth percentage, or public compatibility behavior;
- cache IO;
- Source Reliability;
- durable storage;
- retries;
- ACS or direct URL execution;
- prompt, config, model, schema, gateway-policy, or cache-policy edits;
- V1 reuse, V1 work, or V1 cleanup.

## 4. Recommended Architecture

Recommended flow:

```text
W3-B runtime-owned Source Material
  -> W4-A runtime-owned readiness
  -> W4-C runtime-owned corpus-admission input
  -> W4-D runtime-owned EvidenceCorpus shell
  -> W4-E extraction-readiness denial
  -> extraction remains closed
```

Recommended implementation split for a later source package:

- pure core receives a shell-only corpus decision plus explicit runtime ownership posture;
- runtime provenance marks W4-D shell decisions as producer-owned only in the W4-D owner;
- W4-E runtime owner reads W4-D shell provenance and calls the pure core;
- copied, JSON-round-tripped, spread, `structuredClone`, reconstructed, route-derived, docs/log, and post-mark mutated W4-D shell decisions fail closed.

W4-E must not read W3-B Source Material, W4-A readiness, or W4-C admission directly.
The only allowed upstream input is producer-owned W4-D shell output.

## 5. Denial-Only Contract

Recommended contract name:

```text
EvidenceCorpusExtractionReadinessDenial
```

Recommended decision version:

```text
v2.evidence-lifecycle.evidence-corpus-extraction-readiness-denial.x7w4e
```

The contract must be denial-only.
It must not include a positive `ready`, `eligible`, `approved`, `authorized`, or `executable` status.

Recommended statuses:

- `extraction_denied_shell_only`;
- `extraction_denied_corpus_text_access_closed`;
- `extraction_denied_extraction_input_absent`;
- `extraction_denied_semantic_extraction_unauthorized`;
- `extraction_denied_evidence_item_extraction_unauthorized`;
- `extraction_denied_corpus_not_runtime_owned`;
- `extraction_denied_corpus_post_mark_mutated`;
- `extraction_denied_corpus_status_not_positive`;
- `extraction_denied_corpus_kind_unsupported`;
- `extraction_denied_corpus_lineage_invalid`;
- `extraction_denied_structural`.

Recommended stop reasons:

- `shell_only_corpus`;
- `corpus_text_access_closed`;
- `extraction_input_absent`;
- `semantic_extraction_not_authorized`;
- `evidence_item_extraction_not_authorized`;
- `runtime_ownership_missing`;
- `corpus_post_mark_mutated`;
- `w4d_shell_not_created`;
- `unsupported_corpus_kind`;
- `shell_lineage_inconsistent`;
- `structural_exception`.

Forbidden statuses or stop reasons:

- `ready`;
- `available`;
- `eligible`;
- `approved`;
- `authorized`;
- `executable`;
- `source_text_available`;
- `extraction_input_available`;
- `evidence_available`;
- `live_eligible`.

## 6. Required Output Shape

Recommended top-level fields:

- decision version;
- visibility `internal_admin_only`;
- public pointer exposure `forbidden`;
- status and stop reason;
- parent W4-D decision version, status, stop reason, and shell version;
- parent W4-D shell id;
- parent W4-C admission lineage summary from the W4-D shell;
- `evidenceCorpusKind: "shell_only"`;
- `corpusTextAccess: "closed"`;
- `semanticExtractionAuthorized: false`;
- `evidenceItemExtractionAuthorized: false`;
- `extractionInput: null`;
- `evidenceItems: []`;
- downstream gate `evidence_item_extraction_denied_shell_only`;
- public cutover status `blocked_precutover`;
- closed execution flags proving parser/cache/SR/storage/EvidenceItems/report/verdict/warning/confidence/public behavior remained false.

Forbidden fields:

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

## 7. Denial Matrix

W4-E must fail closed for:

| Condition | Expected posture |
|---|---|
| W4-D shell decision missing | denied |
| W4-D shell decision not runtime-owned | `extraction_denied_corpus_not_runtime_owned` |
| W4-D shell decision copied via JSON, spread, `structuredClone`, reconstruction, docs/log/admin route | denied |
| W4-D shell decision positive-looking but post-mark mutated | `extraction_denied_corpus_post_mark_mutated` |
| W4-D shell status not `evidence_corpus_shell_created_extraction_gate_closed` | denied |
| W4-D `evidenceCorpus` absent | denied |
| W4-D `evidenceCorpus.kind` not exactly `shell_only` | `extraction_denied_corpus_kind_unsupported` |
| W4-D corpus text access not `closed` | denied |
| W4-D semantic extraction flag not false | denied |
| W4-D evidence-item extraction flag not false | denied |
| W4-D extraction input not null | denied |
| W4-D evidence item list not empty | denied |
| W4-D lineage missing or inconsistent | `extraction_denied_corpus_lineage_invalid` |
| Attempt to read W3-B, W4-A, or W4-C directly | blocked by boundary guard |
| Attempt to carry source text, parser packet, EvidenceItem, report/verdict/warning/confidence/public field | blocked |

## 8. Candidate Source Envelope For Later Implementation

This package does not approve source edits.
If accepted, a later implementation should stay inside this candidate envelope unless reviewers change it:

Production:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-extraction-readiness-denial.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-provenance.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/evidence-corpus-extraction-readiness-denial.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-provenance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Status/handoff files may be added only as completion artifacts.

Any product route, artifact route, public surface, source text, extraction input, EvidenceItem, parser, prompt/config/model/schema, cache/SR/storage, provider, ACS/direct URL, or V1 file edit is outside this package.

## 9. Required Future Tests

A later implementation package must include tests for:

- positive W4-D shell maps to denial-only extraction readiness;
- non-runtime-owned W4-D shell fails closed;
- JSON, spread, `structuredClone`, and reconstructed W4-D shell decisions fail closed;
- post-mark mutated W4-D shell fails closed;
- W4-D blocked statuses fail closed;
- absent `evidenceCorpus` fails closed;
- forged non-`shell_only` corpus kind fails closed;
- attempted source text, extraction input, EvidenceItems, report/verdict/warning/confidence/public fields fail closed;
- all closed-execution flags remain false;
- no status or stop reason implies readiness, eligibility, approval, authorization, execution, evidence availability, source-text availability, or live eligibility;
- pure core imports no runtime/product/public/provider/parser/cache/SR/storage/V1 modules;
- runtime owner imports only the W4-E pure core and W4-D shell provenance, plus the existing W4-D owner file if needed for marking.

## 10. Required Future Guards

Boundary guard coverage must prove:

- pure W4-E core imports only W4-D shell types/core if needed;
- pure W4-E core does not import `analyzer-v2-runtime`;
- W4-E runtime owner does not read W3-B Source Material, W4-A readiness, or W4-C admission directly;
- W4-E code has no prompt/config/model/schema/default JSON changes;
- no source/provider/search/fetch/parser/cache/SR/storage/product/public/API/UI/report/export imports;
- no artifact sink or route imports;
- no V1 analyzer/prompt/type imports;
- no barrel export into product-reachable analyzer-v2 APIs;
- all public cutover flags remain blocked/precutover;
- all extraction/evidence/report/verdict/warning/confidence/public flags remain false.

## 11. Review Questions

Architect:

- Is denial-only W4-E the right next boundary after W4-D?
- Is the proposed W4-D shell provenance enough to enforce producer-owned shell consumption?
- Does the contract avoid committing prematurely to a positive source-text authorization path?

Security/runtime:

- Are copied, route-derived, reconstructed, and post-mark mutated shell decisions blocked enough?
- Are the forbidden fields and imports complete?
- Is the denial-only status set safe from accidental execution/readiness interpretation?

Code/package:

- Is the candidate source envelope narrow enough?
- Are tests and boundary guards enforceable without product wiring?
- Should the W4-D owner be amended only to mark shell provenance, or should W4-E create a separate owner wrapper without touching W4-D owner behavior?

Product/quality/cost:

- Does W4-E add useful maintainability and safety before extraction work?
- Is there any report-quality value lost by adding one more denial contract before positive extraction readiness?
- Is the no-live-job posture correct?

## 12. Completion Requirements For This Docs Package

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
