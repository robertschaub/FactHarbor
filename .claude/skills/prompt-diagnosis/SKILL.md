---
name: prompt-diagnosis
description: Review authorized existing report evidence for prompt provenance, schema, rollout or model drift; produce grounded findings and proposals without live execution.
allowed-tools: Read Glob Grep Bash
---

Bind this public contributor procedure to the current task and explicit arguments, not editor selection. Read applicable root/nested instructions. Resolve source, evidence and output homes through task scope or a verified adopted profile; a public cwd never selects a public output. A separately bound supplemental procedure must be qualified and available; report the selected edition and do not silently substitute when it is missing or stale. Access and skill selection grant no execution, spending, publication or persistence authority. Read-only sessions return findings in chat.

`TASK_ARGUMENTS` means the task's literal explicit selection, not a shell variable or inferred editor context. Record `CODE_ROOT`, full code revision `HEAD-SHA`, changed-file hashes where relevant, and exact authorized evidence/output bindings. Never put private record names or summaries in a public index; follow `Docs/AGENTS/Policies/Handoff_Protocol.md`.

# Prompt diagnosis

Inspect the exact requested reports first; unavailable reports stay NOT-INSPECTABLE. Never substitute nearby jobs or scan unassigned evidence. Establish explicit read-only report/database/log sources before access; missing evidence never permits creating a database or lifting a hold. Empty arguments do not authorize a wider scan.

## Provenance and coverage

Record job identity, exact input when available, execution source revision, promptContentHash, status and structured warnings before using logs. Execution commit is code context, not exact prompt provenance; `+dirty` or another suffix makes Git retrieval approximate. Recover authorized canonical runtime blobs by promptContentHash when available. Raw file SHA256 is not the canonical blob hash. Compare runtime blob, active state and current source separately before attributing an effect to a prompt edit.

Use BLOB-EXACT, BLOB-MISSING, NO-PROMPT-HASH, COMMIT-APPROXIMATE or CURRENT-ONLY as applicable. Report confirmed, inferred and speculative causes separately. Check the actual consumer contract before filing schema drift. A missing log supplies no corroboration, not proof of success or failure. Current rollout/model configuration may differ from a historical report; record the distinction.

Read relevant public issue identities in `Docs/AGENTS/Prompt_Issue_Register.md`, public role learnings and task-authorized discovery. Missing or header-only sources do not establish a complete corpus check. An empty public index says nothing about assigned private history. Recurrence requires matching category, overlapping prompt/profile and materially similar cause, not wording similarity alone.

## Finding categories

| ID | Category | Detection signal |
|----|----------|-----------------|
| P1 | Instruction ambiguity | Two distinct valid interpretations exist; output/logs support the unintended one |
| P2 | Missing or insufficient constraint | Model produced valid-looking but wrong output that the prompt did not explicitly constrain away |
| P3 | Conflicting instructions | Two instructions cannot both be followed AND no priority rule resolves them |
| P4 | Output schema drift | Prompt output field/type/enum diverges from the TypeScript consumer — requires stage code check |
| P5 | Teaching-to-test or benchmark anchoring | Few-shots, examples, or vocabulary anchored to specific benchmark families, Captain-defined inputs, or named entities instead of generic abstractions |
| P6 | Insufficient reasoning scaffold | High-stakes scored output lacks an explicit comparison, decomposition, reconciliation, or validation step needed for compounding logic |
| P7 | Threshold miscalibration | Numeric threshold appears mis-set relative to repeated outputs or explicit logs; single-run guesses stay LOW |
| P8 | Stage boundary confusion | Prompt references upstream outputs that do not match the actual upstream stage schema or sequence |
| P9 | Section/order bias | Critical rule buried late in the rendered prompt or after a large dynamic payload; consistently ignored with no better explanation |
| P10 | Prompt injection surface | User-controlled or fetched text interpolated into the prompt body without a clear instruction/data boundary |
| P11 | Calibration/model drift | Behavior changed without a material prompt change; model route or provider changed |
| P12 | Register stale-open false match | Finding looks like a known issue but the register entry is too stale or weakly matched to treat as recurring |

For apparent instruction conflicts, check explicit precedence before filing P3. Emit each finding with job/source evidence, category, severity (PHASE-BLOCKER/HIGH/MEDIUM/LOW), confidence (CONFIRMED/INFERRED/SPECULATIVE), prompt/profile/section, source revision and dirty state, prompt hash, coverage, runtime state, recurrence and whether the cause remains present.

## Proposals and register contract

A fix proposal must address an abstract generic mechanism, respect multilingual/root constraints, distinguish prompt wording from code/config/rollout causes, and name regression risk. Unsupported prompt changes remain speculative proposals; do not pile them onto unresolved runtime uncertainty. `/validate` and live execution require their own explicit selection and current authority.

Preserve existing public issue identities, unresolved obligations and schema. Write only to the exact assigned record when current authority covers it; otherwise return proposed content. New detailed investigations use their assigned non-public home unless explicitly public-safe. Public drift checks cover only public inputs, not any other record.

A proposed issue block carries: stable ID; Type; Severity; Confidence; Prompt/profile and section; Prompt hash; Coverage; First seen and Last confirmed source/date; Status; Description; Observed behavior; Recommended fix; Pcode and qCode on explicit lines. Every new entry carries a qCode line, using `qCode: n/a` when no Q-code applies; use `Pcode: n/a` when no P-code applies. Do not invent a P/Q crosswalk.

Register only CONFIRMED findings or INFERRED findings with more than CURRENT-ONLY evidence; SPECULATIVE findings stay proposals. Mark resolved only with adequate current evidence, partial with a note, and recurring with updated confirmation. Unconfirmed status needs materially newer relevant prompt/runtime provenance and lack of reconfirmation; raw commit count or documentation-only changes alone do not establish staleness. Preserve prior evidence. Any approved atomic update uses a temporary sibling of the assigned record; on a locked-file failure, report the temporary file and stop rather than retrying or using a new destination.

The output states inspected scope, unavailable evidence, structured findings, proposed fixes, rejected mechanisms and exact proposed persistence home. No application, register, expectation, Git, model or runtime change follows automatically.

Existing register entries may encode P-codes in headings and carry Constraint/Check limitation fields; retain that compatible form. Do not force a schema rewrite or invent missing historical evidence. For new entries, emit the explicit fields above. Inspect both the public register and any bound detail record for recurrence; amendments to existing public identities belong in the public register only with public-safe content and authority, while full private evidence stays in its assigned record. Read-only proposals name the intended home for each change.

Blob recovery uses the public `apps/web/src/lib/config-storage.ts` and `config-schemas.ts` storage/canonicalization contracts. Query the existing assigned configuration database read-only for config_blobs.content by validated content_hash; use parameterized values. Trace current schema rather than assuming a local database path or creating a missing database.
