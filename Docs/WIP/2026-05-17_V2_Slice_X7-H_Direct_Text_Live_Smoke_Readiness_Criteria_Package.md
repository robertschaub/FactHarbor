# V2 Slice X7-H Direct-Text Live-Smoke Readiness Criteria Package

**Date:** 2026-05-17
**Status:** approved docs-only package; non-authorizing
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `9bdd20f5` (`feat: add v2 x7g2 runtime denial adapter`)
**Parent packages:** X5 hidden integration, X6/X6-P hidden candidate-acquisition harness/provenance, X7-A/B/C/D/E/F hidden source-acquisition readiness/execution denial, X7-G1/G2 downstream no-corpus denial.
**Decision source:** post-X7-G2 deputy next-step debate. Architect, Code/package, LLM/semantic, and Security/runtime all recommended a docs-only direct-text live-smoke readiness package before any live jobs.
**Review result:** Architect APPROVE, Code/package APPROVE, LLM/semantic APPROVE, Security/runtime APPROVE. No reviewer authorized live jobs or source/prompt/runtime execution.

## 1. Purpose

Define what a future V2 hidden direct-text live smoke would need to prove before any live job can be considered meaningful.

This package exists because the hidden direct-text chain now has more plumbing than before, but that does not imply report readiness. X7-F closes source-acquisition execution as no-IO, X7-G1/G2 map no-corpus denial safely, and parser/source/product/public execution remains blocked. A later live smoke must therefore be scoped as a hidden runtime/provenance/fail-closed check, not as evidence quality, report quality, verdict quality, or public readiness.

This package is documentation only. It does not approve running live jobs.

## 2. Approval Requested

Approve this package as the canonical criteria for a later direct-text live-smoke execution package.

This approval would permit future agents to draft a separate executable live-smoke package using these criteria.

This approval would not permit:

- live jobs, canaries, validation batches, or smoke runs;
- prompt/frontmatter/config/model/schema edits, including X3-B implementation;
- source/provider/search/fetch/content-dereference/parser execution;
- parser worker spawn, byte/frame/packet consumption, parsed material, B3 proof execution, or 2D-C;
- source material, extraction input, EvidenceCorpus, EvidenceItems, warnings, report generation, verdicts, confidence, or public compatibility output;
- product/orchestrator/runner/API/UI/report/export wiring;
- cache IO, durable storage, or Source Reliability integration;
- ACS/direct URL execution;
- V1 reuse, V1 cleanup, or V2 public cutover.

## 3. Readiness Meaning

A future direct-text live smoke may prove only hidden runtime continuity and fail-closed behavior for Captain-approved direct-text inputs.

Allowed proof targets for a later package:

- committed revision and runtime freshness are known;
- hidden V2 shell activation path is deliberately selected;
- hidden Claim Understanding, hidden Query Planning, Source Acquisition request/handoff, source-acquisition readiness, execution denial, and downstream no-corpus denial artifacts are inspectable where applicable;
- no public V2 result is exposed as valid;
- no source IO, parser execution, parsed material, EvidenceCorpus, EvidenceItems, report, warning, verdict, or confidence is produced;
- no-corpus denial is recorded as pre-execution structural denial, not analytical evidence scarcity.

Not allowed proof targets:

- report quality;
- verdict correctness;
- evidence sufficiency;
- source reliability behavior;
- user-facing warning materiality;
- public compatibility/cutover readiness;
- parser isolation quality;
- real web/PDF/page capability.

## 4. Preconditions For A Future Executable Package

A later executable live-smoke package must require all of the following before any job is submitted:

1. **Committed source revision:** worktree clean; commit hash recorded in the package and in job provenance.
2. **Runtime refresh:** web/API/runner processes refreshed after the commit, or an explicit reason why no refresh is needed.
3. **Prompt/config state recorded:** prompt/config hashes or reseed state captured. If a package depends on X3-B prompt alignment, X3-B must have explicit Captain approval plus LLM Expert prompt review and Architect scope acceptance before execution.
4. **Captain-defined inputs only:** use only exact Captain-approved direct-text inputs. No paraphrase, translation, normalization, or substitute inputs.
5. **Hidden artifact inspection plan:** define exact artifact locations, IDs, fields, and screenshots/log snippets to inspect.
6. **Pass/fail criteria:** define fail-closed/pass/fail outcomes before submitting jobs.
7. **Rollback/stop rules:** define what to do if public output, source IO, parser execution, evidence/report/verdict behavior, cache/SR/storage, or stale runtime provenance appears.
8. **Budget cap:** no more than the currently authorized live-job budget; default cap remains zero until the executable package is accepted.

