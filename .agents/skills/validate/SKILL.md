---
name: validate
description: Run an explicitly authorized FactHarbor validation scope on exact Captain-defined inputs, or inspect existing validation results without submitting jobs.
allowed-tools: Bash Read
disable-model-invocation: true
---

Bind scope to the current task and explicit invocation arguments, not an assumed client variable, editor file or last commit. Reading/choosing this skill alone grants no reseed, live-job, provider-spend or file-write authority.

1. Inspect the named change, baseline and available results. For a read-only assignment, compare existing artifacts and return findings in chat; do not submit jobs, reseed, restart or write summaries.
2. Before execution, verify current authorization covers the exact live/provider operation, input list, batch size and assigned stack/state. Authorization already given remains valid. Otherwise return the concrete proposed run for approval.
3. Use only Captain's exact approved input wording from root AGENTS.md/current mandate. Match selected benchmark families to that wording; do not invent, paraphrase, translate, normalize or substitute inputs. Stop for Captain definition if needed wording is absent. The legacy default families file is not an approved input list by itself.
4. Follow root Live Job Submission Discipline and `Docs/AGENTS/Procedures/Live_Validation_Hygiene.md`: integrator commits the relevant change, verifies checkout/runtime state, activates prompts/config when needed and restarts affected services only when the change requires it. Record baseline, prompt/runtime provenance and intended output paths before submission.
5. For an authorized batch, prepare an explicitly owned JSON family subset containing only authorized exact inputs and invoke `node scripts/validation/extract-validation-summary.js <batchLabel> <familiesFile>`. Choose a simple label and an output path inside assigned `test-output/validation/`; do not interpolate arbitrary invocation text into a shell command. Do not use the legacy all-family default. Monitor results and stop after the first three jobs if clear regression meets root policy; use a smaller authorized run when timely monitoring cannot be assured.
6. Compare the resulting artifacts with the authorized baseline via `npm run validate:compare -- <baselineDir> <newDir>` when available. Apply Captain expectations, benchmark bands/Q-codes and the best usable exact/family comparators. Label exact/variant, local/deployed and current/historical provenance. Explain missing comparators.
7. Report job IDs, exact inputs, revision/state evidence, results, cost and limitations. Improvements must be generic; regressions need evidence-backed root cause and recovery classification before further edits. Do not grant a new batch or publish authority through the completion report.

Claude uses this file's explicit-selection flag; Codex uses its adjacent `.agents` policy metadata. Gemini CLI requires the integrator to provision/verify workspace `skills.disabled` and restart when toggling; Cline requires the visible skill toggle state. These selection controls are not filesystem or authorization enforcement.
