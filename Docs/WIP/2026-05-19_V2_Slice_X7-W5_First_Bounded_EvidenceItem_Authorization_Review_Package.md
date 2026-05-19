# V2 Slice X7-W5 First Bounded EvidenceItem Authorization Review Package

**Date:** 2026-05-19
**Role:** Lead Developer / Captain Deputy
**Status:** Review/approval package only; no implementation authorized
**Parent state:** W4-I implemented/verifier-clean as hidden execution-readiness denial; no W4-I canary run
**Parent implementation commit:** `99bff8c4794dc209c922044a9093b391ddcfab9d`
**Prior product-route proof:** W4-H canary `df8402362bee46daba2fe83000156b0d`
**Live-job tranche ledger:** `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
**Remaining live-job tranche:** `5`
**Package author:** Lead Developer / Captain Deputy
**Reviewer:** Steer-Co consent in current Codex thread on 2026-05-19; Opus and Gemini package review support with amendments; Captain/Steer-Co review still required before implementation
**Future implementer:** Lead Developer / delivery lane, only after explicit package approval
**Future canary runner:** Blocked; Lead Developer / Captain Deputy only after separate canary authorization

## 1. Purpose

X7-W5 is the first proposed phase transition after W4-I. It must not become another W4-J readiness, denial, or observability layer.

The narrow objective is to define the approval boundary for the first bounded hidden/admin-only EvidenceItem value path from the existing W4-H bounded extraction-input packet and W4-I execution-readiness denial. The future implementation path should aim to run exactly one bounded V2 `evidence_extraction` task over runtime-owned W4-H packet text and produce either:

- at least one hidden/admin-only `EvidenceItem`-contract result from real LLM extraction; or
- an explicit accepted `no_extractable_evidence`, blocked, or damaged result when the approved task cannot honestly extract evidence.

The preferred pass target for the first live canary is at least one hidden EvidenceItem, because V2 needs movement toward report-quality value. However, implementation must not fabricate evidence if the source text does not support it.

An honest `hidden_no_extractable_evidence` local result is allowed when the approved extraction task cannot extract evidence from the bounded packet. It is not a passing live canary, must not be counted as EvidenceItem value, and must stop before W6 or report progression for Steer-Co review.

This package authorizes no implementation. It prepares the review boundary for the first extraction-execution package.

## 1.1 Gate Accounting

**What W5 unlocks:** a future Captain-approved implementation package may open hidden/internal `evidence_extraction` prompt/model execution for the existing W4-H bounded packet, under the existing V2 task contract and strict no-public-leak boundaries.

**What older guard/artifact W5 retires or merges:** W5 does not delete anything immediately. Its implementation package must include an exact W4-I merge/deletion plan. Once a positive extraction executor exists and passes local plus product-route proof, W4-I should merge into executor pre-call gating or be deleted as a separate denial artifact. If same-slice code removal is not possible, the implementation package must justify parity and provide a concrete same-follow-up removal trigger. W5 must also define the merge path for W4-A/W4-C/W4-D/W4-E closure evidence into a smaller EvidenceCorpus/extraction owner after first successful extraction.

**Stop condition:** stop and return to Steer-Co if W5 drifts into another denial-only/readiness-only artifact, cannot state the W4-I merge/deletion trigger, adds files without an actual W4-I merge/deletion or parity justification, requires prompt/schema text edits, requires public/default-admin/log/error text exposure, or cannot keep the first implementation envelope bounded to hidden/internal extraction over one runtime-owned W4-H packet.

## 2. Current Ground Truth

- W2 can produce hidden Wikimedia Core REST Search candidates.
- W3-B can produce one hidden/admin-only bounded Wikimedia page-summary Source Material record.
- W4-G can produce one bounded corpus-text sidecar with hash/length/provenance-only default route projection.
- W4-H can produce exactly one hidden/admin-only `bounded_text_extraction_input_packet`; the passed canary packet was `613` bytes and `<= 4096`.
- W4-I is implemented/verifier-clean as `extraction_input_structurally_eligible_execution_denied`; execution remains closed and no W4-I canary has run.
- The live-job tranche ledger records reset `6`, remaining `5`; no W4-I or W5 canary is authorized.
- Public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`.
- Current static Evidence Lifecycle policy marks `evidence_extraction` as `symbolic_not_executable`, prompt approval `missing`, model policy `not_approved`, and execution authority `not_executable`.
- Existing clean-room V2 task contracts already define `V2_EVIDENCE_EXTRACTION` and schema `v2.evidence_extraction_result.0`.

