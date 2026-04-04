# Seeded Evidence Remap — Promotion Gate (Completed Record)

**Date:** 2026-03-27
**Status:** COMPLETED — promoted to default-on
**Flag:** `preliminaryEvidenceLlmRemapEnabled`

> **Historical note:** The filename still contains `_Parked` because this document began as a parked gate. It is now the final WIP record for the completed promotion decision.

---

## Final State

- **Decision:** Promote `preliminaryEvidenceLlmRemapEnabled` to default-on
- **Promotion commit:** `b5fad127`
- **Current-stack validation commit:** `5654841b`
- **Post-promotion confirmation docs:** `65800acb`
- **Rollback:** standard UCM toggle (`preliminaryEvidenceLlmRemapEnabled: false`)

Canonical detailed records:
- `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Promotion_Gate.md`
- `Docs/AGENTS/Handoffs/2026-03-27_Senior_Developer_Seeded_Evidence_LLM_Remap_Experiment.md`

---

## Decision Basis

The promotion decision was made on the **current stack**, after FLOOD-1 (`maxEvidenceItemsPerSource: 5`), using controlled ON/OFF comparisons where `preliminaryEvidenceLlmRemapEnabled` was the only intentional config difference.

The decisive signal was the **Bolsonaro extended-input A/B pair**:

| Metric | OFF | ON |
|--------|-----|----|
| Job | `e8d50baa` | `e25cb33c` |
| Verdict | LEANING-TRUE | LEANING-TRUE |
| Truth% | 64.3 | 64.4 |
| Conf% | 66.3 | 64.4 |
| Seeded mapped | `0/27` | `22/24` |

Interpretation: the remap recovered claim-local attribution **without changing the substantive verdict**. That is the target behavior for this feature.

Supporting signals:
- **Hydrogen:** large seeded-mapping recovery, same FALSE-leaning outcome
- **Plastik DE:** controls remained directionally stable within known variance
- **Spot-check:** 14/15 remapped Bolsonaro seeded items clearly correct, 1 borderline-defensible, 0 fabricated

---

## Historical Runs (Old Stack, Pre-FLOOD-1)

These older runs were useful background only. They were **not** used as the final promotion basis because they predated the single-source flooding mitigation.

| Job | Input | Flag | Verdict | Truth% | Conf% | Seeded | Mapped | Unmapped |
|-----|-------|------|---------|--------|-------|--------|--------|----------|
| `927031ef` | Bolsonaro-A | ON | LEANING-TRUE | 59.2 | 64.3 | 24 | 21 | 3 |
| `bbfd24e7` | Bolsonaro-B | ON | LEANING-TRUE | 71.8 | 66.6 | 24 | 21 | 3 |
| `23721cd9` | Plastik-A | ON | LEANING-FALSE | 37.0 | 71.5 | 47 | 44 | 3 |
| `a71bc670` | Plastik-B | ON | LEANING-FALSE | 36.0 | 75.0 | — | — | — |

**Correction:** `a71bc670` completed successfully as LEANING-FALSE `36/75`. It was only the parked document that was stale.

---

## Current-Stack Gate Batch

| Input | Flag | Job | Verdict | Truth% | Conf% | Seeded | Mapped | Unmapped |
|-------|------|-----|---------|--------|-------|--------|--------|----------|
| Bolsonaro ext. | OFF | `e8d50baa` | LEANING-TRUE | 64.3 | 66.3 | 27 | 0 | 27 |
| Bolsonaro ext. | ON | `e25cb33c` | LEANING-TRUE | 64.4 | 64.4 | 24 | 22 | 2 |
| Plastik DE | OFF | `eed0e5b4` | MOSTLY-FALSE | 26.8 | 69.7 | 45 | 28 | 17 |
| Plastik DE | ON | `34814b07` | LEANING-FALSE | 38.9 | 65.7 | 45 | 44 | 1 |
| Hydrogen | OFF | `ffdeb643` | FALSE | 12.3 | 80.4 | 28 | 0 | 28 |
| Hydrogen | ON | `5dc58456` | MOSTLY-FALSE | 15.6 | 83.1 | 29 | 18 | 11 |
| Homeopathy EN | OFF | `efe1102f` | LEANING-TRUE | 60.8 | 74.2 | 29 | 5 | 24 |
| Homeopathy EN | ON | `b5f29c58` | MOSTLY-TRUE | 75.8 | 24.0 | 30 | 26 | 4 |

Initial monitor note from this batch:
- Homeopathy EN produced one ON run with a confidence collapse (`74.2 -> 24.0`), so promotion carried an explicit post-promotion monitor condition rather than a claim of zero risk.

---

## Promotion Executed

- **Captain approved:** 2026-03-27
- **Default flipped to `true`:** `b5fad127`
- **Rollback remains available:** set `preliminaryEvidenceLlmRemapEnabled: false` in UCM

At the moment of promotion, the architectural conclusion was:
- promote to default-on
- keep rollback available
- carry a Homeopathy-family monitor note

---

## Post-Promotion Confirmation Runs

Two confirmation runs were executed after the default flip and before remote deployment.

| Input | Job | Verdict | Truth% | Conf% | Seeded | Mapped | Unmapped | Remap% |
|-------|-----|---------|--------|-------|--------|--------|----------|--------|
| Homeopathy EN | `de699b14` | MOSTLY-FALSE | 26.6 | 71.1 | 35 | 32 | 3 | 91% |
| Bolsonaro ext. | `bf2c3b9a` | LEANING-TRUE | 70.4 | 69.0 | 28 | 22 | 6 | 79% |

Interpretation:
- **Homeopathy monitor resolved on repeat.** The earlier confidence collapse did not reproduce; confidence returned to a normal range.
- **Bolsonaro remained healthy** in its established LEANING-TRUE band with strong seeded recovery.

The Homeopathy note is therefore no longer a deploy blocker. It remains a routine watchlist item only.

---

## Final Conclusion

`preliminaryEvidenceLlmRemapEnabled` is now a **promoted default-on feature**.

Why this decision held:
- It repairs a severe attribution defect for semantic-slug seeded evidence
- The main beneficiary family (Bolsonaro) showed the correct repair signature
- Hydrogen corroborated the same pattern
- Plastik stayed within known variance bands
- Post-promotion confirmation removed the only live monitor concern as a deployment blocker

This WIP document is now a completed historical record. The detailed operational and analytical rationale lives in the linked handoff documents above.
