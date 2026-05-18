# Lead Developer Handoff: V2 X7-W4-D EvidenceCorpus Shell Source Package

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Agent:** Codex (GPT-5.5)
**Status:** Source package prepared; implementation blocked until review/commit
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W4-D_EvidenceCorpus_Shell_Source_Package.md`
**Parent commit:** `471d230b`

## Summary

Prepared the W4-D source package after W4-C implementation.

W4-D proposes the smallest EvidenceCorpus crossing:

- consume only producer-owned W4-C corpus-admission output;
- create exactly one hidden/admin-only, text-free `EvidenceCorpus` shell;
- mark it as `kind: "shell_only"`;
- keep extraction, EvidenceItems, parser, report/verdict/warning/confidence, public behavior, cache/SR/storage, retries, provider expansion, ACS/direct URL, and V1 work closed.

No implementation or live job is authorized by this package.

## Review Consolidation

Reviewer inputs:

- Claude Opus initially recommended a docs-only decision package before any shell implementation.
- Local Senior Architect, Security/Containment, and Product/Quality/Cost reviewers recommended the minimal shell as the next target.
- Consolidated package: W4-D is a source package for the minimal shell, but it remains review-only and does not authorize implementation until accepted.

Claude Opus then returned `modify`; required documentation changes were applied:

- aligned blocked statuses and stop reasons;
- added explicit metadata/lineage/post-mark mutation failure reasons;
- required downstream extraction/public consumers to reject `evidenceCorpus.kind === "shell_only"` explicitly instead of relying on a non-null corpus check.

Local reviewers returned `approve`.

## Key Constraints

W4-D implementation, if later approved, must:

- add W4-C admission runtime provenance;
- consume only W4-C runtime-owned admission;
- reject direct W3-B Source Material and W4-A readiness;
- reject copied/JSON/spread/structured-clone/reconstructed/route-derived/docs-log/post-mark-mutated W4-C admissions;
- keep the shell text-free and hidden/admin-only;
- create no EvidenceItems and no extraction input;
- add boundary guards against treating a `shell_only` corpus as evidence-bearing.

## Warnings

- The package intentionally creates no code yet.
- The shell must not be confused with analytical evidence.
- Any need for source text in the shell, product-route wiring, artifact routes, live evidence, multiple Source Material records, parser/cache/SR/storage, extraction input, EvidenceItems, report/verdict/warning/confidence/public behavior, direct W3-B/W4-A access, ACS/direct URL, or V1 work is a stop condition.

## Learnings

The next useful progress step is not another generic readiness gate. It is a narrow corpus shell contract that proves the system can create a corpus container without authorizing extraction. The most important new guard is semantic: downstream code must not treat a non-null shell as evidence-bearing.

## Next Step

Review and commit the W4-D package. If accepted, implementation may proceed strictly inside the approved W4-D envelope. No live job should be run for W4-D.