## 3. Recommended W5 Shape

W5 should be a first positive execution-value gate, not a new passive proof.

Recommended future execution scope:

```text
hidden_internal_evidence_extraction_single_packet
```

Recommended task key:

```text
evidence_extraction
```

Recommended prompt section and schema, if approval later opens execution:

```text
V2_EVIDENCE_EXTRACTION
v2.evidence_extraction_result.0
```

Recommended future result statuses:

```text
hidden_evidence_item_extraction_completed
hidden_no_extractable_evidence
blocked_pre_execution
damaged_execution
```

The future W5 implementation must use LLM-owned semantic extraction only. It must not use deterministic keyword, regex, similarity, topic, or language-specific logic to decide evidence meaning, claim direction, probative value, applicability, or evidence scope.

## 4. Exact Accepted Parent Input

A future W5 implementation may accept only runtime-owned, same-ledger W4-H and W4-I state. It must not read input text from:

- public result JSON;
- compatibility projections;
- UI state;
- report markdown;
- exports;
- logs or errors;
- default admin route projections;
- copied, JSON-cloned, spread, or reconstructed packet objects.

Required W4-H parent:

- `decisionVersion: "v2.evidence-lifecycle.extraction-input-authorization.x7w4h"`
- `status: "bounded_extraction_input_packet_created_extraction_execution_closed"`
- exactly one `bounded_text_extraction_input_packet`
- `inputTextByteLength > 0`
- `inputTextByteLength <= 4096`
- `inputTextHash` equals `sha256(inputText)`
- `sourceMaterialTextHash` equals `inputTextHash`
- `providerId` equals the parent W4-G sidecar provider id exactly
- public cutover remains `blocked_precutover`

Required W4-I parent:

- `decisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i"`
- `status: "extraction_input_structurally_eligible_execution_denied"`
- `executionGateStatus: "closed_pre_execution"`
- `deniedAuthority: "x7w4i_no_extraction_execution_authority"`
- same W4-H packet hash/length/provider lineage as the accepted W4-H parent
- default projection remains `hash_length_provenance_only`

W5 must fail closed if either parent is missing, not runtime-owned, mutated after provenance, copied from route output, ledger-mismatched, hash/length mismatched, provider-mismatched, or publicly projected.

## 5. Future Hidden EvidenceItem Result Boundary

The future W5 implementation may produce one hidden/admin-only extraction result envelope. The default admin projection must be hash/length/provenance/count/status only.

The following TypeScript-like shape is an illustrative boundary specification and field proposal, not a frozen implementation contract. Future implementation may refine exact names and nesting inside the approved envelope. The binding constraints are: internal/admin-only visibility, forbidden public pointer exposure, default redaction, provenance, counts/hashes/lengths, no public leak, no prompt text, no raw provider/model payload, and no source/input/EvidenceItem text in public/default-admin/log/error surfaces.

Illustrative hidden result fields:

```ts
type W5BoundedEvidenceExtractionDecision = {
  decisionVersion: "v2.evidence-lifecycle.bounded-evidence-extraction.x7w5";
  decisionId: string;
  kind: "bounded_evidence_extraction_execution";
  status:
    | "hidden_evidence_item_extraction_completed"
    | "hidden_no_extractable_evidence"
    | "blocked_pre_execution"
    | "damaged_execution";
  visibility: "internal_admin_only";
  publicPointerExposure: "forbidden";
  publicCutoverStatus: "blocked_precutover";

  taskKey: "evidence_extraction";
  promptSectionId: "V2_EVIDENCE_EXTRACTION";
  outputSchemaVersion: "v2.evidence_extraction_result.0";

  parentPacketId: string | null;
  parentPacketHash: string | null;
  parentPacketByteLength: number | null;
  parentProviderId: string | null;
  parentW4iDecisionVersion: "v2.evidence-lifecycle.execution-readiness-denial.x7w4i" | null;
  parentW4iStatus: "extraction_input_structurally_eligible_execution_denied" | null;

  extractionResultHash: string | null;
  evidenceItemCount: number;
  evidenceItemStatementHashes: readonly string[];
  evidenceItemStatementByteLengths: readonly number[];
  defaultProjection: "hash_length_provenance_only";
  evidenceItemTextReturnedByDefault: false;
  sourceTextReturnedByDefault: false;

  executionTelemetry: {
    providerId: string | null;
    modelId: string | null;
    promptHash: string | null;
    taskPolicySnapshotHash: string | null;
    configSnapshotHash: string | null;
    approvalPointer: string | null;
    durationMs: number | null;
    inputTokens: number | null;
    outputTokens: number | null;
    retryCount: 0;
    cacheDecision: "no_store_no_read";
  };
};
```

