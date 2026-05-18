### 2026-05-18 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2-QC3 W2 Cap Alignment Implementation

**Task:** Implement the deputy-approved QC3 W2 cap-alignment package after QC2 showed accepted Query Planning outputs can exceed W2's original cap of `2`.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`; `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`; `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `Docs/WIP/2026-05-18_V2_Slice_X7-W2-QC3_W2_Cap_Alignment_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.

**Key decisions:** Implemented QC3 at `c2fdcd9c`. W2 hidden candidate-provider-network admission now uses reviewed cap `6` with total candidate/network timeouts `9000ms`. Per-query timeout `1500ms`, max candidates per query `3`, byte cap `32768`, one-provider/no-credential Wikimedia posture, retry policy `none`, redirect `deny`, proxy `none`, and all downstream/public/storage flags remain unchanged. The owner includes a compile-time assertion against the current Query Planning max so future upstream cap changes do not silently widen W2.

**Open items:** Prepare a separate reviewed LS2-style live-smoke package before any live provider-network canary. QC3 itself ran no live jobs and does not authorize one.

**Warnings:** W2 now has a higher hidden maximum: up to six provider attempts, eighteen materialized hidden candidates, and a `9000ms` W2 budget. This is still hidden-only structural provider evidence. It does not authorize source material, content dereference, parser execution, cache/SR/storage, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, public output, ACS/direct URL, V1 reuse/work/cleanup, or broad provider expansion.

**For next agent:** If proceeding, draft LS2 as a separate reviewed package. Use a Captain-defined input likely to exercise the former cap mismatch, commit and refresh runtime first, re-check Wikimedia endpoint status, and keep the live slot count narrow.

**Verification:**

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

All passed. Focused W2/boundary suite: 2 files, 81 tests. Candidate runtime: 10 tests. Network authority/envelope/transport/factory: 18 tests.

**Learnings:** W2 cap alignment should amend the existing cap/budget mechanism, not runtime validators. The total timeout must scale with the reviewed admitted query count because current validators intentionally reject budgets that cannot cover every admitted query at the per-query timeout.

**DEBT-GUARD RESULT**

Classification: failed-validation recovery; incomplete existing mechanism.

Chosen option: amend W2's existing cap/budget constants and exact snapshot tests in place.

Rejected path and why: compatible canary rerun would avoid rather than fix the mismatch; assertion-only cap `2` would preserve LS1's failure mode; changing validators for partial `3000ms` execution would edit outside the QC3 envelope and add semantics.

What was removed/simplified: old magic `2/3000ms` W2 assumptions were removed from owner tests and boundary guard.

What was added: six-query completion test, seven-query fail-closed test, exact `6/9000ms` snapshot expectations, and a compile-time Query Planning cap assertion.

Net mechanism count: unchanged.

Budget reconciliation: implementation stayed inside the approved W2 owner/test/boundary guard envelope; no runtime validators, network runtime, artifact route/sink, prompt/config/schema/model/policy/public/source-material/parser/cache/SR/V1/package files were edited.

Verification: all required safe-local/build verifiers listed above passed.

Debt accepted and removal trigger: boundary guard remains large and slow but was not broadened beyond the W2 cap assertion; split guard debt only when a future provider/source package needs broader guard restructuring.

Residual debt: no post-QC3 live provider-network evidence yet; LS2 must be a separate reviewed package with committed/refreshed runtime and endpoint-status re-check.
