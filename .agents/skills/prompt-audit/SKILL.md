---
name: prompt-audit
description: Static contributor review of selected LLM prompts against public constraints, caller contracts and nine quality criteria. No runtime data, live jobs or writes.
allowed-tools: Read Glob Grep Bash
---

Bind this public contributor procedure to the current task and explicit arguments, not editor selection. Read applicable root/nested instructions. Resolve source, evidence and output homes through task scope or a verified adopted profile; a public cwd never selects a public output. A separately bound supplemental procedure must be qualified and available; report the selected edition and do not silently substitute when it is missing or stale. Access and skill selection grant no execution, spending, publication or persistence authority. Read-only sessions return findings in chat.

`TASK_ARGUMENTS` means the task's literal explicit selection, not a shell variable or inferred editor context. Record `CODE_ROOT`, full code revision `HEAD-SHA`, changed-file hashes where relevant, and exact authorized evidence/output bindings. Never put private record names or summaries in a public index; follow `Docs/AGENTS/Policies/Handoff_Protocol.md`.

# Prompt audit

Scope explicit prompt files/directories, or all `apps/web/prompts/` when the task authorizes that scope. Record code root/revision and changed-content hashes. Read root analysis rules and `apps/web/AGENTS.md`; trace each prompt to its actual caller and output type/validator. Absence from analyzer/types.ts alone is not evidence of a missing contract.

| Criterion | Check |
|---|---|
| R1 Rule compliance | Root genericity, semantic-LLM, UCM, terminology and input rules |
| R2 Efficiency | Redundancy, bounded output and stable/dynamic separation; estimated tokens=characters/4, >8000 CONCERN and >12000 FAIL for this static audit only |
| R3 Effectiveness | Required inputs, outputs and edge cases match the caller |
| R4 Unambiguity | Consistent priorities, field meanings and tie-breaks |
| R5 Generic hygiene | Abstract examples; no benchmark anchoring or trigger-vocabulary reuse |
| R6 Multilingual robustness | No single-language/script assumptions for analysis |
| R7 Bias and neutrality | Symmetric evidence treatment and no assumed verdict direction |
| R8 Schema alignment | Actual caller's required fields, types and enums |
| R9 Failure coverage | Empty, malformed and insufficient inputs have explicit handling |

Return PASS/CONCERN/FAIL per criterion, line evidence for concerns, missing coverage and a concise score (PASS count out of nine). Unknown evidence is unverified, not PASS. In findings-only tasks omit proposals. Otherwise any proposal must state an abstract mechanism, satisfy current root constraints and identify regression risks; reject domain-specific wording, deterministic semantic substitutes, phrase-matching tests and teaching to the test. Never certify a proposal you have not checked.

This is static review only: no reports, databases, logs, jobs, edits or automatic skill invocation. For runtime provenance, propose `prompt-diagnosis`; for existing report quality, propose explicitly selected `report-review`. Code-level diagnosis belongs to `audit`. Proposing a follow-up does not authorize it.

## Visible proposal audit

For each proposed fix emit one row with C1–C7: C1 generic/no trigger-vocabulary reuse; C2 no deterministic semantic substitute; C3 no phrase-matching test mitigation; C4 analysis strings only in prompt/search text; C5 tunables in UCM; C6 multilingual; C7 no benchmark teaching. `Y` means violation (reject); `N` means compliant. Include a short evidence/reason cell; any unknown prevents certification. These are constraints, not rubric R1–R9.

`F## | Proposed change | C1 | C2 | C3 | C4 | C5 | C6 | C7 | Evidence/reason`

Before accepting proposals, emit `AUDIT-CERT: every accepted fix is N for C1-C7. Violators listed in Rejected fixes.` only when truthful. Otherwise show rejected/uncertain proposals and the unresolved compliance issue; never soften a rule to pass the grid. Findings-only tasks omit proposals and their audit/certification.
