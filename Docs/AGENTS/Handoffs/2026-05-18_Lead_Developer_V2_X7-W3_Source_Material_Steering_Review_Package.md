# Lead Developer Handoff — V2 X7-W3 Source Material Steering Review Package

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Task:** Prepare Source Material package for Steering Board review after W2/PIV1-A closeout.
**Status:** Review package prepared; no implementation and no live jobs authorized.

## Summary

Prepared `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md`.

The package records that W2 is closed and Source Material is the natural next downstream stage, but current W2 artifacts are not enough to fetch material. W2 artifacts expose sanitized counts/telemetry only, and current hidden candidate records carry opaque `candidateId` / `hiddenLocatorId` placeholders rather than dereferenceable URLs, page keys, titles, snippets, domains, source text, or parsed content.

The package therefore requires a safe locator-materialization contract before any source-material fetch.

## Key Decisions Proposed

- Treat X7-W3 as the Source Material gate family after W2.
- Require safe locator materialization before source-material fetch.
- Keep Source Material hidden/admin-only and process-local/no-store.
- Do not add a second provider in W3.
- Do not add retries in W3.
- Default recommendation: split implementation into W3-A locator materialization and W3-B bounded source-material fetch.
- One post-implementation canary may be proposed, counted against the new 6-job tranche, but only after Steering Board approval and a later implementation package.

## Files Changed

- `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3_Source_Material_Steering_Review_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

## Workspace Provenance

Before package work, unrelated dirty agent-skill/governance changes were isolated into stash:

```text
pre-source-material-package-unrelated-agent-skill-docs
```

The Source Material package was then drafted from a clean worktree.

## Constraints

The package authorizes no:

- implementation;
- live jobs;
- parser execution;
- EvidenceCorpus;
- EvidenceItems;
- report/verdict/warning/confidence behavior;
- public exposure;
- second provider;
- retries;
- cache IO;
- Source Reliability;
- durable storage;
- ACS/direct URL;
- V1 reuse, V1 work, or V1 cleanup.

## Review Focus

Steering Board should decide:

- whether safe locator materialization is mandatory before source-material fetch;
- whether W3 should be split into W3-A/W3-B;
- whether the first Source Material endpoint should stay in Wikimedia Core or move to project-local REST;
- whether one provider family is enough for first Source Material;
- whether hidden/admin-only source-material records may contain bounded source body text or should initially record diagnostics only;
- whether boundary-guard/gate-register debt should be trimmed before implementation.

## Warnings

Do not implement Source Material from this package alone. The next implementation step requires Steering Board acceptance and a separate source package. Do not run the proposed canary until that later package is approved, implemented, verified, committed, and runtime-refreshed.

## Learnings

The post-W2 transition is not simply "fetch the candidates." W2 intentionally avoided locator exposure and raw provider payload propagation. Source Material needs an explicit safe locator-materialization seam so candidate proof does not accidentally become raw URL dereference or source-content leakage.
