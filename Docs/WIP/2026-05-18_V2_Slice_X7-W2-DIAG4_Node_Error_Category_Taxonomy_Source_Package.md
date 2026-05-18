# V2 Slice X7-W2-DIAG4 Node Error Category Taxonomy Source Package

**Date:** 2026-05-18
**Status:** implementation complete; pending commit
**Owner:** Lead Developer / Captain Deputy
**Baseline:** `084a4e8d` (`docs: record v2 w2 ls4 live result`)
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS4_DIAG3_Transport_Phase_Live_Result.md`

## 1. Purpose

X7-W2-LS4 proved that the committed/refreshed product V2 route reaches W2 and captures DIAG3 fields on all provider-network attempts. It also showed all three attempts still fail before final-address validation:

```text
transportFailureClass = unknown_transport_failure
transportFailurePhase = unknown_phase
transportErrorShape = node_error_code_present
nodeErrorCodeCategory = other_known
candidateCount = 0
byteCount = 0
```

DIAG4 closes the known taxonomy gap left by DIAG3: several bounded transport failure classes already exist in the V2 transport contract but cannot currently be emitted because the approved `nodeErrorCodeCategory` enum does not distinguish their standard Node/POSIX error-code families.

DIAG4 is not a provider-network success fix, source-quality gate, report-quality gate, live-smoke package, public-readiness gate, provider expansion, source material/content dereference package, or W2 completion-status repair.

## 2. Decision

Use a narrow source package before any local raw-code probe or additional live job.

Consolidated review result:

- Claude Opus 4.6 senior architect/security recommended `DIAG4` enum/mapping expansion first and returned `APPROVE` for that direction.
- Implementation/cost review agreed that the simplest high-quality path is bounded structural category mapping, with no provider expansion and no live job by default.
- Security/boundary review preferred a local raw-code probe first, but accepted that raw-code inspection is only safe as a transient operator-local diagnostic outside product artifacts. As Captain Deputy, I am deferring raw-code inspection because DIAG4 can reduce the known ambiguity without exposing raw codes, adding probes, or increasing provider/source authority.

DIAG4 must remain category closure only. If a later reviewed LS5 still records `nodeErrorCodeCategory: other_known`, then a separate local-only probe package may be considered.

### Claude Opus Review

Claude Opus 4.6 reviewed the package and initially returned `MODIFY`, requiring the `EPROTO` mapping to be scoped because generic POSIX `EPROTO` is not always TLS-specific. Section 3 now states that `EPROTO` maps to `tls_protocol` only in this package's HTTPS-only transport path.

Claude Opus 4.6 then re-reviewed the package and returned `APPROVE` with no required changes.

## 3. Mapping Contract

DIAG4 may add exactly these `nodeErrorCodeCategory` values:

| New category | Transport failure class | Transport phase | Standard raw-code family covered by tests |
|---|---|---|---|
| `network_unreachable` | `network_unreachable` | `socket_connect` | `ENETUNREACH` |
| `host_unreachable` | `host_unreachable` | `socket_connect` | `EHOSTUNREACH` |
| `address_family_failure` | `address_family_failure` | `address_selection` | `EAFNOSUPPORT`, `EADDRNOTAVAIL` |

DIAG4 may also map these standard TLS protocol code families to the existing `tls_protocol` category:

- `EPROTO`
- codes starting with `ERR_SSL_`

`EPROTO` is classified as `tls_protocol` only within this package's HTTPS-only transport path. This package does not claim that generic POSIX `EPROTO` is always TLS-specific in other transports.

The standard raw-code literals above are allowed in this source package and tests as generic taxonomy fixtures. They must not be emitted in product/admin artifacts. The actual LS4 runtime raw code remains intentionally unknown and must not be inferred or documented.

Any additional category, raw-code family, phase, failure-class mapping, or category rename requires a separate review before source edits continue.

## 4. Source Envelope

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
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts` only if a focused export/import/enum guard update is required

Allowed governance/status files:

- this source package
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG4_Source_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## 5. Required Behavior

DIAG4 implementation must:

