# Current vs Previous Build Report Comparison

Date: 2026-04-05
Status: reference analysis for deployment decisions

## Purpose

This note makes the 5-input canary comparison unambiguous by separating two different questions:

1. Build-over-build comparison
   Compare the newest reports on a given environment to the same-family reports from that environment's previous build.
2. Current local vs current deployed comparison
   Compare the newest local reports directly to the newest deployed reports.

These are not the same question and must not be mixed.

## Traffic-Light Legend

| Marker | Meaning |
|---|---|
| 🟩 IMPROVED | Improved |
| 🟨 MIXED | Mixed / ambiguous |
| 🟥 DECLINED | Declined |
| ⬜ NO COMPARATOR | No valid comparator |

## Current Builds

- Local current build: `07cb2e0d`
- Deployed current build: `b7783872`

## Comparator Rules

- Local previous comparators are mostly from build `ec7a8de8`.
- Deployed previous comparators are mostly from build `521040e9`.
- Where the immediately previous build did not contain a same-family sample, the nearest older-build sample was used and is explicitly marked.
- Deployed Meta has no valid older-build comparator in the currently visible history slice.

## Local: Current Build vs Previous Build

| Status | Family | Current build / job | Previous build / job | Current result | Previous result | Comparison |
|---|---|---|---|---|---|---|
| 🟩 IMPROVED | Earth | `07cb2e0d` / `78496147` | `01ca99f7` / `42476c7a` | `TRUE 95 / 90` | `TRUE 96 / 91` | Slight numeric decline, but structurally better. Old run had a `33`-evidence mega-boundary and a grounding warning; current run is much more balanced. |
| 🟥 DECLINED | Plastik | `07cb2e0d` / `345d6487` | `ec7a8de8` / `c4a4c606` | `MIXED 45 / 66` | `MIXED 51 / 62` | Mixed-to-worse. Evidence increased, but the current run picked up two `verdict_grounding_issue`s and baseless-challenge warnings. |
| 🟨 MIXED | Bolsonaro EN | `07cb2e0d` / `52fcb624` | `ec7a8de8` / `5e93d734` | `LEANING-TRUE 58 / 55` | `LEANING-TRUE 58 / 47` | Mixed. Confidence improved, but current run introduced `verdict_grounding_issue` and `verdict_direction_issue`. |
| 🟩 IMPROVED | Swiss vs Germany | `07cb2e0d` / `e65b9591` | `ec7a8de8` / `da3f0cea` | `MIXED 53 / 61` | `MIXED 48 / 51` | Improved. Higher score and confidence, slightly more evidence, fewer warnings. |
| 🟩 IMPROVED | Meta | `07cb2e0d` / `039b1056` | `ec7a8de8` / `51751fbc` | `TRUE 98 / 93` | `TRUE 92 / 85` | Clear improvement. |

### Local build-over-build summary

- Improved: Meta, Swiss vs Germany
- Structurally improved: Earth
- Mixed: Bolsonaro EN
- Mixed-to-worse: Plastik

## Deployed: Current Build vs Previous Build

| Status | Family | Current build / job | Previous build / job | Current result | Previous result | Comparison |
|---|---|---|---|---|---|---|
| 🟥 DECLINED | Earth | `b7783872` / `3e1253cb` | `f1e5cc96` / `935606e3` | `TRUE 87 / 79` | `TRUE 98 / 92` | Clear decline. Lower score and confidence, more concentration, grounding warning still present. |
| 🟥 DECLINED | Plastik | `b7783872` / `80bbcc3d` | `521040e9` / `3d3f6fbb` | `LEANING-FALSE 41 / 48` | `MIXED 53 / 67` | Declined overall. Grounding warnings disappeared, but truth and confidence dropped and concentration remains high. |
| 🟨 MIXED | Bolsonaro EN | `b7783872` / `eb02cd2e` | `521040e9` / `cfd508bc` | `MOSTLY-TRUE 73 / 70` | `LEANING-TRUE 71 / 66` | Mixed. Score improved and grounding warnings disappeared, but structure regressed to an `80`-evidence mega-boundary. |
| 🟨 MIXED | Swiss vs Germany | `b7783872` / `9042bb73` | `521040e9` / `82344370` | `LEANING-TRUE 60 / 70` | `MOSTLY-TRUE 72 / 55` | Mixed, but likely quality-improved. Truth dropped, yet confidence and evidence depth improved, and insufficiency/rescue warnings disappeared. |
| ⬜ NO COMPARATOR | Meta | `b7783872` / `3f00ba80` | none found | `TRUE 92 / 88` | n/a | No build-over-build judgment possible from the visible history slice. |

