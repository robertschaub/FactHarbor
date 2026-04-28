---
roles: [Senior Developer, Lead Architect, LLM Expert]
topics: [acs, validation, debate, architecture, metadata, thin_waist]
files_touched:
  - Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-28_Senior_Developer_ACS_Validation_Full_Debate_Spec.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACS Validation Full Debate Specification

**Task:** Run a full Architect/LLM Expert debate on the ACS validation architecture, current implementation weaknesses, and a simplified low-overhead specification.

**Done:**

- Ran a full debate with Advocate, Challenger, LLM quality probe, cost/operations probe, implementation probe, Reconciler, and Validator agents.
- Updated `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md` with the reconciled `MODIFY` verdict and validator-required fixes.
- Added current-vs-target diagram, direct-caller inventory, Submission Policy Thin Waist, passive metadata contract, validation gates split by readiness, implementation slices, and non-goals.
- Updated `Docs/WIP/README.md` to describe the final debate-backed spec.
- Integrated reviewer disposition: added the quarantined regression script, split metadata into Slice 3 vs future tiers, removed compatibility aliases, moved API provenance to follow-up, and added missing acceptance criteria.
- Consolidated the final specification into an implementation-facing document with target execution, policy-boundary, and implementation-flow diagrams; simplified the rollout into five implementation slices plus one API-governance follow-up.
- Integrated the `.codex/context-extension/2026-04-28_acs-budget-aware-selection_exchange.md` input: Stage 2 fixes are documented as baseline, budget-aware ACS selector behavior is preserved as a follow-up, and future budget labels/acceptance checks are separated from the current validation-tooling stream.
- Addressed review findings: canary selected-claim distribution is now a reported pipeline finding rather than a tooling blocker, Stage 2 telemetry is anchored to `resultJson.analysisObservability.acsResearchWaste`, and explicit budget-deferred claims are separated from ordinary not-selected/not-recommended claims.

**Decisions:**

- Adopt one supported live non-interactive validation path through ACS automatic drafts.
- Do not add a direct-full rerun mode in this slice.
- Treat historical direct jobs as read-only attribution references, not acceptance baselines.
- Strengthen the simplified plan with a Submission Policy Thin Waist: supported validation automation must use the shared ACS client; direct API callers must be migrated or quarantined.
- Mark `/v1/analyze` API provenance/gating as a follow-up governance gap.
- Treat ACS budget-aware selector changes as a separate follow-up after passive validation metadata and ACS canary evidence show they are needed.

**Warnings:**

- This is documentation/specification only. No runtime code changes were made.
- ACS quality remains unproven until a fresh ACS canary runs after the metadata/client patch is committed and runtime/UCM state is refreshed.
- Some proposed validation gates depend on passive telemetry that may not exist everywhere yet; the doc splits these into current blockers, current warnings, and future gates.
- Recent Stage 2 budget fixes must not be duplicated in ACS validation tooling; the validation stream should observe their effects through passive telemetry.
- A canary with zero-iteration selected claims can still validate the tooling if the summary surfaces and classifies that pipeline-quality finding correctly.

**Learnings:**

- The low-risk simplification is not just "use the helper"; it is a supported-submission thin waist with provenance. Otherwise direct API callers and stale scripts continue to erode validation trust.

**For next agent:** Start with Slice 1 from `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md`: inventory/quarantine direct callers, mark quarantined scripts in place, and extend `apps/web/scripts/automatic-claim-selection.js` into an admin-aware shared validation client. Then implement Slice 2 Tier 1 passive metadata. Do not touch prompts, analyzer behavior, API governance, ACS budget-aware selector behavior, or add direct-full reruns.
