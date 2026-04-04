# Combined Claim and Boundary Quality Remediation Plan

**Date:** 2026-03-16  
**Status:** Active as a **residual quality architecture plan**. Several original phases shipped; only the still-open quality tails remain relevant.  
**Historical detail:** [Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16_arch.md](../ARCHIVE/Combined_Claim_and_Boundary_Quality_Remediation_Plan_2026-03-16_arch.md)

---

## 1. Document Role

This file used to be the combined execution plan for a large quality remediation wave. It now serves a narrower role:

- preserve the **remaining quality architecture questions**
- separate them from already-shipped fixes
- prevent re-litigating work that is already implemented

The active immediate gate is the current fixed-stack validation follow-up in [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md).

---

## 2. What Has Already Landed

The following lines of work from the original combined plan are no longer open:

- **Boundary cleanup / empty-boundary handling** from the early Phase A track
- **Stage-1 claim-contract validation baseline** from the Phase B line
- **Stage-1 `claimDirection` clarification** for thesis-relative labeling
- **Preliminary-evidence multi-claim mapping repair** for seeded coverage integrity
- **`analyticalDimension` field introduction** into the data model and clustering path

These should be treated as **implemented history**, not pending design work.

---

## 3. Still-Open Residual Topics

### A. Claim Strength Preservation

The broad-claim contract validator materially helped, but it did **not** replace the distinct open question documented in:

- [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)

That study remains the better home for unresolved Stage-1 strength-preservation questions.

### B. `analyticalDimension` Fill-Rate / Prompt Quality

The field exists structurally, but the prompt-side population quality is still unresolved.

Active companion:
- [AnalyticalDimension_Concrete_Examples_Plan_2026-03-17.md](AnalyticalDimension_Concrete_Examples_Plan_2026-03-17.md)

### C. Verdict Integrity / Containment Residuals

The repository still has residual integrity and containment questions, including whether softer containment modes such as `warn_and_cap` should ever be added back into active work.

Those residuals now live more cleanly in:
- [Quality_Improvement_Pending_fwd.md](Quality_Improvement_Pending_fwd.md)

### D. Parked Plastik Limitation

The broad quality problem that originally motivated this plan is now split into:

- a **current validation/control gate** on the fixed stack
- a **parked future architecture question** for multilingual Plastik neutrality

Use:
- [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)
- [2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md](2026-03-22_Plastik_Phase2_v3_Architecture_Brief.md)

---

## 4. Current Architectural Guidance

- Do not reopen the original multi-phase remediation wave as one bundle.
- Treat remaining quality work as **smaller, isolated tracks**:
  - validation/control closure
  - claim-strength preservation
  - `analyticalDimension` prompt improvement
  - optional future containment work
  - parked Plastik v3 architecture

This keeps the quality track attributable and avoids mixing old historical problems with current fixed-stack validation.