EvidenceItem statement text and extraction rationale may be retained internally only if required by the future hidden result contract. They must not appear in public JSON, UI, reports, exports, compatibility projections, default admin routes, logs, or errors. If explicit admin inspection is later added, it must require an authenticated inspection flag, remain no-store/internal-only, and still never expose source input text by default.

## 6. Prompt, Model, Config, And Schema Authority

This review package does not authorize any prompt/model/config/schema edit or approval flip.

A later implementation package must choose one of these paths:

1. **Preferred W5-A path:** use existing `V2_EVIDENCE_EXTRACTION` prompt section and existing `v2.evidence_extraction_result.0` schema without editing prompt or schema text. The package may request exact Captain approval to activate hidden/internal `evidence_extraction` model execution and gateway/model-policy metadata for this one task only.
2. **If existing prompt/schema is insufficient:** stop and prepare a separate LLM Expert/Captain prompt-schema review package before any source implementation.

No implementation may silently relax the schema, normalize unsupported provider output aliases, fabricate EvidenceItems on parse/schema failure, or add retry-first repair loops.

## 7. Failure Boundaries

Future W5 blocked/damaged outcomes must create no public result content and no public EvidenceItems.

Recommended blocked reasons:

- `w4h_decision_missing`
- `w4h_not_runtime_owned`
- `w4h_packet_missing`
- `w4h_packet_invalid`
- `w4i_decision_missing`
- `w4i_not_runtime_owned`
- `w4i_not_structurally_eligible`
- `parent_lineage_mismatch`
- `provider_id_mismatch`
- `packet_hash_mismatch`
- `packet_length_mismatch`
- `prompt_or_model_not_approved`
- `task_policy_not_executable`
- `token_budget_overflow`
- `call_budget_exhausted`

Recommended damaged reasons:

- `provider_unavailable`
- `provider_timeout`
- `parse_failure`
- `schema_validation_failed`
- `task_contract_validation_failed`
- `raw_leakage_marker_detected`

Every blocked or damaged result must keep public V2 `4.0.0-cb-precutover` / `blocked_precutover` and must not produce public warnings or report content.

## 8. V2 SCORECARD IMPACT

**Quality dimension advanced:** V2-Q3 Evidence extraction. W5 is the first package aimed at producing hidden EvidenceItem value.

**Direct user/report value:** none in this review package and none until later public report gates. The future hidden extraction result is a prerequisite for report value, not public value itself.

**Hidden-only value:** defines the first bounded hidden path from Source Material text to V2 EvidenceItem contracts.

**Cost/latency impact:** future implementation must record prompt/model cost, token usage, latency, retry count, and status. It must use one bounded extraction call over one packet for the first implementation; no fan-out, retries, provider expansion, or cache IO.

**Retirement or simplification unlocked:** successful W5 implementation should merge W4-I into executor pre-call gating and start reducing W4-A/C/D/E/G/H/I proof-chain duplication.

**Scorecard risk:** another denial-only W5 variant would worsen V2-Q10 complexity convergence and must hard-stop back to Steer-Co.

## 9. V2 RETIREMENT LEDGER IMPACT

**Rows touched:**

- V2-RL-004 hidden observability ledger and admin-only artifact routes
- V2-RL-009 W4-A/W4-C/W4-D/W4-E readiness/shell/denial chain
- V2-RL-010 W4-G bounded corpus-text sidecar
- V2-RL-011 W4-H bounded extraction-input packet
- V2-RL-012 W4-I execution-readiness denial
- V2-RL-013 boundary guard monolith
- V2-RL-014 V2 WIP/handoff volume

**Status changes:** none in this review package.

**New mechanism owner:** future W5 bounded evidence extraction executor would be owned by Lead Developer / Evidence Lifecycle delivery lane.

**Removal / merge trigger:** the future W5-A implementation package must include an exact W4-I merge/deletion plan. After first approved W5 executor implementation and one accepted hidden extraction proof, W4-I must be merged into positive executor pre-call gating or deleted as a standalone denial artifact. If same-slice removal is not possible, W5-A must justify parity and name the same-follow-up removal trigger. After the same proof, W4-A/C/D/E should be merged into fewer same-ledger corpus/extraction ownership checks or explicitly quarantined as historical closure evidence.

