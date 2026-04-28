---
### 2026-04-29 | Lead Architect | Codex (GPT-5) | Check-Worthiness Phase 1a Implementation Plan

**Task:** Create a concrete implementation plan for the first remaining unification slice, run a review debate, and update the plan from the debate outcome.

**Files touched:**
- `Docs/WIP/2026-04-29_Check_Worthiness_Phase1a_Implementation_Plan.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Handoffs/2026-04-29_Lead_Architect_Check_Worthiness_Phase1a_Implementation_Plan.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Phase 1a is implementation-ready as a lean no-behavior cleanup. It should widen the remaining narrow `AtomicClaim.checkWorthiness` TypeScript contract to high/medium/low, relabel live UI/report displays to `Stage 1 extraction hint`, sync xWiki diagrams that still list high/medium only, and verify no live downstream enum assumptions exist. The debate disposition was APPROVE WITH COMMENTS; accepted comments tightened verification and changed the proposed label away from "priority".

**Open items:** Source implementation is not started. The next agent should implement the plan in `Docs/WIP/2026-04-29_Check_Worthiness_Phase1a_Implementation_Plan.md` and run the required build/grep/diff checks. Later phases from the parent assessment remain separate: ACS-CW attribution/prompt inventory, selected-claim Stage 2 coverage, provenance, entrypoint governance, prompt governance, and observability contracts.

**Warnings:** Do not broaden Phase 1a into ACS-CW behavior, prompt wording, model routing, Gate 1 filtering, selector fallback, generated DTO/shared enum work, or `applyGate1Lite` cleanup. `apps/api` currently appears to store/expose raw JSON columns (`ClaimSelectionJson`, `PreparedStage1Json`) without parsing `checkWorthiness`, but the implementer must run the read-only API grep before deciding C# is out of scope.

**For next agent:** Start with `Docs/WIP/2026-04-29_Check_Worthiness_Phase1a_Implementation_Plan.md`. The exact live source surfaces identified were `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/app/analyze/select/[draftId]/ClaimSelectionPanel.tsx`, `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`, and three xWiki diagram pages under `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/`. Required verification includes `npm -w apps/web run build`, `git diff --check`, source greps for old labels, downstream `checkWorthiness` comparisons, API JSON parsing, and stale xWiki high/medium-only enum text.

**Learnings:** No new `Role_Learnings.md` entry appended. This task reinforces the existing Lead Architect pattern: keep Stage 1 and ACS authorities separate while unifying only the edge contracts and labels that create implementation ambiguity.
