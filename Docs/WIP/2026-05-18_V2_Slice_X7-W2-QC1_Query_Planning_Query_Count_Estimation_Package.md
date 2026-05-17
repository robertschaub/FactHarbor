# V2 Slice X7-W2-QC1 Query Planning Query-Count Estimation Package

**Date:** 2026-05-18
**Status:** docs-only diagnostic package; no live jobs; no source/network execution
**Owner:** Lead Developer / Captain Deputy
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Result.md`

## 1. Purpose

X7-W2-LS1 failed before provider-network execution because accepted Query Planning produced 3 query entries while W2 currently fails closed above 2 query entries. The next decision must not be a blind rerun and must not be a reactive cap increase.

X7-W2-QC1 defines the evidence needed before the next W2 live attempt:

- whether the current W2 cap of 2 is still the right first-provider proof cap;
- whether a different Captain-defined input can reliably stay within the cap;
- whether W2 should be amended to align with the accepted Query Planning output cardinality, likely 3, under a separate reviewed source package.

## 2. Non-Authorizations

X7-W2-QC1 does not authorize:

- any live job;
- any provider-network/source/search/fetch/content-dereference/parser/cache/Source Reliability/storage execution;
- source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public answer generation;
- prompt/config/schema/model/provider/source/test/script edits;
- W2 cap changes;
- public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 3. Evidence Already Collected

| Evidence | Input | Query count | Notes |
|---|---|---:|---|
| X7-V-LS1 result | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | 2 | Accepted X7-S artifact in `Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Result.md`. |
| X7-U3 result | same German input | 3 | Accepted Query Planning with 3 bounded query entries in `Docs/STATUS/Backlog.md`. |
| X7-W2-LS1 result | same German input | 3 | W2 blocked with `query_count_exceeds_w2_cap`; no provider/network execution. |

This is enough to reject an immediate rerun of the same input under unchanged W2. It is not enough to justify changing W2's cap.

## 4. Required Estimation Evidence

Before another W2 live-provider proof, collect one of these evidence sets:

### Option A: Compatible-Canary Evidence

Show, without W2 network execution, that a specific Captain-defined input currently produces at most 2 accepted Query Planning entries under the current committed prompt/model/runtime.

Minimum evidence:

- exact Captain-defined input;
- commit hash;
- prompt hash;
- Query Planning status;
- query entry count;
- no W2/source/provider/network execution;
- no public output;
- no source material/evidence/report/verdict behavior.

### Option B: Cap-Alignment Evidence

Show that accepted Query Planning now commonly emits 3 entries for normal direct-text single-claim inputs and that W2's cap of 2 is creating an artificial integration block.

Minimum evidence:

- at least three Captain-defined direct-text inputs;
- exact inputs, commit hash, prompt hash, and query entry counts;
- no W2/source/provider/network execution;
- budget impact of raising W2 from 2 to 3 query entries:
  - max one additional Wikimedia page-search GET per run;
  - max three additional hidden identity-only candidate records;
  - fixed dollar cost remains `0`;
  - byte/time caps remain unchanged unless a separate package justifies otherwise.

## 5. Allowed Diagnostic Paths

QC1 may use only paths that cannot invoke W2/provider-network execution:

1. **Existing documented live artifacts** from committed result docs and status files.
2. **A later reviewed Query Planning-only diagnostic package** that invokes Claim Understanding/Query Planning directly and stops before Source Acquisition.
3. **A later reviewed temporary local diagnostic command** if it imports only Claim Understanding/Query Planning runtime owners, uses exact Captain-defined inputs, and proves source/network execution is unreachable.

QC1 itself does not authorize path 2 or 3 execution. It only defines the evidence contract for that follow-up.

## 6. Decision Rule For Next Package

- If compatible-canary evidence identifies a stable Captain-defined input with `queryEntryCount <= 2`, prepare a new W2 live-smoke package using that input and the corrected scalar event polling script.
- If evidence shows `queryEntryCount = 3` is normal for the target direct-text cases, prepare a reviewed W2 cap-alignment source package before any rerun.
- If evidence is mixed or unstable, do not run W2 live jobs. First decide whether Query Planning cardinality should be controlled upstream, whether W2 should consume a selected subset with explicit policy, or whether W2's first-provider proof should accept the full bounded Query Planning set.

## 7. Review Record

Claude Opus 4.6 senior architect/security review of the X7-W2-LS1 failure recommended this direction:

- close LS1 as hard-fail/partial defensive evidence;
- avoid blind reruns;
- avoid reactive cap changes;
- collect query-count distribution evidence before choosing compatible canary versus cap alignment.

Lead Developer / Captain Deputy accepts this recommendation.

## 8. Completion Criteria

QC1 is complete when this package is committed and status/handoff docs point to it as the next safe step. Any actual diagnostic execution must be handled by a separate package that names its invocation path and stop rules.
