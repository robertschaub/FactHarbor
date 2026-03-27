# Seeded Evidence Remap — Promotion Gate

**Date:** 2026-03-27
**Status:** COMPLETED — decision delivered
**Flag:** `preliminaryEvidenceLlmRemapEnabled`

---

## Historical runs (old stack, pre-FLOOD-1)

These ran before `maxEvidenceItemsPerSource` was added. Not used for the promotion decision.

| Job | Input | Flag | Verdict | Truth% | Conf% | Seeded | Mapped | Unmapped |
|-----|-------|------|---------|--------|-------|--------|--------|----------|
| `927031ef` | Bolsonaro-A | ON | LEANING-TRUE | 59.2 | 64.3 | 24 | 21 | 3 |
| `bbfd24e7` | Bolsonaro-B | ON | LEANING-TRUE | 71.8 | 66.6 | 24 | 21 | 3 |
| `23721cd9` | Plastik-A | ON | LEANING-FALSE | 37.0 | 71.5 | 47 | 44 | 3 |
| `a71bc670` | Plastik-B | ON | LEANING-FALSE | 36.0 | 75.0 | — | — | — |

**Correction:** `a71bc670` completed successfully as LEANING-FALSE 36/75 (was incorrectly listed as "still running" in the parked version).

---

## Current-stack A/B comparison

See: `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md`

**Recommendation: Promote to default-on.**
