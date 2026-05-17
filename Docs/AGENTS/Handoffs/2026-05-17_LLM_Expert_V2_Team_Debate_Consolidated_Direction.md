# V2 Team Debate Consolidated Direction

**Date:** 2026-05-17
**Role:** LLM Expert / Experienced Advisor
**Agent:** Codex GPT-5
**Task:** Consolidate V2 pipeline direction through a diverse team debate with independent specialist investigations.
**Status:** Complete. Direction is advisory and does not authorize implementation by itself.

## Decision

**Verdict:** MODIFY.

Continue the V2 replacement path and keep public cutover closed. The next direction should be a reviewed Captain-directed package named approximately:

**X7-W Hidden Product-Internal Source Acquisition Candidate-Runtime Admission Proposal**

This is not another passive readiness/intake marker, and it is not broad IO enablement. It should propose one Source Acquisition-specific admission path for controlled candidate acquisition, returning sanitized structural outcomes only, with the exact authority, file/import envelope, telemetry, security matrix, and retirement target named in the package.

## Evidence Base

- X7-U3 passed hidden Query Planning: accepted plan, 3 bounded query entries, Source Acquisition handoff `ready_not_executable`, and no source/search/fetch/parser/SR/cache/evidence/report/verdict/public execution.
- X7-U4 was projection-only selected-ID diagnostic cleanup.
- X7-V is now implementation-complete as product-internal Source Acquisition intake: accepted Query Planning handoff plus Source Acquisition request can produce `intake_ready_not_executable`, while all execution flags remain false.
- `Docs/AGENTS/V2_Gate_Register.json` marks `gate.research_acquisition` at X7-V but keeps source execution, structural executor invocation, provider-network execution, real fetch, parser, cache/SR, EvidenceCorpus, report/verdict/public wiring, and live jobs blocked. The register remains audit-only.
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts` still marks `research_acquisition` as `notImplemented`; the current generic gateway shape assumes LLM prompt/model/cache policy, which does not fit Source Acquisition cleanly.
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/structural-executor.ts` already has a controlled structural executor shape with budget checks, injected port, opaque IDs/pointers, and no raw content, but X7-V explicitly leaves structural executor/inert-port invocation for a later reviewed package.
- Security/runtime code has strong network/content/parser guard materials, but they are not product-wired authority and cannot be treated as approved runtime IO.

## Team Findings

| Specialist | Position | Key contribution |
|---|---:|---|
| Lead Architect Advocate | MODIFY | X7-V means the next step is post-intake execution-admission, with unlock and retirement criteria. |
| Challenger | MODIFY | Avoid another gate/provenance layer; choose one canonical execution contract and merge or retire at least one redundant shell/guard. |
| Senior Developer | MODIFY | The practical package is hidden Source Acquisition candidate-runtime admission; gateway shape and boundary-guard churn are the main implementation constraints. |
| LLM Expert / Cost-Quality | MODIFY | Do not change models now; add cost/timing/outcome telemetry before model/cache decisions. Downstream semantic tasks wait for source material/EvidenceCorpus contracts. |
| Security Runtime | MODIFY | Do not broadly open IO; at most one reviewed provider-owned candidate acquisition boundary, with SSRF matrix and no parser/real-byte parsing. |
| Reconciler | MODIFY | Consolidated into X7-W hidden candidate-runtime admission proposal. |
| Validator | PASS_WITH_WARNINGS | Wording must not imply existing approval to execute; `gate.research_acquisition` is audit-only and current runtime remains blocked. |

## Captain Direction

Approve only a reviewed X7-W proposal package, not immediate implementation-by-handoff. Required constraints:

- Keep V2 hidden/product-internal/admin-only and public fail-closed.
- Add or reuse exactly one canonical Source Acquisition execution/admission contract.
- Use a Source Acquisition-specific admission path, not the generic LLM prompt/model/cache gateway.
- Require accepted Query Planning handoff, Source Acquisition request, explicitly approved authority snapshot, budget snapshot, provider allowlist, and injected/provider-owned boundary.
- Emit only sanitized structural outcomes and internal artifacts.
- Include attempt caps, timeout/cancellation, cost/timing/outcome telemetry, and ledger fields.
- Permit opaque candidate IDs and non-dereferenceable content packet pointers only.
- Keep cache/SR, parser, real-byte parsing, EvidenceCorpus, evidence extraction, report, verdict, public UI/API/export, ACS/direct URL, V1 reuse, V1 cleanup, and live jobs closed.
- Require an explicit SSRF/security matrix if any real provider/network boundary is proposed: DNS/private/final-address checks, redirects, private/link-local ranges, proxy bypass, timeout/abort, byte caps, compression behavior, and sanitized telemetry.
- Name at least one old shell/artifact/guard branch to merge, retire, or demote if X7-W supersedes it.

## Watchlist

- **Over-engineering:** V2 has accumulated many proof-only gates and guards. X7-W should reduce or consolidate at least one obsolete path, not only add a new layer.
- **Authority drift:** The gate register is audit-only. Execution authority must live in reviewed runtime/package controls, not in documentation rows.
- **Gateway mismatch:** `research_acquisition` is non-LLM execution; forcing it through LLM task approval mechanics would blur responsibilities.
- **Security boundary:** P0 parser admission is not isolation. Real fetched-byte parsing remains blocked until deployment-candidate isolation proof is accepted.
- **Cost-quality gap:** Hidden Query Planning has token/duration data but no dollar-cost ledger and no source-quality evidence yet. Cost optimization should follow telemetry, not guesses.
- **Quality evidence gap:** There is no EvidenceCorpus, sufficiency, boundary formation, verdict, aggregation, or public report quality evidence for V2 yet.

## Validation State

No code or prompt changes were made in this debate task. No live jobs or expensive validations were run. Validation consisted of independent specialist inspections, reconciler synthesis, validator review, and local evidence checks against status, gate register, X7-V package, orchestrator, gateway policy, intake boundary, and structural executor files.

## Warnings

This debate does not authorize source/search/fetch/provider/parser/SR/cache IO, EvidenceCorpus, report/verdict behavior, public exposure, live jobs, ACS/direct URL, V1 reuse, or V1 cleanup. Any X7-W implementation must load the applicable guard workflow before edits because it touches existing guarded mechanisms and complexity debt.

## Learnings

The team did not disagree on the V2 strategy. The useful disagreement was sequencing: after X7-V, another `ready_not_executable` artifact would be low value unless it consolidates or retires something. The next value-bearing move is a controlled, reviewed candidate-runtime admission proposal with telemetry and a hard non-goal list.
