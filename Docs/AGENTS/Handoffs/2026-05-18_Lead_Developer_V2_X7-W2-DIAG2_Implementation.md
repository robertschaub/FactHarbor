### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-DIAG2 Sanitized Transport Diagnostics Implementation

**Task:** Implement the reviewed DIAG2 package so W2 hidden candidate-provider-network attempts carry enough sanitized transport diagnostics to diagnose the LS2 pre-byte `transport_failure` hard fail.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-transport.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts`; `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`; approved focused tests; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W2-DIAG2_Implementation.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** DIAG2 amends the existing hidden diagnostic/telemetry path rather than adding a parallel logger. W2 network-attempt telemetry now carries existing lower-level `dnsAddressCount`, `finalAddressValidation`, `responseStatusCodeCategory`, and `contentTypeState`, plus bounded `selectedAddressFamily` and `transportFailureClass` enums. Transport classes are structural only: DNS resolution, reset, refusal, network/host unreachable, socket timeout, TLS, address-family, unknown, or not-applicable.

**Verification:** Focused DIAG2 set passed: 8 files / 110 tests. `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed: 43 files / 256 tests. `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 88 files / 621 tests. `npm -w apps/web run build` passed. `npm run validate:v2-gates` passed. `node scripts/validate-v2-gate-register.mjs --self-test` passed. `git diff --check` passed before docs updates and will be rerun after index refresh.

**Open items:** DIAG2 does not itself prove the external provider path. A separate reviewed LS3/repair package is required before any live rerun or provider behavior repair.

**Warnings:** No live jobs were run. DIAG2 does not authorize source material, content dereference, parser/cache/SR/storage, EvidenceCorpus/evidence/report/verdict/warning/confidence behavior, public output, ACS/direct URL, provider expansion, prompt/config/model/schema/provider-policy edits, V1 work, or V1 cleanup. Raw URL/path/query/payload/body/header/IP/error messages/stacks/causes/candidate text remain excluded from hidden W2 telemetry and artifacts.

**DEBT-GUARD RESULT**
Classification: `incomplete-existing-mechanism`.
Chosen option: amend existing hidden diagnostic and telemetry projection.
Rejected path and why: a new diagnostic sink would duplicate the W2 artifact telemetry path and increase drift.
What was removed/simplified: no execution behavior was added; no retry, fallback, provider, or public path was introduced.
What was added: two bounded diagnostic enums and propagation of existing lower-level hidden diagnostic fields.
Net mechanism count: execution mechanisms unchanged; diagnostic schema widened in the existing path.
Budget reconciliation: actual diff stayed inside the approved DIAG2 source/test/status/handoff/index envelope.
Verification: see verifier list above.
Debt accepted and removal trigger: none.
Residual debt: LS2 root cause remains unproven until a reviewed LS3/repair package uses the new telemetry on a committed/refreshed run.

**For next agent:** Start from this implementation state. The next safe step is not a blind rerun; prepare or review an LS3/repair decision package that uses DIAG2 telemetry, preserves hidden-only/no-source-material posture, and still keeps public V2 pre-cutover blocked.

**Learnings:** Safe telemetry can still be too coarse for root-cause work. Prefer bounded structural categories in the existing hidden artifact path before making repair or rerun decisions.
