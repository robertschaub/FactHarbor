# 2026-04-09 | LLM Expert | Claude Code (Opus 4.6) | Bolsonaro Evidence-Mix Regression Investigation

## Task

Investigate why job `ead3f2bbd38646f5b7e64b9bf657ebb9` (Bolsonaro trial fairness, EN) regressed from ~68%/conf 71 to 52%/conf 45. Determine whether code changes since commit `f1a372bf` caused the regression.

## Investigation Summary

Multi-agent debate with 9 agents (3 initial investigators, 3 challengers/defender, 3 follow-up verifiers). The initial conclusion ("Stage 3 clustering stochasticity is ~95% of the cause") was challenged by a Senior Architect review and corrected after evidence-mix analysis.

## Corrected Root Cause: Three-Layer Evidence-Mix Instability

### Layer 1 — Retrieval drift (Stage 2, PRIMARY)

Lula/Lava Jato/Operation Car Wash material volume varies wildly across runs:

| Job | Commit | Truth/Conf | Total Ev | Lula Items | AC_02 Lula% | AC_03 Lula% | AC_03 Lula Contradicts |
|-----|--------|-----------|----------|------------|-------------|-------------|----------------------|
| `173ccb84` | `69642ef0` | 68%/62 | 87 | 10 (11.5%) | — | — | — |
| `81d96fdf` | `7386ebec` | 68%/71 | 93 | 4 (4.3%) | 6% (1/17) | 3% (1/33) | 0 |
| `ead3f2bb` | `e6959951` | **52%/45** | 106 | **26 (24.5%)** | **35% (7/20)** | **56% (14/25)** | **10** |
| `9fbad54c` | `e6959951+` | 52%/62 | 90 | 11 (12.2%) | 10% (2/20) | 26% (7/27) | 4 |

The regression job retrieved **8x more** Lula/Lava Jato material than the pre-regression baseline. Source fetch degradation episodes (75% and 100% failure rates in the regression job) likely contribute: when primary Bolsonaro-specific sources fail, the research loop backfills with well-documented historical Lula/Car Wash material.

### Layer 2 — Evidence admission (Stage 2 extraction, SECONDARY)

The Lula/Moro material is admitted as **direct contradicting evidence** against Bolsonaro's trial fairness. The inference chain: "Moro was biased in Lula's case → Brazilian judiciary has bias problems → Bolsonaro's trial may not be fair."

Key examples from the regression job:
- "Justice Fachin's decision annulled Lula's convictions on the grounds that Judge Moro had no jurisdiction" → `contradicts` AC_03, `probativeValue: high`
- "UN Human Rights Committee agreed that Sergio Moro was biased" → `contradicts` AC_03, `probativeValue: high`
- "STF judge Gilmar Mendes referred to Operation Car Wash investigators as 'gangsters'" → `contradicts` AC_02, `probativeValue: high`

This is historically relevant **context**, not direct evidence about Bolsonaro's specific proceedings. But the extraction LLM classifies it as direct contradicting evidence with high probative value.

### Layer 3 — Clustering amplification (Stage 3, AMPLIFIER)

When heavy historical material enters, Stage 3 clustering creates a broad mega-boundary:
- `ead3f2bb`: CB_09 "Historical and comparative legal analysis" (1889-2025) absorbs 89/106 = 84%
- `9fbad54c`: CB_10 absorbs 67/90 = 74% (less extreme but still concentrated)

This is a **documented chronic issue** for the Bolsonaro family:
- `Docs/ARCHIVE/Report_Quality_Analysis_2026-03-08.md` (line 178): mega-boundary of 30-45 items across 8 runs
- `Docs/WIP/2026-04-06_UPQ1_Phase_A1_Canary_Measurement.md` (line 87): max-boundary share 0.81
- `Docs/ARCHIVE/Bolsonaro_Report_Variability_Investigation_2026-03-07.md`: 16-point truth swing on identical input

## Code Changes: Confirmed Not Primary Driver