### Deployed build-over-build summary

- Declined: Earth, Plastik
- Mixed: Bolsonaro EN, Swiss vs Germany
- No valid build-over-build comparator: Meta

## Current Local vs Current Deployed

| Status | Family | Local current | Deployed current | Reading |
|---|---|---|---|---|
| 🟩 IMPROVED | Earth | `TRUE 95 / 90` | `TRUE 87 / 79` | Local better |
| 🟨 MIXED | Plastik | `MIXED 45 / 66` | `LEANING-FALSE 41 / 48` | Mixed. Local has stronger score/confidence, but also grounding noise. |
| 🟥 DECLINED | Bolsonaro EN | `LEANING-TRUE 58 / 55` | `MOSTLY-TRUE 73 / 70` | Deployed better |
| 🟥 DECLINED | Swiss vs Germany | `MIXED 53 / 61` | `LEANING-TRUE 60 / 70` | Deployed better |
| 🟩 IMPROVED | Meta | `TRUE 98 / 93` | `TRUE 92 / 88` | Local better |

## Key Takeaways

- It is not valid to summarize this batch as "local is better."
- Local current build is better than deployed current on Earth and Meta.
- Deployed current build is better than local current on Bolsonaro EN and Swiss vs Germany.
- Plastik is not a clean local win because the local run still carries grounding noise.
- Local current build improved on some families versus prior local builds, but not all.
- Deployed current build also improved on some families versus prior deployed builds, but regressed materially on Earth and likely on Plastik.

## Traffic-Light Matrices

### Build-over-build

| Family | Local | Deployed |
|---|---|---|
| Earth | 🟩 IMPROVED | 🟥 DECLINED |
| Plastik | 🟥 DECLINED | 🟥 DECLINED |
| Bolsonaro EN | 🟨 MIXED | 🟨 MIXED |
| Swiss vs Germany | 🟩 IMPROVED | 🟨 MIXED |
| Meta | 🟩 IMPROVED | ⬜ NO COMPARATOR |

### Current local vs current deployed

| Family | Local vs deployed |
|---|---|
| Earth | 🟩 IMPROVED |
| Plastik | 🟨 MIXED |
| Bolsonaro EN | 🟥 DECLINED |
| Swiss vs Germany | 🟥 DECLINED |
| Meta | 🟩 IMPROVED |

## Deployment Interpretation

This comparison does not support an "overall local quality win" claim.

The strongest reasons not to treat local as deployment-ready from this batch are:

- local Bolsonaro EN still has validation noise (`verdict_grounding_issue`, `verdict_direction_issue`)
- local Plastik still has grounding noise
- local only clearly wins on the easier/cleaner families, not consistently on the harder decision-driving families

## Source Jobs

### Local current build `07cb2e0d`

- Earth: `7849614707f941a4822120a8c32976a4`
- Plastik: `345d6487f2344923b0eeeb3b7ce1ca4d`
- Bolsonaro EN: `52fcb6244a0145a999d9a5279b019912`
- Swiss vs Germany: `e65b95916b594a90bfe72f31b04304cd`
- Meta: `039b105677a54ccdbc7ef0e5da9c03d2`

### Deployed current build `b7783872`

- Earth: `3e1253cb79a44389b86d0c47ab734f13`
- Plastik: `80bbcc3dd89447d18bac16f1f5b84a96`
- Bolsonaro EN: `eb02cd2e535a4556a2bc3c29868412a0`
- Swiss vs Germany: `9042bb732a8149eb8de1133045214578`
- Meta: `3f00ba806cfc4319be90e5cebc84ab14`
