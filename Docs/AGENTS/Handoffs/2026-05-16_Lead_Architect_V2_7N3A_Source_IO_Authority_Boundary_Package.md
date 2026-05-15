# Lead Architect Handoff: V2 7N-3A Source-IO Authority Boundary Package

**Date:** 2026-05-16
**Role:** Lead Architect / Captain deputy
**Scope:** Docs-only package; no source implementation

## Task

Consolidate the post-7N-2 expert debate into the next V2 source-acquisition gate.

Created:

- `Docs/WIP/2026-05-16_V2_Slice_7N3A_Source_IO_Authority_Boundary_Package.md`

## Decision

The expert team converged on `MODIFY / proceed narrowly`.

Do not jump from 7N-2 controlled-harness execution to broad real source IO. Split the next work:

- **7N-3A:** source-IO authority and runtime-owner boundary; no live jobs.
- **7N-3B or later:** concrete hidden source IO / canary gate, only after reviewed owner contracts, no-public-leak proof, runtime refresh, rollback, and explicit approval.

## Key Constraints

7N-3A must not broaden the 7N-2 `controlled_harness_only` marker.

7N-3A may define a separate non-serializable runtime authority capability and contracts for source-acquisition runtime config/provider boundary, but it must not add:

- concrete provider/search/fetch/parser/network execution;
- provider SDK imports or direct `fetch(...)`;
- product/orchestrator/runner wiring;
- public API/UI/report/export/compatibility exposure;
- live jobs;
- cache IO or durable storage;
- Source Reliability integration;
- prompt/config/model/schema edits;
- ACS/direct URL execution;
- semantic relevance/applicability/extraction/probative/sufficiency/warning/verdict/report behavior;
- V1 reuse or cleanup.

## Reviewer Consensus

- Runtime/security reviewer: 7N-3 should become hidden runtime source-IO owner boundary first; real IO needs a separate non-serializable runtime capability and must not be authorized by a plain object marker.
- LLM/pipeline-quality reviewer: provider metadata must not leak into quality; preserve source-language policy as pass-through; hidden content packets must not become a fake EvidenceCorpus.
- Source-acquisition architect reviewer: 7N-3 should be contract/source-wiring only unless Captain explicitly approves the first concrete IO gate; `web-search.ts` / `retrieval.ts` reuse requires explicit review because of V1/cache coupling.

## Next Step

Have reviewers approve/modify/reject the 7N-3A package. If approved, implementation should be limited to authority contracts and tests under the file envelope named in the package.

Concrete IO, product/public wiring, and live jobs remain later high-risk gates.

## Verification

Docs-only checks:

- `git diff --check`

No tests or live jobs were run for this docs-only package.

## Warnings

- `Docs/AGENTS/Agent_Outputs.md` was already dirty and was not touched or staged by this work.
- This handoff is not authority for concrete source IO. Treat it as a package boundary for review.
