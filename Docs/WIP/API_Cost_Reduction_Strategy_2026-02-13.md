# Claude API Cost Reduction Strategy

**Date:** 2026-02-13  
**Status:** Active as an **external cost/funding strategy reference**. Historical spend baseline and obsolete prompt-caching discussion were moved to archive.  
**Historical detail:** [API_Cost_Reduction_Strategy_2026-02-13_arch.md](../ARCHIVE/API_Cost_Reduction_Strategy_2026-02-13_arch.md)

---

## 1. Document Role

This file remains useful for the **future non-code cost track**, not for current runtime decisions.

The still-relevant strategy areas are:
- Anthropic Batch API evaluation
- nonprofit / OSS / research credit applications
- cloud-credit programs
- cost-governance ideas that do not depend on immediate analyzer changes

---

## 2. Important Current Updates

- **Prompt caching is already active** in the current codebase and should no longer be tracked as an open item here.
- The Feb 2026 spend figures are **historical context**, not a current cost baseline.
- Any future Batch API evaluation must be checked against current runtime behavior, especially the validated Stage-4 provider guard and the current job architecture.

---

## 3. Still-Relevant Future Items

### A. Batch API Feasibility

Still worth evaluating later for non-latency-sensitive work, but only after the current validation/control gate closes.

### B. External Funding / Credit Applications

Still fully relevant:
- nonprofit discounts
- research credits
- cloud credits

### C. Cost Governance

Still relevant as a future policy topic:
- per-job / per-day budgeting
- admin-facing cost visibility
- explicit cost controls before broader public exposure