**Debt accepted:** this package accepts docs-only planning debt. Future implementation debt is acceptable only if it produces hidden EvidenceItem value and removes/merges older W4 machinery, or if Steer-Co explicitly accepts parity with a same-follow-up removal trigger.

## 10. V2 CONSOLIDATION GATE

**Package:** X7-W5 First Bounded EvidenceItem Authorization Review Package

**Substantial expansion:** yes, as a proposed future phase transition to extraction execution.

**Value produced:** review package only now. Future implementation must target hidden EvidenceItem extraction value. An explicit honest no-extractable/blocked/damaged result is allowed locally under LLM-owned semantics, but `hidden_no_extractable_evidence` is not a passing live canary and cannot advance W6 or report progression without Steer-Co review.

**Retires / merges / demotes / quarantines:** future W5 must merge or delete W4-I after the first positive executor exists, or justify exact parity plus a same-follow-up removal trigger. It must define W4-A/C/D/E merge/quarantine follow-up after successful extraction.

**Debt kept and removal trigger:** W4-G/H/I stay keep-for-now until W5 implementation proves extraction executor ownership. W4-I removal trigger is first approved executor that consumes W4-H and owns pre-call readiness. Future implementation net-mechanism target is reduction preferred, and at worst parity after W4-I merge; if W5-A adds files without an actual W4-I merge/deletion or approved parity justification, return to Steer-Co.

**Mechanical debt sensor run:** `npm run debt:sensors` -> `advisory_warn`, generated `2026-05-19T17:02:18.660Z`. Salient warnings: V2 source `141` files / `39358` lines, V2 tests `123` files / `45403` lines, boundary guard `9909` lines, Docs/WIP `205`, handoffs `710`, net mechanism increases `14`, and `5` consolidation-marker review files.

**Steer-Co exception:** not requested. Steer-Co consented to W5 only because it is bound to first hidden EvidenceItem value and W4 retirement/merge triggers.

## 11. Proposed Future Implementation Envelope

This package does not authorize implementation. If Captain/Steer-Co later approves implementation, keep the first source envelope narrow.

Candidate future source/test envelope:

```text
apps/web/src/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance.ts
apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.ts
apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.ts
apps/web/src/lib/analyzer-v2/orchestrator.ts
apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy.ts
apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance.test.ts
apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts
apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts
apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
Docs/STATUS/Current_Status.md
Docs/STATUS/Backlog.md
Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json
Docs/AGENTS/Agent_Outputs.md
Docs/AGENTS/Handoffs/
Docs/AGENTS/index/handoff-index.json
```

`static-policy.ts` may be touched only if the later approval explicitly authorizes hidden/internal `evidence_extraction` task-policy activation metadata. Prompt files, task-contract schemas, UCM defaults, cache/SR/storage, public surfaces, and V1 files remain outside the candidate envelope unless a later exact package says otherwise.

The future implementation envelope must also state the planned W4-I merge/deletion files. If those files cannot be removed or merged in the same implementation, the package must prove behavioral parity with the new executor pre-call gate and name the same-follow-up removal trigger before any live canary can be proposed.

## 12. Proposed Verifier Plan

Package-only verification:

```powershell
npm run debt:sensors
git diff --check
git status --short --untracked-files=all
```

Future implementation verifier minimum:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run debt:sensors
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Focused tests must prove:

- copied, route-derived, mutated, provider-mismatched, hash-mismatched, or length-mismatched W4-H/W4-I parents fail closed;
- `evidence_extraction` is the only opened task and only when the later approval explicitly activates it;
- schema accepted `evidence_extracted` with at least one EvidenceItem remains hidden/admin-only;
- accepted `no_extractable_evidence` does not fabricate EvidenceItems;
- parse/schema/provider failures become damaged hidden/admin-only outcomes, not public warnings or reports;
- source text, `inputText`, EvidenceItem statement text, model raw output, prompt text, and raw provider payloads do not appear in public/default-admin/log/error surfaces;
- public V2 remains precutover and no compatibility/report/UI/export fields change;
- W4-I merge/deletion plan is implemented or parity is justified with a concrete same-follow-up removal trigger.

Future W5-A approval/pass criteria:

