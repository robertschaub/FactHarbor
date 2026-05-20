# 2026-05-20 Captain Deputy V2 W6-C3 Sufficiency Diagnostics Package

**Role:** Captain Deputy / Steer-Co
**Status:** implementation package prepared; source implementation pending
**Package:** `Docs/WIP/2026-05-20_V2_Slice_W6-C3_Sufficiency_Schema_Diagnostics_Package.md`
**Baseline:** W8-F result commit `5d9c6ef3`

## Summary

Prepared W6-C3 after W8-F identified W6-C as the first incomplete live product
route owner. W8-F job `5a9f11c1b3e34be18b6bf49ed6fc4d65` reached W6-C and
recorded `sufficiency_assessment_damaged` / `schema_validation_failed`.

Steer-Co consent is to add bounded sanitized W6-C schema diagnostics before any
prompt/schema repair. Claude Opus 4.6 and the GPT code explorer both preferred
this path because it amends existing W6-C telemetry and W8-B projection rather
than guessing at prompt/schema changes or adding another route.

## Approved Next Implementation Shape

Implement a nullable W6-C schema diagnostics field under existing W6-C execution
telemetry and project it through the existing W8-B internal Alpha report-result
artifact projection.

Allowed source scope:

- `sufficiency-assessment.ts`
- `internal-alpha-report-result.ts`
- W6-C provenance only if needed
- focused W6-C/W8-B/route/boundary tests

No prompt/model/config/schema/UCM/gateway edits are authorized by this package.
No new route, sink, public behavior, retries, provider expansion, parser,
cache/SR/storage, ACS/direct URL, V1 work, or V1 cleanup is authorized.

## Debt-Guard Position

Classification: incomplete-existing-mechanism / planned-temporary-debt.

Chosen direction: amend existing W6-C and W8-B mechanisms with bounded
diagnostic metadata. Rejected direction: prompt/schema repair without issue
paths, schema relaxation, or another diagnostic route.

Removal trigger: remove or fold the diagnostic into stable W6-C telemetry after
the W6-C schema root cause is fixed and a later Captain-approved canary verifies
W6-C completion.

## Validation And Canary

Required local verifiers are listed in the package. One live canary is proposed
after implementation commit, clean git status, runtime refresh, runtime hash
match, and W8-B route preflight. The live canary uses exactly:

`Using hydrogen for cars is more efficient than using electricity`

No second W6-C3 canary is authorized by this package.

## Next Agent Context

Proceed to implementation inside the package envelope. If implementation needs
prompt/schema edits, a new route/sink, raw provider payload access, public
behavior, or a second canary, stop and reconvene Steer-Co.
