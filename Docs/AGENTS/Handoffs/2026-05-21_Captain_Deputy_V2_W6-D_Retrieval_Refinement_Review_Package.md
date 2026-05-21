# Captain Deputy Handoff - V2 W6-D Retrieval Refinement Review Package

**Date:** 2026-05-21
**Role:** Captain Deputy
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-D_Retrieval_Refinement_Source_Material_Fan_In_Review_Package.md`
**Status:** amended after Steer-Co review, ready for Lead Developer sequencing

## Summary

Prepared and amended W6-D as the next package after W6-C5 stopped at
`refine_retrieval`. The proposal is bounded source-material fan-in over the
existing Wikimedia path: up to three page-summary records, aggregate extraction
input capped at 4096 bytes, same provider id `wikimedia_core`, no provider
expansion, no parser, no cache/SR/storage, no public behavior, and no W7 gate
relaxation.

The amended package splits work into:

- W6-D1: contract widening from one record to bounded fan-in while preserving
  the one-record path;
- W6-D2: runtime same-provider page-summary fan-in and aggregate W5 extraction
  input after W6-D1 is clean.

## Steer-Co Outcome

Steer-Co consented to the W6-D direction with modification. Amendments applied:

- hard caps remain `3` page summaries and `4096` aggregate extraction-input
  bytes;
- package now says this is page fan-in, not true provider/source diversity;
- selection and drop reasons are structural only;
- the current single-record code constraints are listed explicitly;
- W6-D1 and W6-D2 must close separately before a canary;
- canary documentation must record W6-C rubric dimension movement, not only the
  final recommendation enum;
- no second W6-D victory-lap canary is authorized.

## Rationale

W6-C5 proved that W6-C now works and is preserving the sufficiency bar. The
remaining stop is evidence sufficiency: the valid canary had one Source Material
record and one EvidenceItem. More W6 prompt edits would be the wrong direction.
The next value step is to feed W6 a small, better-balanced evidence set.

## Lead Developer Direction

Proceed first with W6-D1 only after this package commit:

- update the listed single-record invariants to accept bounded fan-in where the
  contract requires it;
- preserve the one-record W6-C5 path;
- do not add runtime fan-in fetch behavior in W6-D1;
- do not run a live job;
- return verifier results and diff summary before W6-D2 starts.

## Boundaries

No live job is authorized by this handoff. W6-D must not add provider expansion,
full page/html/source fetch, parser/cache/SR/storage, prompt/model/config/schema
changes, report/verdict/warning/confidence/public behavior, ACS/direct URL, or
V1 work.

## Validation

Package closeout requirements:

- `npm run debt:sensors`;
- `npm run index`;
- `git diff --check`;
- focused status review before issuing W6-D1 implementation packet.