- keep W2 completion semantics unchanged;
- keep public V2 output unchanged and pre-cutover/damaged;
- expose only bounded enum values in hidden W2/admin artifacts;
- keep raw Node codes, raw error messages, stacks, causes, URLs, paths, query text, headers, IP addresses, provider payloads, source/candidate data, and content bytes out of product/admin artifacts;
- use injected synthetic test errors only;
- prove the new categories map to the exact failure class and phase listed in section 3;
- prove existing sanitized leakage protections still hold.

## 6. Explicitly Forbidden

DIAG4 must not:

- submit live jobs;
- call the approved Wikimedia endpoint;
- call any live provider host;
- add local or loopback network probes;
- add scripts or operator tools for raw-code inspection;
- fetch source material, response bodies, candidate titles/excerpts/URLs, or content bytes;
- change W2 damaged/success semantics;
- add retries, redirects, proxies, provider SDKs, credentials, cache IO, durable storage, Source Reliability, parser execution, EvidenceCorpus/evidence/report/verdict/warning/confidence generation, public output, ACS/direct URL behavior, V1 reuse/work/cleanup, package files, or lockfiles;
- change prompts, configs, models, schemas outside the enum type contract above, or provider policies.

## 7. Completion Bar

DIAG4 implementation is complete only if:

- the enum contract includes the three new categories in section 3 and no others;
- the transport mapping returns the section 3 phase and failure class for injected synthetic cases;
- existing DNS, connection, TLS, HTTP parser, timeout, cancellation, code-absent, and non-error cases keep their prior semantics;
- hidden/public leak tests prove raw error code/message/stack/URL/secret markers are not serialized;
- no W2 source material/content/parser/cache/SR/storage/EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior changes occur.

DIAG4 does not require and does not authorize a live job. If live confirmation is needed after implementation, create a separate reviewed LS5-style package.

## 8. Required Verifier Set

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

Do not run expensive LLM tests, validation batches, or live jobs for DIAG4.

## 9. Reviewer Prompt

Review `Docs/WIP/2026-05-18_V2_Slice_X7-W2-DIAG4_Node_Error_Category_Taxonomy_Source_Package.md`.

Return `approve`, `modify`, or `reject`.

Focus on whether DIAG4 is the correct next step after LS4:

- category closure is safer than local raw-code probing before the next live observation;
- the source envelope is narrow;
- the mapping table is complete enough but not speculative;
- raw codes stay out of product/admin artifacts;
- W2 completion semantics stay unchanged;
- no live jobs, provider expansion, source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence, public output, ACS/direct URL, V1 work, or V1 cleanup are authorized.

## 10. Implementation Closeout

DIAG4 implementation completed inside the approved source/test envelope.

Production changes:

- added exactly three `nodeErrorCodeCategory` enum values:
  - `network_unreachable`
  - `host_unreachable`
  - `address_family_failure`
- mapped `ENETUNREACH`, `EHOSTUNREACH`, `EAFNOSUPPORT`, and `EADDRNOTAVAIL` to the approved categories, failure classes, and phases;
- mapped HTTPS-only `EPROTO` and `ERR_SSL_*` code families to existing `tls_protocol`;
- kept W2 completion semantics unchanged.

Test changes:

- added injected synthetic error-code cases for the new categories;
- added TLS alias coverage for `EPROTO` and `ERR_SSL_*`;
- strengthened leak assertions so serialized outcomes must not include the raw test code literals, URL/secret markers, or stack marker.

Claude Opus 4.6 reviewed the implementation diff and returned `PASS` with no findings.

Verifier results:

```text
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts
PASS - 2 files / 11 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
PASS - 8 files / 110 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
PASS - 43 files / 256 tests

npm -w apps/web run test -- test/unit/lib/analyzer-v2
PASS - 88 files / 621 tests

npm -w apps/web run build
PASS

npm run validate:v2-gates
PASS

node scripts/validate-v2-gate-register.mjs --self-test
PASS

git diff --check
PASS
```

No live jobs were run for DIAG4. DIAG4 does not prove W2 provider-network success; a later LS5-style package would be required to observe whether the real product-route failure now maps to one of the new categories or remains `other_known`.
