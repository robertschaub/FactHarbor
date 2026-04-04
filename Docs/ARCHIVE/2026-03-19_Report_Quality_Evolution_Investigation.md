# Report Quality Evolution Investigation

**Date:** 2026-03-19  
**Status:** Active as a **curated summary of still-valid conclusions**. Historical run tables and dated addenda were moved to archive.  
**Historical detail:** [2026-03-19_Report_Quality_Evolution_Investigation_arch.md](../ARCHIVE/2026-03-19_Report_Quality_Evolution_Investigation_arch.md)

---

## 1. Document Role

This file keeps only the conclusions from the March quality investigations that still matter for future decisions.

It is **not** the current governing plan and **not** the current live baseline. The active live gate is:

- [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)

---

## 2. Still-Valid Conclusions

### A. Historical SR weighting mattered more than the old `defaultScore` drift

The March historical quality drop was driven much more by the legacy SR-weighting path than by the smaller `defaultScore=0.45` drift. That historical correction remains important when reading old runs.

### B. Hydrogen remained the healthiest control family

Hydrogen stayed the most stable and least confounded control family across the historical investigation set.

### C. Bolsonaro is not a positive benchmark until it is re-baselined

Bolsonaro should not be used as a “recovered” benchmark family without a fresh validated rerun on the current stack.

### D. Plastik broad evaluative claims remained unstable

Even after multiple fixes, Plastik-family broad evaluative inputs remained the clearest quality-instability family. The product decision remains:

- multilingual Plastik neutrality is a **parked known limitation**
- do not reopen failed Phase 2 v1/v2 retrieval patterns

### E. Historical config-provenance weakness is no longer the current blocker

The old March concern that current ClaimBoundary jobs lacked reliable per-job config provenance has been addressed since this investigation window. It should no longer be described as the active blocker on `main`.

---

## 3. Current Reading Rule

Use this document for:
- family-level historical lessons
- understanding why some old interpretations were revised
- preserving durable quality conclusions

Do **not** use it for:
- current live validation decisions
- current performance claims
- current “what should we do next?” prioritization

For those, use:
- [Current_Status.md](../STATUS/Current_Status.md)
- [Backlog.md](../STATUS/Backlog.md)
- [2026-03-24_Post_Validation_Control_and_Coverage_Followup.md](2026-03-24_Post_Validation_Control_and_Coverage_Followup.md)
