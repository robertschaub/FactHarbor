### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-QC2 Query Planning Distribution Diagnostic

**Task:** Implement and run the reviewed QC2 Query Planning-only distribution diagnostic after X7-W2-LS1 exposed W2 query-cap pressure.

**Files touched:** `scripts/v2/diagnostics/query-planning-distribution.ts`; `apps/web/test/unit/scripts/query-planning-distribution-boundary.test.ts`; `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC2_Query_Planning_Distribution_Diagnostic_Result.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.

**Implementation:** Added a local CLI diagnostic harness that accepts only three exact Captain-defined input keys, builds the V2 run context with Claim Understanding and Query Planning hidden-direct-text activation, runs Claim Understanding, runs Query Planning only if Claim Understanding is accepted, builds Query Planning inspection, and stops at `STOP_AFTER_QUERY_PLANNING_INSPECTION`. The harness prints internal JSON only and records commit, prompt/config hashes, model policy, token/duration telemetry, selected AtomicClaim counts, query-entry count, and W2 cap compatibility. It loads `apps/web/.env.local` locally without printing or modifying secrets.

**Boundary guard:** Added `query-planning-distribution-boundary.test.ts` to enforce the exact script import allowlist. It blocks Source Acquisition, W2 candidate-provider network, content/parser owners, V1 analyzer imports, product/public route entry points, cache/SR/storage, report, verdict, warning, confidence paths, and requires the stop marker.

**Diagnostic results:** Ran on committed implementation `046acef8928390d6173057129b435a83feffc2d4`.

| Input key | CU status | Selected ACs | QP status | Query entries | W2 cap 2 compatible |
|---|---:|---:|---:|---:|---:|
| `swiss_asylum_population` | accepted | 1 | accepted | 2 | yes |
| `bolsonaro_fair_trial` | accepted | 2 | accepted | 5 | no |
| `hydrogen_cars_efficiency` | accepted | 1 | accepted | 3 | no |

**Decision:** QC2 rejects "find one compatible canary" as the next default. Two of three accepted Query Planning outputs exceed W2's current cap of `2`, so the next package should be a reviewed W2 cap-alignment source package, not a blind live rerun and not broad provider/source expansion.

**Verification:**

```powershell
npm -w apps/web run test -- test/unit/scripts/query-planning-distribution-boundary.test.ts
npx tsx ../../scripts/v2/diagnostics/query-planning-distribution.ts --list-inputs
npm -w apps/web run build
git diff --check
```

All passed. The three diagnostic model executions also completed successfully and stopped before downstream execution. No live jobs were submitted.

**Warnings:** QC2 does not authorize W2 cap changes by itself, live jobs, Source Acquisition/W2/provider-network/content/parser/cache/SR/storage/EvidenceCorpus/report/verdict/warning/confidence behavior, product/public/API/UI changes, prompt/config/schema/model/provider policy edits, ACS/direct URL, V1 reuse/work/cleanup, or broader provider expansion. The next implementation needs a reviewed QC3 source package.

**Open items:** Prepare and review `X7-W2-QC3` for W2 cap alignment. Recommended low-complexity shape: align W2 query-entry admission with the existing Query Planning accepted-output maximum, keep one provider, preserve candidate/byte/time bounds, and prove fail-closed behavior above the Query Planning maximum.

**DEBT-GUARD RESULT**

Classification: failed-validation recovery plus missing CLI environment capability.

Chosen option: amend the boundary test to mask approved Captain input literals before broad marker scans; add minimal local `.env.local` loading inside the diagnostic harness.

Rejected path and why: changing Captain input text would violate the approved-input rule; removing blocked-owner markers would weaken the guard; ad hoc shell secret loading would be less reproducible and higher risk.

What was removed/simplified: no product or runtime mechanism was added; no source-acquisition path was touched.

What was added: script-local env loading and a static exact-import boundary test.

Net mechanism count: unchanged for pipeline behavior.

Budget reconciliation: actual files stayed inside the approved QC2 source/test plus completion docs/status/handoff/index envelope.

Verification: focused boundary test, CLI list smoke, build, diff check, and three committed diagnostic executions passed.

Debt accepted and removal trigger: the diagnostic harness is WIP tooling and should be archived or retired after W2 cap-alignment/live-smoke decisions are complete.

Residual debt: W2 cap alignment still needs package review and implementation; QC2 used three Captain-defined inputs, not a broad benchmark.

**For next agent:** Start with a QC3 package/debate for W2 cap alignment. Do not rerun LS1, do not spend a live job on selecting around the cap, and do not open source material/content/parser/evidence/report/public behavior. The useful evidence is that accepted Query Planning can legitimately emit 3-5 entries under current prompt/model/policy.

**Learnings:** A provider-opening proof should align downstream admission caps with the upstream accepted-output contract before spending live provider-network jobs; otherwise the first live smoke measures a mismatch, not provider behavior.
