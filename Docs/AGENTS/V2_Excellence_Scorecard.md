# V2 Excellence Scorecard

**Status:** Active draft for Captain/Deputy/Steer-Co use
**Owner:** Captain Deputy with Steer-Co review
**Last updated:** 2026-05-19
**Purpose:** Define what "excellent V2" means before more hidden machinery is added.

This file is the short convergence target for the V2 pipeline rebuild. It does
not authorize implementation, live jobs, prompt/model/config changes, public
cutover, or V1 cleanup. It gives future V2 packets a stable quality bar.

## Operating Rule

Every substantial V2 package must state its scorecard impact:

```text
V2 SCORECARD IMPACT
Quality dimension advanced:
Direct user/report value:
Hidden-only value:
Cost/latency impact:
Retirement or simplification unlocked:
Scorecard risk:
```

If a package is hidden-only and does not retire/merge/quarantine older
machinery, it requires a Steer-Co exception under the V2 Consolidation Gate.

## Balanced Risk Mitigation Rule

Safety, containment, governance, and diagnostic work must be proportionate to a
named risk and must preserve forward progress toward report-quality value.

This applies the repository-wide `/debt-guard` Balanced Risk Mitigation rule to
V2 packages. Before adding a safety mechanism, reviewers must compare whether
the risk is better handled by amending an existing mechanism, narrowing or
deleting obsolete machinery, quarantining a temporary path, or adding a new
mechanism. Adding new machinery is justified only when the existing path cannot
carry the risk mitigation with lower net complexity.

A mitigation is well-balanced when it:

- prevents, detects, or contains a plausible failure that would materially harm
  report quality, security, provenance, cutover safety, or user trust;
- is scoped no broader than needed for that risk, while still being strong enough
  to be effective;
- has a clear owner, verifier, and success/stop condition;
- defines a merge, retirement, or stabilization path when it adds hidden,
  temporary, or duplicated machinery;
- does not displace the next report-value slice unless the risk would make that
  slice unreliable or unsafe.

Do not underbuild real safety. Do not overbuild permanent scaffolding for
speculative risks. The target is a simple, capable, maintainable pipeline whose
safety mechanisms are load-bearing and reviewable.

Substantial V2 packages that add safety, containment, governance, diagnostic,
proof, guard, route, or hidden-artifact machinery must include the debt-guard
style decision result: `amend`, `narrow`, `delete`, `quarantine`, or `add`, with
the rejected alternatives and net-complexity impact stated explicitly.

## Release-Quality Inputs

Use only Captain-approved exact inputs. Do not paraphrase, translate, or invent
substitutes.

| Family | Exact Input | Expected V2 Direction |
|---|---|---|
| bundesrat-rechtskraftig | `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | mixed/true-side legal-force analysis with explicit chronology and legal-force caveat |
| bundesrat-simple | `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | high true-side chronology with procedural caveat |
| asylum-235000-de | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` | true-side official SEM aggregate, no stitched component surrogate |
| asylum-wwii-de | `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` | false-side historical endpoint-stock comparison |
| bolsonaro-en | `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?` | true-side with caveats across domestic law, fair trial, and verdict fairness |
| bolsonaro-pt | `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas` | same true-side shape as EN; sentence fairness clause preserved |
| hydrogen-en | `Using hydrogen for cars is more efficient than using electricity` | false-side; tank-to-wheel and full-pathway efficiency separated |
| plastic-en | `Plastic recycling is pointless` | false-side or leaning-false with nuanced caveats, not UNVERIFIED collapse |

Mechanical bands and comparator job IDs remain authoritative in
`Docs/AGENTS/benchmark-expectations.json` and
`Docs/AGENTS/Captain_Quality_Expectations.md`.

## Excellence Criteria

| ID | Criterion | Excellent V2 Means | Evidence Required |
|---|---|---|---|
| V2-Q1 | Input fidelity | AtomicClaims preserve thesis-critical qualifiers and legal/factual anchors. | Claim Understanding artifacts plus report review on approved inputs |
| V2-Q2 | Evidence acquisition | V2 produces real source candidates, bounded Source Material, and EvidenceCorpus content without public leakage. | Hidden/admin artifacts and later public report citations |
| V2-Q3 | Evidence extraction | EvidenceItems are sourced from authorized Source Material, carry provenance, and are probative rather than filler. | EvidenceCorpus/EvidenceItem inspection and report citations |
| V2-Q4 | Boundary formation | ClaimAssessmentBoundaries or V2 equivalent group compatible EvidenceScopes without mega-boundary collapse. | Boundary counts, scope summaries, comparator review |
| V2-Q5 | Verdict quality | Verdict direction/truth/confidence match Captain bands or accepted tolerance, with caveats expressed in reasoning/confidence rather than wrong top-line direction. | `/report-review` against expectations and comparators |
| V2-Q6 | Warning integrity | User-visible warnings reflect verdict impact; hidden diagnostics stay admin-only. | Warning/event inspection and public report scan |
| V2-Q7 | Multilingual robustness | DE/PT/EN families behave by meaning, not English-specific wording. | Approved multilingual families and claim preservation checks |
| V2-Q8 | Public cutover safety | Public V2 only projects successful reports after explicit cutover approval and fail-closed guards pass. | Public compatibility tests and cutover gate evidence |
| V2-Q9 | Cost/latency discipline | Excellent reports fit accepted cost/latency envelopes without defaulting every lane to premium reasoning. | LLM usage metadata, wall-clock, reasoning-budget notes |
| V2-Q10 | Complexity convergence | Each package unlocks report value or retires/merges/quarantines old machinery. | `V2_Retirement_Ledger.md`, debt sensors, consolidation blocks |

## Current Baseline Snapshot

As of 2026-05-19, V2 has proved hidden direct-text runtime, Query Planning,
Source Acquisition candidate/provider network, bounded Source Material, bounded
corpus text, bounded extraction-input packet, and execution-readiness denial.
Public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` and
report-damaged by design.

This is containment/provenance progress, not yet excellent report-quality
progress. The next convergence work should move from hidden source/evidence
plumbing toward evidence extraction and report-quality proof, while retiring or
quarantining older gates/diagnostics where possible.

## Cutover Readiness Bar

V2 is not cutover-ready until all are true:

- Approved inputs have V2 report-review evidence against the comparator set.
- Public report fields are complete, cited, and warning-correct.
- No hidden raw text, prompts, provider payloads, internal ledger IDs, or
  hidden statuses leak through public/API/UI/report/export surfaces.
- Cost and latency are known for the approved input set.
- V1 replacement coverage is mapped in `V2_Retirement_Ledger.md`.
- V1 cleanup is blocked until V2 owns the equivalent public path and
  stabilization evidence exists.

## Review Cadence

- Update this scorecard only when Captain or Steer-Co changes the target.
- Use it for every V2 implementation packet and closeout.
- Reconcile it after each approved V2 live-job tranche.
