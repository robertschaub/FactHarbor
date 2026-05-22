# V2 Slice HJ46 - Source-Native Downloadable Query Repair

**Status:** implementation in progress under Captain Deputy HighJump authority
**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ45 bounded XLSX Source Material result

## Why This Slice Exists

HJ45 added bounded XLSX attachment Source Material support, but the live job
`5f739284a34646b18664cef0f28a65a2` produced `0`
`provider_search_result_xlsx_text_bounded` records. The internal Alpha report
was complete and W5 extracted four EvidenceItems, but the evidence still did
not disclose the direct current-stock figure needed for the German asylum
aggregate claim.

The observed gap is before XLSX parsing: Query Planning produced broad
table/database intent, but not a source-native downloadable-file or attachment
query likely to find spreadsheet artifacts.

## Scope

Amend only the `V2_EVIDENCE_QUERY_PLANNING` retrieval guidance in
`apps/web/prompts/claimboundary-v2.prompt.md`.

Allowed:

- strengthen generic source-native downloadable-record query guidance;
- require one concise file/attachment-oriented query when the selected claim
  needs current official aggregate/statistical data likely carried in a data
  artifact;
- mention structural file/attachment concepts such as spreadsheet, XLS/XLSX,
  CSV, downloadable table, attachment, archive, or data file when they are
  natural for the source route;
- preserve source-language posture and claim/profile-driven query wording.

Closed:

- source/domain/institution/topic hardcoding;
- deterministic semantic query construction in code;
- provider expansion;
- direct URL or ACS support;
- parser expansion beyond already committed HJ45 XLSX materialization;
- public behavior;
- cache/SR/storage behavior;
- V1 work.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism` after HJ45 live evidence.

Chosen path: amend the existing V2 query-planning prompt, because the HJ45
materializer is locally implemented and verifier-clean but the live query path
did not reach an XLSX-capable locator.

Rejected paths:

- add another source provider;
- hardcode SEM, Switzerland, asylum, dates, or source domains;
- add direct URL submission;
- broaden the parser framework;
- loosen W5/report generation before source material is present.

Net complexity: no new runtime mechanism. One prompt guidance adjustment.

Removal/merge trigger: once V2 source acquisition has a consolidated
source-native data-artifact strategy before public cutover, this HighJump prompt
calibration should be reviewed with the broader retrieval policy and either
kept as generic guidance or merged into UCM retrieval intent configuration.

## V2 Scorecard Impact

Positive: directly targets report-quality value by improving the chance of
direct source-native official data reaching EvidenceItems.

No scorecard claim: HJ46 does not itself prove report quality; the next live
job must show whether source-native spreadsheet/source-material evidence is
materialized and used.

## V2 Retirement Ledger Impact

No new hidden route or denial layer is added. Existing HJ45 XLSX machinery
remains a temporary HighJump mechanism with a consolidation trigger before
public cutover.

## V2 Consolidation Gate

Approved to proceed as a narrow HighJump repair because it:

- advances report-quality evidence instead of adding reachability machinery;
- does not introduce a new product path;
- avoids source/topic hardcoding;
- has a clear stop condition after one live run.

Reviewer alignment:

- Steer-Co reviewer response: `MODIFY` -> direction accepted, wording should
  require a real downloadable-record/file-format retrieval intent without
  forcing `xlsx` or provider-specific operators.
- Claude Opus review: `MODIFY` -> merge the new downloadable-file guidance into
  the existing source-native data bullet so the limited query budget is not
  spent on duplicate file/data queries.
- Implemented resolution: one consolidated prompt bullet; no source/topic/domain
  examples and no provider-specific operator requirement.

## Verification Plan

Before live job:

- focused prompt/static tests touching prompt profile/config surfaces;
- focused V2 query-planning/runtime tests if present;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- clean git status, runtime refresh, Web/API/proxy version match.

Local verifier result before commit:

- query-planning prompt/config verifier passed: `6` files / `131` tests;
- `npm run validate:v2-gates` passed;
- `npm run debt:sensors` returned `advisory_warn` for known V2
  source/test/docs/boundary-guard footprint warnings;
- `npm -w apps/web run build` passed;
- `npm run index` passed;
- `git diff --check` passed.

Live validation:

- exactly one HJ46 job for the Captain-defined input
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- record whether the query plan includes downloadable/source-native file intent;
- record whether Source Material includes XLSX records;
- record whether W5/report uses direct current-stock evidence;
- preserve public/default containment checks.

## Stop Conditions

Stop and reconvene Steer-Co if:

- the prompt wording would require source/domain/topic hardcoding;
- the fix requires provider expansion, direct URL, ACS, cache/SR/storage, public
  behavior, V1 work, or broad parser expansion;
- the next live job again produces no XLSX material and no new evidence about
  why;
- hidden text leaks to public/default admin/log/error surfaces;
- runtime commit cannot be matched to committed source.
