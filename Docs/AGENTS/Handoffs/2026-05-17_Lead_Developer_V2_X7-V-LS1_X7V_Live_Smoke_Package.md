---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-V-LS1 X7-V Source Acquisition intake live-smoke package
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Smoke_Package.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-V_Product_Internal_Source_Acquisition_Intake_Boundary_Source_Package.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-V_Source_Acquisition_Intake_Boundary.md
---

# Lead Developer Handoff: V2 X7-V-LS1 X7-V Live-Smoke Package

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-V-LS1 X7-V Live-Smoke Package

**Task:** Prepare the next reviewed execution package after committed X7-V (`91fdd9d5`).

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Smoke_Package.md`.

**Decision:** The reviewer team approved a docs-only, one-job X7-V-LS1 live smoke. The package may submit exactly one Captain-defined German direct-text job after package commit, clean worktree, runtime refresh, focused verifiers, process-gate proof, route auth/no-store preflight, and an idle clean checkpoint. The `X7-W` label is reserved by the separate team-debate handoff for a later candidate-runtime admission proposal, so this smoke keeps the narrower `X7-V-LS1` label.

**Purpose:** Prove product-route continuity through Claim Understanding, X7-J, X7-O, X7-S, and X7-V on one ledger, with X7-V recorded as `intake_ready_not_executable` and public V2 still damaged/precutover.

**Files touched:** This handoff, the X7-V-LS1 package, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Warnings:** X7-V-LS1 is not a source-execution, source-quality, evidence-quality, report-quality, public-readiness, or semantic-quality gate. It does not authorize source/search/fetch/provider/parser/SR/cache IO, Source Acquisition structural executor invocation, source material, EvidenceCorpus, report, verdict, prompt/config/schema/model/provider edits, ACS/direct URL, V1 reuse, V1 work, or V1 cleanup.

**For next agent:** Commit the docs-only package first, refresh runtime at that commit, run the package verifiers, then perform exactly one live job only if all preconditions hold. If any source edit, prompt edit, route hardening, public leak repair, or runtime gate fix is needed, stop and create a separate reviewed package.

**Verification before package commit:** Pending at handoff creation: `npm run validate:v2-gates`; gate-register self-test; `npm run index`; `git diff --check`; staged-file assertion.

**Learnings:** After a source-stage structural package, a separate live-smoke package is the clean way to prove product-route reachability without smuggling execution authority into the implementation commit.
