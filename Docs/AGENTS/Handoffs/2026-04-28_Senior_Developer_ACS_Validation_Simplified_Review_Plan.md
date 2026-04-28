---
roles: [Senior Developer]
topics: [acs, validation, simplification, metadata, review]
files_touched:
  - Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md
  - Docs/WIP/README.md
  - Docs/AGENTS/Handoffs/2026-04-28_Senior_Developer_ACS_Validation_Simplified_Review_Plan.md
  - Docs/AGENTS/Agent_Outputs.md
---

# ACS Validation Simplified Review Plan

**Task:** Revise the ACS validation-path solution into a simpler review-ready plan that reduces overhead and avoids unnecessary direct-full rerun tooling.

**Done:**

- Replaced `Docs/WIP/2026-04-28_ACS_Validation_Path_Deployment_Solution.md` with a review-ready simplified plan.
- Updated the diagram to show one live non-interactive validation path: ACS draft -> selected `AtomicClaim`s -> final job -> passive metadata -> read-only historical comparison.
- Updated `Docs/WIP/README.md` so the active WIP index reflects the simplified plan instead of the earlier direct-full baseline proposal.

**Decisions:**

- Removed the direct-full rerun mode from the recommended implementation slice.
- Kept historical direct jobs as read-only comparators because they are cheaper, faster, and lower risk than creating a new bypass-shaped validation mode.
- Kept the implementation slice narrow: shared ACS helper usage plus passive metadata extraction.

**Warnings:**

- This is documentation only. Script/helper/metadata code still needs implementation.
- The previous handoff `2026-04-28_Senior_Developer_ACS_Validation_Path_Documentation.md` reflects the earlier, more complex plan. Treat this simplified review plan as superseding it.

**Learnings:**

- Validation comparability should first use existing historical job evidence before adding new execution paths. That keeps the product path unified and avoids spending live jobs or reopening direct-analysis bypass risk.

**For next agent:** Review and implement only the simplified slice: shared ACS automatic submission helper, passive metadata extraction, read-only historical comparator mapping, safe tests/build, then commit/restart before any live ACS validation jobs.
