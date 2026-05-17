# Lead Architect Handoff: V2 X7-M Claim Understanding Prompt/Contract Repair Approval Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-M Claim Understanding Prompt/Contract Repair Approval Package

**Task:** Draft and review a Captain-gated package for repairing the Claim Understanding prompt/contract issues diagnosed in X7-L.
**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** X7-M is docs-only and non-authorizing. It defines a future repair limited to `V2_CLAIM_UNDERSTANDING_GATE1` wording and focused prompt/contract tests. The future repair may replace dotted-field output bullets with schema-exact nested `ClaimContract` skeletons and clarify topic-neutral externally assessable compliance/standard/requirement questions. It must not relax schemas, accept flat dotted keys, expand hidden artifacts, expose raw prompt/provider payloads, run live jobs, or unlock downstream/source/parser/public behavior.
**Open items:** Implementation remains blocked until explicit Captain approval of the package wording. Even after approval, the final prompt diff needs LLM Expert prompt review and Architect scope acceptance before implementation commit unless the exact final prompt text is already quoted and approved.
**Warnings:** Do not treat the broad "continue" instruction or deputy consensus as analysis-prompt edit approval. Do not mention canary topics in prompt text. Do not continue meaningful downstream Evidence Lifecycle execution until Claim Understanding can produce accepted `ClaimContract` output.
**For next agent:** Start from `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`. If Captain approves section 2 wording, implement only the approved prompt/test envelope and preserve strict schema rejection of flat dotted-key outputs.
**Learnings:** Not appended to `Role_Learnings.md`; this is a slice-specific gate package.

## Review Result

Initial review returned `MODIFY` from all four roles:

- LLM Expert required schema-exact skeletons, separate direct-input versus prepared-snapshot guidance, and explicit future acceptance tests.
- Architect required schema-exact guidance and final prompt-diff LLM Expert/Architect review.
- Security/runtime required explicit bans on hidden artifact expansion and raw prompt/provider payload leakage.
- Code/package required an approval-package file envelope, cached diff hygiene, and implementation-envelope clarity.

After package fixes, all four reviewers approved:

- LLM Expert: APPROVE.
- Architect: APPROVE.
- Security/runtime: APPROVE.
- Code/package: APPROVE.

## Scope Still Blocked

X7-M does not authorize:

- prompt edits without explicit Captain approval;
- schema, adapter, model/cache/gateway policy, runtime activation, provider factory, config, API, UI, report, or export changes;
- Query Planning, X5-X7 harness execution, source-provider/search/fetch/content-dereference/provider-network/parser execution;
- hidden artifact schema/sink/route/projection changes;
- raw prompt text, rendered prompt text, provider request/response, raw model output, environment values, secrets, API keys, or expanded telemetry in artifacts/logs/status/handoffs;
- live jobs, cache IO, Source Reliability, ACS/direct URL, B3 proof, 2D-C, V1 work, or V1 cleanup.
