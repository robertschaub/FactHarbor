# 2026-05-19 Captain Deputy / Steer-Co V2 X7-W5-C Direction

Role: Captain Deputy / Steer-Co Leader
Model: Codex GPT-5.5
Reviewers: Claude Opus 4.6 Senior Architect / LLM Expert, Gemini systems reviewer, Code Reviewer sidecar
Status: consent with package amendments / no implementation authorized by this handoff / no live job authorized

## Trigger

The Captain noted that Steer-Co and development-team agents had not been visibly involved recently. The current W5 state also meets an automatic Steer-Co trigger: W5-B live job `3524dcb15866442ea92bee6351591976` reached model execution but failed `schema_validation_failed`, and the next repair could cross adapter, prompt, schema, diagnostics, or debt boundaries.

## Evidence

- W5-B implementation commit: `2cdf0426`.
- W5-B live-result docs commit: `f13b8997`.
- W5-B hydrogen job: `3524dcb15866442ea92bee6351591976`.
- Observed hidden chain: Claim Understanding accepted, Query Planning accepted, W2 produced `9` candidates, W3-B produced one Source Material record, W4-G/H/I produced eligible bounded extraction input, W5 called the model, then returned `damaged_execution` / `schema_validation_failed` with zero EvidenceItems.
- Latest debt sensor before steering: `advisory_warn`; V2 source `145` files / `41392` lines, tests `127` files / `46642` lines, boundary guard `10131` lines, WIP `210`, handoffs `721`, net mechanism increases `14`, five consolidation-marker advisory files.

## Reviewer Positions

Claude Opus 4.6: `modify`. W5-C is the right direction, but package must sequence local reproduction before new telemetry, exclude schema relaxation, add a negative-path leakage test, add input/model-correlation diagnosis, and make retirement-ledger progression explicit.

Gemini: `support`. W5-C is the most practical and cost-effective next step. It preserves live-job budget and avoids blind retries. Gemini required bounded sanitized schema-failure diagnostics if existing telemetry cannot identify the mismatch.

Code Reviewer sidecar: `modify`. W5-C is directionally correct and file envelope is practical, but package must require `/debt-guard` Full Path, add the concrete W5 internal artifact route test, and specify diagnostic sanitization as an allowlist with no raw provider/source/input/EvidenceItem/prompt/stack leakage.

## Consolidated Decision

Consent exists to proceed with W5-C as a local diagnosis/repair package only after amendments. The package has been amended accordingly.

W5-C may diagnose and repair the existing W5 evidence-extraction schema/output path locally. It may add bounded sanitized schema-failure diagnostics only if existing fixtures and telemetry cannot identify the mismatch.

W5-C does not authorize:

- prompt text edits;
- schema edits;
- model/provider changes;
- another live job or canary;
- public API/UI/report/export/compatibility behavior;
- parser execution;
- report/verdict/warning/confidence behavior;
- cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 reuse, cleanup, or removal.

## Required Package Amendments Applied

- Status changed to Steer-Co reviewed.
- Added reviewer involvement note.
- Added local reproduction before new diagnostics.
- Clarified that "tighten adapter/test handling" cannot mean schema relaxation, semantic alias normalization, or alternate evidence-meaning acceptance.
- Added input/model-correlation diagnosis question.
- Added diagnostic sanitization allowlist and forbidden fields.
- Added negative-path leak testing criterion.
- Added mandatory `/debt-guard` Full Path.
- Added concrete W5 internal artifact route test to verifier plan.
- Expanded retirement-ledger impact with W4-chain and temporary-diagnostic removal triggers.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction.

Direct user/report value: none yet; still hidden/precutover.

Hidden-only value: high, because the package targets the first observed blocker after real source material reached W5 model execution.

Cost/latency impact: positive by avoiding another live job until local diagnosis is verifier-clean.

Retirement or simplification unlocked: potential future merge/delete of W4-I denial and W4-chain containment artifacts only after a later valid hidden EvidenceItem canary.

Scorecard risk: W5-C must not become another permanent diagnostic layer without producing evidence value or a clear Captain-gated prompt/schema decision.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-010, V2-RL-011, V2-RL-012, V2-RL-013, V2-RL-014.

Status changes: none yet.

New mechanism owner: only if temporary diagnostics are added; owner Lead Developer; removal/fold-in trigger is W5 schema-root-cause resolution plus a later Captain-approved canary.

Debt accepted: none yet; implementation must provide `/debt-guard` result.

## V2 Consolidation Gate

Pass only if implementation amends the existing W5 path or adds temporary bounded diagnostics with removal trigger. If the root cause requires prompt/schema edits, W5-C stops and becomes a new Captain-approved prompt/schema package.

## Lead Developer Packet

As Lead Developer,
Skill: debt-guard

Objective:
Implement W5-C only if Captain Deputy approves implementation from the amended package `Docs/WIP/2026-05-19_V2_Slice_X7-W5-C_Evidence_Extraction_Schema_Diagnosis_Repair_Package.md`.

Authority:
Captain Deputy delegated workstream after Steer-Co consent. Proceed autonomously inside scope after implementation approval. Escalate back to Captain Deputy on stop triggers.

Scope:
- Allowed: local W5 schema-failure reproduction, existing W5 adapter/test alignment, bounded sanitized diagnostics only if existing telemetry is insufficient, focused tests, status/handoff/index updates.
- Forbidden: prompt text edits, schema edits, model/provider changes, live jobs, public behavior, parser/report/verdict/warning/confidence/cache/SR/storage/provider expansion/ACS/direct URL/V1 work.

Mandatory workflows:
- `/debt-guard` Full Path before source edits.

Mechanical debt sensors:
- Run `npm run debt:sensors` at closeout and record salient warnings.

Validation:
- Run the verifier set in the amended W5-C package, including the W5 internal artifact route test, V2 gate validation, debt sensors, build, and diff check.

Stop triggers:
- prompt/schema change needed;
- raw text leak into public/default-admin/log/error;
- semantic deterministic evidence repair;
- retries or broad fallback behavior;
- unclear verifier failure root cause;
- any need for another live job before local diagnosis completes.

Output:
Follow Exchange Protocol with warnings, learnings, validation, debt-guard result, scorecard impact, retirement-ledger impact, and next-agent context.

## Warnings

Claude emitted the known Opus adaptive-thinking deprecation warning; repository policy still requires the wrapper and does not change the Captain preference because of that warning.

Gemini could not directly read the ignored WIP file due local ignore patterns, but it reviewed the supplied steering packet and evidence. The Code Reviewer sidecar read the repo files directly.

## Next

Captain Deputy should not implement application code directly. Next action is either Captain approval for W5-C implementation under the amended package or continued package review. No live job should be spent before local W5-C diagnosis/repair is verifier-clean and separately authorized.