Only 2 commits touch analyzer code between pre-regression (`7386ebec`) and post-regression (`e6959951`):
- `f349cc84` — dominant claim assessment + complete-assessment guard (Stage 5 only)
- `e6959951` — code review cleanup of above

**Complete-assessment guard impact: <1pp.** Verified across all jobs:
- `ead3f2bb`: guard=false (AC_02 INSUFFICIENT) → old/new code identical
- `9fbad54c`: guard=true → blocks narrative from adjusting 52.7% to 53% → delta 0.3pp

**`e59d6f19` (scope-of-truth + polarity mismatch):** Already in pre-regression baseline (`7386ebec`). Not a causal commit.

**`f1a372bf`:** Docs-only commit. Not a meaningful causal starting point.

## Cascade Mechanism

```
Layer 1: Web search returns 26 Lula/Lava Jato items (vs baseline 4)
   ↓
Layer 2: Extraction LLM classifies as direct contradicting evidence (high probative)
   ↓ 
   AC_03: 56% Lula material, 10 contradicting items → truth 25% (was 65%)
   AC_02: 35% Lula material, 5 contradicting items → truth 32% (was 62%)
   ↓
Layer 3: Clustering creates mega-boundary → self-consistency collapses → confidence craters
   ↓
Stage 5: Weighted average depressed → narrative adjusts to 52%/45
```

## Per-Claim Impact

| Claim | Pre truth/conf | Post truth/conf | Cause |
|-------|---------------|----------------|-------|
| AC_01 (Brazilian law) | 75%/78 | 72%/61 | Stable — 8% Lula material, mostly neutral |
| AC_02 (international law) | 62%/65 | **32%/21** | 35% Lula material, 5 contradicting, 0 supporting |
| AC_03 (fair trial) | 65%/70 | **25%/41** | 56% Lula material, 10 contradicting, 0 supporting |

## Files Touched

Investigation only — no code modified.

## Key Decisions

1. Corrected initial overclaim of "Stage 3 is ~95% of the cause" to three-layer model
2. Accepted Senior Architect review that evidence-mix drift is the deeper cause
3. Confirmed code changes are not the primary driver (<1pp impact)

## Open Items

- **P0**: How should historical comparator evidence (Lula/Moro/Car Wash) be classified? Direct vs. contextual vs. background? This is an evidence admission policy question for the RELEVANCE_CLASSIFICATION or APPLICABILITY_ASSESSMENT prompts.
- **P1**: Controlled A/B needed: run this input 5+ times on same commit, analyze evidence-mix variance envelope and Lula volume distribution.
- **P2**: Source fetch degradation → historical backfill correlation: does high fetch failure rate systematically increase historical comparator admission?
- **P3**: Boundary concentration gate (>70% → re-cluster) as containment measure (not root-cause fix).

## Warnings

- The Bolsonaro/Lula family has a documented history of instability going back to March 2026. Multiple mitigation attempts (clustering temp reduction, scope normalization proposals) have not resolved it.
- Do NOT frame boundary concentration as the root cause — it is an amplifier. Fixing clustering alone will not fix the evidence-mix drift.
- The ">50 year temporal breadth split" recommendation from the initial analysis is a heuristic patch, not an evidenced fix. Do not prioritize.
- `9fbad54c` also scores 52% with only 74% concentration (below 80% warning threshold), proving the problem persists without extreme clustering.

## For Next Agent

The core investigation question for follow-up is **evidence admission policy**: how should the RELEVANCE_CLASSIFICATION and APPLICABILITY_ASSESSMENT prompts handle historical precedent that is contextually related but not directly about the subject's proceedings? The Lula/Moro material is relevant context for understanding Brazilian judicial patterns, but treating it as direct high-probative contradicting evidence against Bolsonaro's specific trial is analytically inappropriate.

Start with: `apps/web/prompts/claimboundary.prompt.md` (RELEVANCE_CLASSIFICATION, APPLICABILITY_ASSESSMENT sections) and the contrastive prompting learning in `Role_Learnings.md` (2026-03-18 entry).

## Learnings

Appended to `Role_Learnings.md`: yes (see below).
