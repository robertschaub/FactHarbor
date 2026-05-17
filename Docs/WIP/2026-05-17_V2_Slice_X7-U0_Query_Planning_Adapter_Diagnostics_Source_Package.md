# V2 Slice X7-U0 Query Planning Adapter Diagnostics Source Package

**Date:** 2026-05-17
**Status:** implementation-complete; focused source package ready for follow-up diagnostic smoke
**Owner:** Lead Developer / Captain Deputy
**Trigger:** X7-T-S `PARTIAL_X7_T_S_QUERY_PLANNING_SCHEMA_VALIDATION_FAILED`

## 1. Purpose

X7-T-S proved that the product V2 path reaches hidden Query Planning runtime/model invocation, but the Query Planning result was damaged by `schema_validation_failed`.

The current X7-S Query Planning runtime artifact records only the damaged status. It does not expose the adapter attempt validation details needed to distinguish:

- malformed JSON or fenced/non-JSON text;
- missing required fields;
- enum drift;
- wrong nesting;
- query-entry content validation;
- truncation/finish issues if already available;
- prompt/schema mismatch versus adapter/schema implementation issue.

X7-U0 adds bounded, sanitized, admin-only adapter attempt diagnostics to the existing hidden Query Planning runtime artifact. It does not change Query Planning acceptance rules, prompt text, schema contracts, model routing, provider behavior, retry behavior, source execution, or public output.

## 2. Decision

Deputy review consensus:

- Architect: diagnostics first; prompt repair without exact failure path is speculative.
- Security/runtime: approve only bounded admin-only diagnostics, no raw provider output or prompts.
- Code/package: use the existing adapter attempts and artifact route; keep source envelope narrow.
- LLM/semantic: one diagnostic canary is cheaper and safer than blind prompt patching.

## 3. Approved Source Envelope

Implementation may touch only:

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`
- focused tests for that artifact sink and existing Query Planning route/artifact behavior
- boundary/public non-leak tests if needed for the new diagnostic field names
- status/handoff/index docs required by protocol

If implementation proves the artifact sink cannot safely derive diagnostics from existing `adapterOutcome.attempts`, stop and draft a revised package before editing `model-adapter.ts`, `runtime.ts`, route code, prompts, config, schemas, or provider factory code.

## 4. Diagnostic Contract

Add a bounded field such as `adapterAttemptDiagnostics` to the X7-S Query Planning runtime artifact.

Allowed diagnostic content:

- attempt number;
- adapter attempt status (`accepted`, `parse_failure`, `invalid_schema`, `provider_error`, or existing status values);
- prompt content hash already present in adapter attempts;
- bounded provider telemetry already allowed in hidden artifacts;
- failure category derived from attempt status;
- issue count;
- first few sanitized structural issues:
  - issue path using structural field names only;
  - issue code;
  - bounded generic issue message.

Forbidden diagnostic content:

- raw provider output;
- raw provider request/response bodies;
- rendered prompt text or prompt section text;
- user input text beyond IDs already carried in existing artifacts;
- source URLs, source content, search results, parser output, EvidenceItems, reports, verdicts, confidence values;
- secrets, headers, env values, API keys, stack traces, SDK raw error objects;
- unbounded strings.

The diagnostic field must remain hidden/admin-only through the existing authenticated no-store route and must not appear in public job compatibility output, reports, exports, UI, or API public responses.

## 5. Required Tests

Focused verifier expectations:

- artifact builder/sink includes bounded diagnostics for invalid-schema and parse-failure adapter attempts;
- diagnostics exclude raw provider output and remain bounded;
- damaged Query Planning artifacts still report zero query entries and blocked source-acquisition handoff;
- authenticated internal route returns the diagnostic field with `Cache-Control: no-store`;
- unauthenticated and wrong-key route access still returns `401`;
- public job/compatibility output does not contain diagnostic markers.

## 6. Non-Authorization

X7-U0 does not authorize:

- prompt edits;
- config/model/schema edits;
- provider factory changes;
- retries or model escalation;
- live jobs;
- source/search/fetch/parser/SR/cache IO;
- durable artifact storage;
- EvidenceCorpus, EvidenceItems, sufficiency, warning, report, verdict, confidence, or public result generation;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 7. Follow-Up Gate

After X7-U0 implementation is committed and verified, a separate X7-U1 diagnostic live-smoke package may authorize a bounded canary rerun to capture the schema-failure diagnostics.

Only after X7-U1 should the team decide whether the repair belongs in prompt text, schema, adapter normalization, provider configuration, or another layer.

## 8. Implementation Result

X7-U0 was implemented inside the approved source envelope:

- `adapterAttemptDiagnostics` was added to the hidden X7-S Query Planning runtime artifact.
- Diagnostics are derived only from existing `adapterOutcome.attempts`.
- Attempt diagnostics include attempt number, status, prompt-content hash, bounded provider telemetry, failure category, issue count, and bounded sanitized structural issues.
- URL-like text, email-like text, and long quoted literals are redacted in diagnostic messages.
- Damaged Query Planning artifacts still report zero query entries, no source-language policy, and blocked source-acquisition handoff.
- The existing authenticated internal no-store artifact route returns the new diagnostic field.
- Boundary guards now explicitly allow only the shared pure V2 `isRecord` utility import for the X7-S runtime artifact sink.

Verifier result:

- Focused artifact/route tests passed.
- Full `analyzer-v2-runtime` unit slice passed.
- Full `analyzer-v2` unit slice passed after a boundary-guard allowlist correction.
- Internal Analyzer V2 artifact route tests passed.
- Web build passed.
- V2 gate-register validator and self-test passed.
- `git diff --check` passed.

X7-U0 did not edit prompts, config, model policy, schemas, provider factory, acceptance logic, retries, source execution, public output, cache/SR/storage, evidence/report/verdict/confidence behavior, ACS/direct URL, or V1 code. X7-U0 did not run live jobs.