- exact W4-I merge/deletion plan is included in the implementation package;
- net mechanism count is reduced if possible and at worst remains at parity after W4-I merge;
- adding W5 files without actual W4-I merge/deletion requires Steer-Co review before implementation continues;
- `hidden_no_extractable_evidence` is accepted only as an honest local result, not as live-canary pass or EvidenceItem value;
- no W6, report, verdict, warning, confidence, public, or cutover progression follows `hidden_no_extractable_evidence` without Steer-Co review.

## 13. Live Canary Recommendation

One later W5 product-route canary is worth proposing after, and only after, the future implementation is approved, committed, verifier-clean, runtime-refreshed, route-preflighted, and ledger-accounted.

Recommended input, unless Captain chooses another approved input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Expected live-job accounting: one canary consumes `1` from the remaining `5`, leaving `4`. No second W5 canary without a separate reviewed package.

Canary pass target:

- W2/W3-B/W4-G/W4-H/W4-I repeat the known hidden chain.
- W5 runs exactly one bounded hidden `evidence_extraction` execution over the runtime-owned W4-H packet.
- Preferred pass: `hidden_evidence_item_extraction_completed` with `evidenceItemCount >= 1`.
- Honest local-only outcome, not live-canary pass: `hidden_no_extractable_evidence`. This must stop before W6/report progression and return to Steer-Co.
- Public V2 remains `4.0.0-cb-precutover` / `blocked_precutover`.
- No source text, packet text, EvidenceItem statement text, prompt text, raw provider payload, hidden marker, or internal ledger data leaks into public/default-admin/log/error surfaces.
- Report/verdict/warning/confidence behavior remains closed.

## 14. Exact Approval Boundaries

Blocked until a later exact Captain-approved implementation package:

- implementation source edits;
- prompt/model/config/schema edits or approval flips;
- hidden/internal `evidence_extraction` execution;
- EvidenceItem generation;
- live jobs/canaries;
- parser execution;
- public API/UI/report/export/compatibility exposure;
- report/verdict/warning/confidence behavior;
- cache/SR/storage behavior;
- provider expansion, W2/W3 widening, ACS/direct URL support;
- V1 reuse, V1 cleanup, or V1 removal.

Always hard-stop:

- raw text leak into public/default-admin/log/error surfaces;
- another hidden-only denial/readiness layer without Steer-Co exception;
- failed verifier with unclear root cause;
- unresolved reviewer dissent;
- work outside the approved package scope;
- standing Captain approval gate without explicit approval.

## 15. Suggested Approval Wording For Future Implementation

If Captain/Steer-Co accepts this package, use exact wording similar to:

```text
Approved to implement X7-W5-A under Docs/WIP/2026-05-19_V2_Slice_X7-W5_First_Bounded_EvidenceItem_Authorization_Review_Package.md, limited to one hidden/internal bounded evidence_extraction execution path over runtime-owned W4-H packet state plus W4-I eligibility, using the existing V2 evidence_extraction task contract and schema without prompt/schema text edits, with default hash/length/provenance-only admin projection, no public behavior, no live job until separately authorized, no parser, no report/verdict/warning/confidence behavior, no cache/SR/storage, no provider expansion, no ACS/direct URL, and no V1 work. The implementation must include an exact W4-I merge/deletion plan, target net mechanism reduction or at worst parity after W4-I merge, and stop if it drifts into another denial-only layer or treats hidden_no_extractable_evidence as a passing EvidenceItem-value gate.
```

If approval does not explicitly include hidden/internal `evidence_extraction` task activation and any required model-policy metadata change, the implementation must remain blocked at the package boundary.

## 16. Review Questions

Reviewers should answer:

1. Is W5 correctly framed as first bounded extraction value, not another readiness layer?
2. Is it acceptable to use the existing `V2_EVIDENCE_EXTRACTION` prompt section and `v2.evidence_extraction_result.0` schema without prompt/schema edits?
3. What exact hidden/internal model-policy activation is required, and is it safe to include in W5-A or should it be split?
4. Is default admin projection sufficiently redacted if it exposes counts, hashes, lengths, statuses, and provenance only?
5. Is the W4-I merge/deletion plan concrete enough, including same-follow-up removal trigger if same-slice removal is impossible?
6. Should a W4-I canary be skipped in favor of a W5 canary after implementation?

## 17. Decision Requested

Approve, amend, or reject X7-W5 as the next review/approval package.

This package does not authorize implementation or a live job. If approved, the next action is a bounded Lead Developer implementation package/commit for X7-W5-A, still subject to the exact approval wording and all standing Captain gates.
