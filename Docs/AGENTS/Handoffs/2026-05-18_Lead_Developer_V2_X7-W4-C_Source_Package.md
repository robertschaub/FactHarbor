# 2026-05-18 — Lead Developer — V2 X7-W4-C Corpus-Admission Source Package

## Summary

Prepared the docs-only W4-C source package after W4-B commit `006a2785`.

Package:

`Docs/WIP/2026-05-18_V2_Slice_X7-W4-C_Corpus_Admission_Source_Package.md`

The package proposes the minimal implementation path for corpus-admission input only:

- pure corpus-admission core;
- runtime-owned W4-A readiness provenance;
- focused W4-A text-free `providerId` / `languageCode` metadata extension;
- focused tests and boundary guards;
- no product wiring;
- no artifact route;
- no live job;
- no EvidenceCorpus creation.

## Key Design Point

W4-A currently strips provider/language metadata. W4-C must not bypass W4-A by reading W3-B directly, so the package recommends a focused W4-A readiness extension carrying only `providerId` and `languageCode`.

This is structural metadata only, not source text, not evidence semantics, and not public output.

Package review result: reviewers returned `MODIFY`. Required changes were applied:

- pure-core/runtime-owner split is explicit;
- the unnecessary `source-material-admission-guard.ts` file was removed from the envelope;
- W4-A metadata extension must validate and leak-scan `providerId` / `languageCode`;
- W4-C must reject direct W3-B decisions/records/runtime outputs;
- boundary guards must prevent W4-C from importing W3-B runtime/source-material/route execution paths;
- W4-C exit conditions and post-W4-C next-decision rules are now explicit.
- Follow-up containment re-review required the W3-B import ban to apply to all W4-C source, not only pure core; the package was tightened accordingly.

Final re-review result: Product/quality/cost, architecture/maintainability, and security/containment reviewers approved after the modifications.

## Scope Preserved

W4-C does not authorize implementation until reviewed. It also does not authorize:

- product-route observability wiring;
- artifact sink or route;
- live jobs;
- W3-C source-material sweep;
- parser;
- EvidenceCorpus;
- EvidenceItems;
- extraction input;
- report/verdict/warning/confidence/public behavior;
- cache/SR/storage;
- retries;
- provider expansion;
- W2 endpoint migration;
- ACS/direct URL;
- V1 work or cleanup.

## Verification

Docs-only package. No source verifiers were run.

Planned after handoff/index updates:

- `npm run index`
- `git diff --check`
- `git status --short --untracked-files=all`

## Next Step

Run package review. If accepted, implement W4-C strictly inside the package envelope. If reviewers reject the W4-A metadata extension, stop and prepare a narrower W4-C package rather than bypassing W4-A or reading W3-B directly.
