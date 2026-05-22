# V2 HighJump HJ37 Bounded Serper Link Source Material

**Date:** 2026-05-22
**Status:** Steer-Co approved for immediate HighJump implementation
**Owner:** Captain Deputy / Lead Developer

## Decision

HJ36 moved the German asylum aggregate path from zero Source Material to two
bounded Serper preview records, but W5 still returned
`hidden_no_extractable_evidence`. The packet was only `390` bytes and contained
provider snippet material, not the claim-bearing page text.

Steer-Co consensus: do not loosen W5 further. Add one bounded Source Material
capability at the existing Serper collector seam: fetch the provider-owned
result link for already-admitted Serper preview candidates, extract bounded
plain visible text, and keep all public/default projections redacted.

## Debt-Guard

DEBT-GUARD INVENTORY

Symptom: HJ36 job `e0907032ccaf4dab8b5001d6fb3db502` reached W5 with two
source-content packets / `390` bytes and no schema/model failure, then produced
zero EvidenceItems.

Verifier: authenticated admin stop summary and hidden W5 artifact show W5
`hidden_no_extractable_evidence`, source packet count `2`, input packet bytes
`390`, and source kind `provider_search_result_preview_text`.

Likely recent change surface: W3-B Serper preview Source Material admission,
not Query Planning or W5 prompt shape.

Existing mechanisms: Serper preview collector already has the raw provider link
while processing the provider response; Source Material records already carry
hidden text with hash/length/provenance-only default projections; W5 already
consumes mixed source-content packets.

Debt signals: Source Material has multiple historical gates and artifact routes.
Adding a new route or parallel fetch owner would increase debt.

Constraints: no public/default text leak, no cache/SR/storage, no parser engine,
no browser/JS rendering, no V1 reuse, no second provider, no ACS/direct URL user
support, no report/verdict behavior change.

Causal classification: `missing-capability` in the existing Serper Source
Material seam. Preview snippets are not enough source material.

Chosen fix: add bounded provider-link page-text materialization inside the
existing Serper collector and Source Material record contract.

Rejected alternatives: further W5 prompt loosening; more query prompt edits;
new provider; new route; full HTML/source/PDF parser.

Net complexity impact: small increase, accepted as temporary HighJump debt with
retirement pressure once a unified source-material fetch policy exists.

Removal / merge trigger: before public cutover, merge Serper linked-page Source
Material into a unified source-material fetch policy or replace it with a
provenance-grade source-strength contract.

## Scope

Allowed:

- one new Source Material kind for bounded provider-linked page text;
- Serper result-link fetch only while the raw provider response is in memory;
- HTTPS GET only, no credentials, no cookies, no proxy, no redirects;
- bounded response bytes, timeout, public-address DNS/final-address validation;
- structural HTML-to-visible-text cleanup without semantic classification;
- hash/length/provenance-only default admin projection;
- focused tests and prompt contract wording for the new kind.

Not allowed:

- user-supplied direct URL support;
- JavaScript rendering, browser automation, PDF parsing, packet/frame parser;
- cache/SR/storage, retries, provider expansion, W2/W3 endpoint migration;
- public API/UI/report/export/compatibility exposure;
- report/verdict/warning/confidence behavior changes;
- V1 reuse or cleanup.

## V2 SCORECARD IMPACT

Advances report-value reachability by providing claim-bearing source material
where HJ36 proved snippet-only material was insufficient. It does not claim
report-quality acceptance by itself.

## V2 RETIREMENT LEDGER IMPACT

HJ37 increases pressure to merge preview, linked-page, OpenAlex, and Wikimedia
source-material paths into one source-material policy before public cutover.

## V2 CONSOLIDATION GATE

This package is acceptable only because it uses the existing Serper collector
and W3-B Source Material record shape. If implementation requires a new route,
parallel artifact sink, or broad orchestration path, stop and reconvene
Steer-Co.

Latest debt-sensor status before implementation: `advisory_warn`
(`2026-05-22T19:29:48.153Z`) for known V2/source/test/docs/boundary-guard
footprint and consolidation-marker warnings.

## Verifier Plan

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
npm run debt:sensors
npm -w apps/web run build
npm run index
git diff --check
```

## Live Policy

After a clean focused implementation commit, refresh runtime and run exactly one
HJ37 validation job for:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Budget before HJ37: `13` remaining after HJ36. The HJ37 canary consumes one.

## Stop Conditions

- public/default/admin-default/log/error text leak;
- runtime source mismatch or dirty provenance before submission;
- linked-page fetch needs redirects, credentials, retries, browser/JS execution,
  parser execution, cache/SR/storage, or raised public exposure;
- W5 still has zero EvidenceItems after source packet bytes materially increase;
- fetched text causes noisy/unsupported EvidenceItems rather than direct
  claim-bearing extraction.
