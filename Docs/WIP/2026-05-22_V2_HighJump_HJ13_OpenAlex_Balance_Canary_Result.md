# V2 HighJump HJ13 OpenAlex Balance Canary Result

Date: 2026-05-22
Role: Captain Deputy / Lead Developer lane
Implementation commit: `9d1591154060d46f391aed66f9c713b8002fef2c`
Canary job: `1d85ff88bf6945cb8f7caefcbabc7d9c`

## Classification

`STOP_X7_HJ13_OPENALEX_BALANCE_NOT_REALIZED_INTERNAL_ALPHA_DRAFT_CREATED`

HJ13 did not pass its core source-balance criterion. The hidden chain reached
W8-G and created an internal Alpha draft, but Source Material still contained
only `1` OpenAlex record and `8` Wikimedia records.

## Runtime Provenance

- API runtime: `9d1591154060d46f391aed66f9c713b8002fef2c`
- Web runtime: `9d1591154060d46f391aed66f9c713b8002fef2c`
- Git status before submission: clean
- Submitted as explicit `claimboundary-v2`
- Captain-defined input:
  `Using hydrogen for cars is more efficient than using electricity`
- Internal route preflight before submission:
  unauthenticated artifact route returned `401`; authenticated missing artifact
  returned `404` with `Cache-Control: no-store`

## Hidden Chain Evidence

- Claim Understanding completed with accepted schema outcome.
- Query Planning completed and produced `4` query entries.
- Candidate provider network completed with `4` attempted query outcomes.
- W3-A materialized `9` Wikimedia preview records.
- W4-A/W4-C admitted `9` Source Material records into the hidden corpus path.
- Source Material provider mix: `1` OpenAlex and `8` Wikimedia.
- W5 bounded extraction completed with `4` accepted hidden EvidenceItems.
- W8-B created an internal Alpha report-result candidate with `4` boundary
  candidates, `3` verdict candidates, and `4` cited EvidenceItem refs.
- W8-G created an `8966` byte internal Alpha draft with `4` boundary drafts and
  `3` verdict drafts.

## Public And Admin Containment

- Public job result stayed `4.0.0-cb-precutover` /
  `blocked_precutover` / `report_damaged`.
- Default W8-G admin projection remained hash/length/provenance-only with
  `draftMarkdownReturned = false`.
- Explicit authenticated inspection returned draft Markdown for internal review
  only.
- Default projections reported no source text, EvidenceItem text, prompt text,
  provider payload, public verdict, public truth percentage, public confidence,
  or public warning exposure.

## Quality Signal

The internal draft is more developed than HJ12: it contains separate verdict
candidates for hydrogen-versus-gasoline support, battery-electric counterpoint,
and full-scope unverified status. It still does not establish a clean full-scope
answer for the Captain claim because the portfolio remains too weak on direct
hydrogen-car versus battery-electric/electricity efficiency comparison evidence.

## Budget Accounting

This consumed the single HJ13 Steer-Co budget-reconciliation exception recorded
in `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`.

Current HighJump tranche remaining: `0`.
Recorded exception overrun count: `3`.

No second HJ13 canary is authorized.

## Next Direction

Do not rerun HJ13. The next step should be a Steer-Co-reviewed quality package
that targets direct comparator evidence acquisition or source-material selection
with the smallest balanced change. Candidate directions for Steer-Co:

- provider/endpoint coverage if the existing OpenAlex/Wikimedia path cannot
  supply enough direct comparator material;
- provider-specific query or source-material materialization adjustment if
  evidence shows direct candidates are available but not reaching W4/W5;
- report-quality review if Steer-Co determines the current internal draft is
  sufficient to evaluate the next report-quality bar before another retrieval
  change.
