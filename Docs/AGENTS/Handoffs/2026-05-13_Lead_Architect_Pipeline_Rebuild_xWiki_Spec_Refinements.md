# 2026-05-13 | Lead Architect | Pipeline Rebuild xWiki Spec Refinements

## Summary

Updated `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` with Section 1.4, a compact xWiki-derived refinement addendum.

The addendum records documentation parity, academic/research-platform validation lenses, explanation/report quality visibility, job lifecycle/audit mapping, ACS selected-claim integrity, canonical V2 xWiki reader links, and an explicit non-import list for stale xWiki mechanisms.

## Deputy Review

Franklin and Lorentz both returned `MODIFY`.

Captain also asked whether a Claude agent could review this slice. Initial tool discovery did not expose a callable Claude/Anthropic review agent or connector. A later retry found the local Claude Code CLI and Claude Opus reviewed commit `b6c9926c` after the initial commit. That review returned `APPROVE`, with no blockers, no required edits, and "commit should stand as-is."

Consolidated requirements applied:

- V2 xWiki pages are canonical reader-level design documentation, but source reverse-engineering, V2 schemas, fixtures, tests, and approved implementation slices remain implementation authority.
- Documentation parity is a readiness/cutover expectation, not a blocker for every implementation commit.
- Research-platform metrics are validation lenses only; they do not approve live-job spend, new benchmark scope, source-reliability formulas, or deterministic source-type scoring.
- Explanation/report quality remains a ReportResult/quality-gate visibility requirement; schema expansion still needs an explicit contract slice.
- Observability ledger mapping to job lifecycle/audit events is future implementation-slice work; no API/DB/event-shape change is approved.
- Selected AtomicClaim IDs/statements cannot silently disappear; failure must produce Gate 1 blocked/damaged status or an approved ACS retry path.
- Old V1 prompt snippets, schema strings, route names, deterministic semantic heuristics, SR verdict formulas, provider detection snippets, model-tier assumptions, and AnalysisContext framing remain non-imported for V2.

## Files Changed

- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/index/handoff-index.json`

## Verification

- Documentation-only change.
- No source, prompt, config, runtime, API, UI, or live-job behavior changed.
- `npm run index` and diff checks should be run before commit.

## Warnings

- Section 1.4 is a guardrail delta, not a new architecture layer.
- Slice 6B remains blocked until Captain approval and LLM Expert review.
- Claude review happened as a post-commit review via local Claude Code CLI, not as part of the original Franklin/Lorentz pre-commit consolidation.

## Claude Review Result

Claude Opus review summary:

- verdict: `APPROVE`;
- blockers: none;
- required edits: none;
- compliance checks: no prompt/model/schema/API/DB/event-shape changes; terminology and LLM-ownership invariants intact; Slice 6B remains blocked;
- recommendation: commit `b6c9926c` should stand as-is and optional clarifications can be batched with a future spec touch.
