# Seeded Evidence Remap — Promotion Gate (PARKED)

**Date:** 2026-03-27
**Status:** PARKED — interrupted, resume later
**Flag:** `preliminaryEvidenceLlmRemapEnabled`

---

## What was completed

### Runs with flag ON (completed)

| Job | Input | Verdict | Truth% | Conf% | Seeded | Mapped | Unmapped | Remap% |
|-----|-------|---------|--------|-------|--------|--------|----------|--------|
| `927031ef` | Bolsonaro-A | LEANING-TRUE | 59.2 | 64.3 | 24 | 21 | 3 | **85%** |
| `bbfd24e7` | Bolsonaro-B | LEANING-TRUE | 71.8 | 66.6 | 24 | 21 | 3 | **54%** |
| `23721cd9` | Plastik-A ON | LEANING-FALSE | 37.0 | 71.5 | 47 | 44 | 3 | N/A (numeric) |
| `a71bc670` | Plastik-B ON | **STILL RUNNING** | — | — | — | — | — | — |

### Runs with flag OFF (not yet submitted)

Need 2× Plastik DE with `preliminaryEvidenceLlmRemapEnabled=false` for the controlled 2×2 comparison.

---

## What remains

1. Wait for `a71bc67082b64bf0945bb4ee650b3148` (Plastik-B ON) to finish or replace it
2. Disable flag → submit 2× Plastik DE OFF → collect results
3. Spot-check 10-15 remapped seeded items across Bolsonaro-A and Bolsonaro-B for mapping quality
4. Write promotion gate handoff with full 2×2 Plastik comparison
5. Deliver promote-or-hold recommendation

## UCM state

**Flag is currently ON** in the active pipeline config. Must be reset to OFF before submitting the OFF-pair runs and before parking.

## Resume instructions

1. Check if `a71bc670` finished or needs replacement
2. Disable flag, submit 2× Plastik DE OFF, collect
3. Do the spot-check on Bolsonaro remapped items
4. Write the final gate report