## 5. Candidate Inputs For Later Package

The currently Captain-approved future direct-text canaries are:

- `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
- `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

This package only records them. It does not approve running them.

## 6. Required Hidden Artifact Checks

A later executable package must define checks for these artifact classes where they exist in the live path:

- selected pipeline mode and kill-switch/activation state;
- public cutover guard status remains blocked unless a separate public-cutover package has approved otherwise;
- Claim Understanding hidden runtime artifacts, including model/prompt/config provenance;
- Query Planning hidden task/result provenance and prompt/profile version;
- Source Acquisition request/handoff remains non-executing where expected;
- X6/X6-P candidate acquisition/provenance state if the path reaches candidate acquisition;
- X7-A/B/C/D/E/F source-material/readiness/execution-denial state;
- X7-G1/G2 downstream no-corpus denial state;
- no source/provider/search/fetch/content/parser/cache/SR/storage/public exposure flags are true;
- no EvidenceCorpus/EvidenceItems/report/verdict/confidence/warnings are generated from X7-G denial.

## 7. Pass/Fail Criteria Template

Minimum pass criteria for a future executable package:

- job runs against the committed and refreshed revision stated in the package;
- artifacts show hidden V2 path selection and expected fail-closed gates;
- public V2 output remains damaged/blocked or absent as specified;
- no source IO, parser execution, parsed material, EvidenceCorpus, EvidenceItems, report, verdict, confidence, cache/SR/storage, ACS/direct URL, or public exposure occurs;
- all observed X7-G no-corpus denial is pre-execution structural denial, not analytical evidence scarcity.

Hard fail criteria:

- stale runtime or dirty/uncommitted source is used;
- a non-Captain-defined input is submitted;
- any source/provider/search/fetch/content/parser execution occurs without a separate approved package;
- any public API/UI/report/export path exposes V2 result as valid;
- any EvidenceCorpus/EvidenceItem/report/verdict/confidence is produced from the no-corpus path;
- cache/SR/storage is touched;
- warning/report language treats no-corpus denial as evidence scarcity or report quality;
- parser 2D-C, B3 proof execution, ACS/direct URL, V1 cleanup, or public cutover is attempted.

## 8. X3-B Prompt Alignment Relationship

X3-B prompt/frontmatter/text alignment remains explicitly Captain-gated. A broad "continue" instruction is not enough to edit prompts.

A future live-smoke package must choose one of these routes before execution:

- **Route A:** require X3-B implementation first. This needs explicit Captain approval plus LLM Expert prompt review and Architect scope acceptance.
- **Route B:** keep X3-B out of scope and define the smoke as runtime/fail-closed plumbing only, with no prompt-quality or report-quality claims.

If reviewers cannot agree between Route A and Route B for a specific future smoke package, escalate before running jobs.

## 9. Review Questions

Architect:

- Does this package define a useful readiness boundary without authorizing execution?
- Are future live-smoke pass/fail criteria scoped to hidden runtime/fail-closed behavior rather than report readiness?

Security/runtime:

- Are all forbidden runtime surfaces and stop conditions explicit?
- Does this prevent hidden plumbing from being mistaken for permission to run source/parser/product paths?

Code/package:

- Is the docs-only envelope clear and enforceable?
- Are future execution package prerequisites concrete enough for a new agent to follow?

LLM Expert:

- Does this preserve the difference between no-corpus denial and analytical evidence scarcity?
- Does the X3-B relationship avoid implicit prompt approval?

## 10. Completion Requirements

Before committing this docs-only package:

- obtain Architect, Security/runtime, Code/package, and LLM Expert review;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as readiness-package pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff under `Docs/AGENTS/Handoffs/`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2
git diff --check
git diff --cached --check
```

Do not run live jobs, expensive LLM tests, prompt edits, source edits, B3 proof, or 2D-C.
