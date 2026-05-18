# V2 Slice X7-W2-RP1 Local Raw-Code Probe Result

**Date:** 2026-05-18
**Status:** `PASS_X7_W2_RP1_OBSERVED_UNMAPPED_STANDARD_NODE_CODE`
**Owner:** Lead Developer / Captain Deputy
**Package commit:** `0e48fc00a490d19e849072a37b66df4fb4a958b4` (`docs: approve v2 w2 rp1 raw-code probe`)
**Package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-RP1_Local_Raw_Code_Probe_Package.md`
**Parent result:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS5_DIAG4_Taxonomy_Live_Result.md`

## Summary

RP1 executed exactly one transient operator-local probe outside the repository to observe the raw Node error-code signal behind the LS5 `nodeErrorCodeCategory: other_known` result.

The probe result is:

```text
rp1_observed_unmapped_standard_node_code
[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]
```

The observed raw code was displayed only in the local shell output for operator inspection. It was not copied into this result, status files, handoffs, committed scripts, logs, product runtime artifacts, admin route JSON, public result output, or chat.

## Pre-Probe Checks

Passed before the probe:

```text
git status --short --untracked-files=all
PASS - clean

git diff --check
PASS

node -v
PASS - v22.15.0

git rev-parse HEAD
PASS - 0e48fc00a490d19e849072a37b66df4fb4a958b4
```

## Probe Shape

The transient helper was created under a local temp directory outside the repository and deleted after the run.

The helper mirrored the product transport posture:

- Node `https.request`;
- explicit `servername` set to `api.wikimedia.org`;
- `agent: false`;
- `dns.promises.lookup(hostname, { all: true, verbatim: true })`;
- custom lookup callback returning the selected public DNS result;
- fixed Wikimedia Core REST Search page-search path;
- synthetic non-sensitive `q` parameter;
- product-equivalent `accept: application/json` and `user-agent: FactHarbor-V2-Internal` headers;
- `1500ms` timeout;
- response destroyed immediately if reached, with no body read.

The probe did not run the product runner/orchestrator/API/UI/report/export path and did not submit a live analysis job.

## Observation

| Field | Observed |
|---|---|
| Result category | `rp1_observed_unmapped_standard_node_code` |
| Raw code persistence | `[RAW_CODE_OBSERVED_LOCALLY_NOT_RECORDED]` |
| DNS address count | `1` |
| Selected address family | `ipv4` |
| Response reached | no |
| Response body read | no |
| Source material created | no |
| Candidate/source/evidence/report/verdict behavior | no |
| Product/admin/public artifact changed | no |

## Post-Probe Checks

Passed after the probe:

```text
git status --short --untracked-files=all
PASS - clean

git diff --check
PASS

Temp helper directory exists
PASS - false
```

Repo scan for RP1 helper markers found only the approved package/status/handoff references to the temp directory name, result categories, and placeholder. No probe helper file, probe log, raw-code output file, or product artifact was created in the repo.

## Classification

`PASS_X7_W2_RP1_OBSERVED_UNMAPPED_STANDARD_NODE_CODE`

This means the remaining W2 live transport failure is not best handled by endpoint/client redesign yet. The next safe package is a reviewed DIAG5 taxonomy/mapping source package.

## What This Proves

- The LS5 `other_known` result corresponds to a standard Node-style raw code that DIAG4 did not map.
- The failure reproduces locally in a product-parity `https.request` path.
- The failure occurs before response body handling and still does not justify source material/content/parser/cache/SR/storage/EvidenceCorpus/report/verdict/public work.
- The next package can be narrow: add one reviewed taxonomy/mapping case and focused synthetic tests, then use a separate live observation package if runtime confirmation is needed.

## What This Does Not Prove

- W2 provider-network success.
- Wikimedia endpoint response-body compatibility.
- Source material availability.
- Source quality, report quality, verdict quality, public readiness, release readiness, or production readiness.
- Approval for any live job, source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior, provider expansion, endpoint redesign, ACS/direct URL, V1 work, or V1 cleanup.

## Next Direction

Prepare a separate DIAG5 taxonomy/mapping source package.

DIAG5 should be narrow and reviewed before source edits. It should:

- classify the one RP1-observed standard Node-style code into a bounded category;
- add focused synthetic transport tests;
- preserve raw-code leak controls in product/admin/public artifacts;
- keep W2 completion semantics unchanged;
- avoid source material/content/parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence/public behavior;
- avoid provider expansion, endpoint redesign, live jobs, ACS/direct URL, V1 work, and V1 cleanup.

Do not implement DIAG5 inside RP1.
