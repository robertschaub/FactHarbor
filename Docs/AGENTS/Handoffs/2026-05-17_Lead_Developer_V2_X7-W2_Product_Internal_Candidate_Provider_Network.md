---
### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-W2 Product-Internal Candidate-Provider Network

**Task:** Implement the reviewed X7-W2 package as one hidden product-internal candidate-provider network path after X7-W1C, using the approved Wikimedia Core REST Search page-search endpoint and preserving all no-public/no-source-material gates.

**Files touched:** `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`; `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.ts`; `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`; `apps/web/src/lib/analyzer-v2/orchestrator.ts`; focused W2 tests, orchestrator tests, boundary guard, `Docs/AGENTS/V2_Gate_Register.json`, `scripts/validate-v2-gate-register.mjs`, `Docs/STATUS/Current_Status.md`, and `Docs/STATUS/Backlog.md`.

**Key decisions:** W2 uses only provider `wikimedia_core`, endpoint `ep_wikimedia_core_page_search`, host `api.wikimedia.org`, path `/core/v1/wikipedia/en/search/page`, method `GET`, q-only query text request parameters, no `limit`, no credentials, redirect deny, no proxy, JSON `pages` array, and identity-only candidate projection. The W2 owner freezes and validates endpoint, provider allowlist, candidate budget, network budget, and W2 authority hashes before invoking the existing 7N-3B2 provider-network boundary. The artifact sink and internal route expose only bounded admin-only structural telemetry; no raw query/provider payload, source material, EvidenceCorpus, report, verdict, warning, or confidence is emitted. Wikimedia is documented as a time-bound hidden proof dependency because Core API deprecation begins July 2026.

**Open items:** No live jobs were run and W2 itself does not authorize live jobs. A later reviewed execution package is required for any live provider-network proof. Future source-material/content dereference/parser/EvidenceCorpus/evidence/report/verdict work remains blocked. Provider portfolio and multilingual coverage are not solved by W2.

**Warnings:** W2 opens a narrow product-internal network execution seam, so older pre-W2 boundary guards were amended to allow exactly this route while preserving direct public import bans and forbidden downstream behavior. Do not generalize this to broad source execution. Do not add fixed literal endpoint parameters, content dereference, parser execution, cache/SR/storage, public output, ACS/direct URL, V1 reuse, or V1 cleanup under this slice.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 6 files / 98 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts` - passed, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts` - passed, 4 files / 18 tests.
- `npm -w apps/web run build` - passed.
- `npm run validate:v2-gates` - passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` - passed.

**For next agent:** Treat `gate.research_acquisition` as audit-only and now anchored at `X7-W2` / `implemented_product_internal_candidate_provider_network_hidden_no_source_material`. The W2 hidden artifact route is internal admin-only and no-store. The next meaningful direction is either a separately reviewed live-provider proof package or a source-material/content-dereference package, not parser work, broad provider execution, or public output.

**Learnings:** No Role_Learnings update. W2 showed that provider-network progress needs both endpoint-specific capability and guard simplification: broad transitive no-provider guards must be replaced by exact owner-path guards once a narrow network seam is approved.

```text
DEBT-GUARD RESULT
Classification: failed-validation recovery; incomplete-existing-mechanism.
Chosen option: amend the W2 owner type boundary and boundary-guard expectations in place.
Rejected path and why: adding new wrappers or fallback gates would stack mechanisms; reverting W2 would discard approved hidden provider-network progress.
What was removed/simplified: W2 telemetry projection no longer mentions stripped lower-layer field names in source; outdated pre-W2 guard assumptions were narrowed to exact W2 owner reachability.
What was added: no new runtime mechanism beyond the approved W2 package; tests and audit validators were updated to cover W2 state.
Net mechanism count: unchanged relative to the approved W2 design.
Budget reconciliation: touched files stayed inside the W2 source/test/status/handoff/index envelope.
Verification: focused W2 suite, lower runtime tests, boundary guard, build, and gate validators passed as listed above.
Debt accepted and removal trigger: boundary-guard size remains a maintainability concern; split or consolidate when the next provider/source package touches the same guard area.
Residual debt: no live provider evidence yet; no source-material/content parser path yet; Wikimedia endpoint is time-bound and must be rechecked before future provider expansion.
```
