# 2026-05-18 — Lead Developer — V2 X7-W4-B EvidenceCorpus Source Material Admission Design Package

## Summary

Prepared the docs-only W4-B design package after W4-A commit `b7fa607b`.

Package:

`Docs/WIP/2026-05-18_V2_Slice_X7-W4-B_EvidenceCorpus_Source_Material_Admission_Design_Package.md`

The package recommends defining the first EvidenceCorpus source-material admission contract before W3-C source-material widening. It authorizes no implementation and no live jobs.

## Decision Basis

Post-W4A debate result:

- Security/containment reviewer: W4-B first.
- Product/quality/cost reviewer: W4-B first.
- Architecture/implementation-sequencing reviewer: W4-B first.
- Claude Opus 4.6 was attempted twice through the required wrapper, but both calls timed out and returned no review result.

Consolidated decision: W4-B should precede W3-C because W3-B already proved one bounded Source Material path and W4-A closed the EvidenceCorpus gate. More page summaries would add source-text/network breadth before the admission contract says what distribution evidence matters.

Package review result: reviewers returned `MODIFY`. Required changes were applied:

- W4-C is narrowed to core admission + runtime provenance + tests/guards by default.
- Optional artifacts/routes/product observability require separate justification and must remain metadata-only, text-free, admin-only, no-store, and non-executable input.
- W4-C must keep `evidenceCorpus: null`, `evidenceCorpusBuildAuthorized: false`, no source text output, no runner changes, no live job, and no `EvidenceCorpus` naming for the first output.
- W3-C trigger criteria are now concrete distribution unknowns tied to the admission contract.
- Follow-up re-review found two stale review questions and one single-record wording issue; these were corrected so text carriage and `EvidenceCorpus` naming are closed decisions, and exact-one Source Material is labeled as an initial W4-C slice limit.

## Package Scope

W4-B defines:

- terminology boundaries between Source Material, W4-A readiness, corpus-admission records, EvidenceCorpus, and EvidenceItems;
- future W4-C accepted-input requirements from process-local runtime-owned W4-A state;
- future corpus-admission statuses and denial matrix;
- a minimal hidden/admin-only corpus-admission record shape;
- default hash/ref-only text posture with process-local runtime-owned text access deferred to a later extraction gate;
- forbidden fields and behaviors;
- relationship to a later W3-C Source Material sweep;
- future implementation envelope, boundary guards, and reviewer questions.

## Non-Goals Preserved

W4-B does not authorize:

- implementation;
- live jobs;
- W3-C sweep;
- parser execution;
- EvidenceCorpus creation;
- EvidenceItems;
- LLM extraction input;
- report/verdict/warning/confidence/public behavior;
- cache/SR/storage;
- retries;
- provider expansion;
- W2 endpoint migration;
- ACS/direct URL behavior;
- V1 work or cleanup.

## Verification

Docs-only package. No source verifiers were run.

Planned after handoff/index updates:

- `npm run index`
- `git diff --check`
- `git status --short --untracked-files=all`

## Next Step

Review W4-B. If accepted, the next likely source package is W4-C minimal hidden corpus-admission implementation. If reviewers decide the contract needs distribution evidence first, prepare W3-C as a bounded sweep package using the W4-B measurement questions.

Do not implement W4-C or run W3-C live jobs from this package.
