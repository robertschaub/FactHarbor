# AGENTS.md - Analyzer V2

Applies to all files under `apps/web/src/lib/analyzer-v2/`.

Read this before editing Analyzer V2. The canonical implementation guardrails are in `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`; this local file exists so agents see the critical rules at the point of change.

## Required Preflight

- For non-trivial V2 implementation work, call `fhAgentKnowledge.preflight_task` before editing.
- Load the target spec sections relevant to the slice, especially `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`.
- If the slice touches prompts, model routing, report generation, UI/session behavior, V1 cleanup, or cutover behavior, treat it as a review-gated change.

## Non-Negotiables

- Do not import, copy, alias, extend, or clone V1 analyzer code from `apps/web/src/lib/analyzer/`.
- Do not reuse V1 analysis prompts, prompt profiles, prompt sections, or V1 pipeline-owned TypeScript contracts.
- Compatibility with the current runner/job shape is allowed only through a named one-way ingress adapter.
- V2 internals use V2-owned contracts and clean domain names. Temporary `v2`/`precutover` labels belong only at package, schema, and gate boundaries.
- The analytical flow must preserve Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report.
- Prompt/model execution requires explicit Captain approval and LLM Expert review before it becomes executable.
- Report generation changes require versioned provenance, candidate-vs-approved comparison, rollback-ready profiles, and regression-control tests.
- The final redesign must remove the V1 production analysis pipeline after V2 cutover and stabilization; old behavior investigation uses old commits/worktrees.

## Verification

- Run the focused Analyzer V2 guard tests after touching this tree:
  `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- Run additional focused tests for the touched slice, then `npm -w apps/web run build` when TypeScript or schema surfaces change.
