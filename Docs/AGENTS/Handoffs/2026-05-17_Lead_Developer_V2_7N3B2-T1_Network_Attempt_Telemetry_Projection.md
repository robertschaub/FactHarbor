---
roles: [Lead Developer, Captain Deputy]
topics: [v2, 7n3b2, telemetry, provider-network, source-acquisition]
files_touched:
  - apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts
  - apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/WIP/2026-05-17_V2_Slice_7N3B2-T1_Network_Attempt_Telemetry_Projection_Source_Package.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_7N3B2-T1_Network_Attempt_Telemetry_Projection.md
  - Docs/AGENTS/index/handoff-index.json
---

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 7N3B2-T1 Network Attempt Telemetry Projection
**Task:** Implement the reviewed 7N3B2-T1 package so W2 can observe hidden provider-network cost, timing, outcome, and byte-count telemetry without widening network execution or public surfaces.

**Done:**
- Added `SOURCE_ACQUISITION_NETWORK_ATTEMPT_TELEMETRY_VERSION`, `SourceAcquisitionNetworkAttemptTelemetryRecord`, and optional `attemptTelemetrySink` to `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts:31`.
- Added explicit scalar telemetry projection in `telemetryFromOutcome(...)`, including provider/endpoint ids, attempt ordinal, structural status, stop reason, duration, timeout, candidate count, compressed/decompressed byte counts, byte-count state, and fixed false leakage flags at `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts:93`.
- Added isolated observer emission after the existing 7N-3B2 transport completes, with sink exceptions suppressed so telemetry cannot change provider behavior at `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts:125` and `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-factory.ts:340`.
- Extended focused tests for success telemetry, explicit leakage bans, observer failure isolation, blocked factory state, redirect, non-candidate JSON, DNS failure, and compressed-byte-cap outcomes in `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts:206`.
- Updated the 7N-3B2 exact boundary guard export/import allowlist for the approved T1 telemetry contract in `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts:3906`.

**Decisions:**
- Kept telemetry as an optional internal observer on the existing provider-network factory. No provider result shape, endpoint authority, request envelope, transport semantics, candidate runtime, product route, API, UI, report, export, cache, Source Reliability, parser, or storage path changed.
- Built records by explicit allow-list projection only. The sink receives no query text, query id, retrieval policy key, request params, headers, raw URL, candidates, snippets, title/page keys, raw payloads, exceptions, stack/cause, cache keys, SR fields, source material, EvidenceCorpus, reports, verdicts, confidence, or public payload.
- Classified unreachable pre-transport blocks as no telemetry when the factory closes before network execution, and transport-reached byte-cap/content failures as observed byte counts with sanitized stop reasons.

**Open items:**
- X7-W2 implementation can resume from the corrected W2 source package and should use this observer for hidden internal telemetry.
- W2 still must remain one provider, hidden-only, no live jobs, no public output, no source-material/content dereference, no parser, no EvidenceCorpus, no cache/SR/storage, no prompt/config/model/schema edits, no ACS/direct URL, and no V1 work.
- Boundary guard runtime remains large and slow; W2 should avoid broadening it beyond a small named W2 section.

**Warnings:**
- 7N3B2-T1 does not authorize provider-network product wiring by itself. It only exposes sanitized telemetry from the existing hidden 7N-3B2 boundary to a future approved runtime owner.
- The first boundary-guard run failed because the exact export/import allowlist had not been updated for the approved telemetry exports/import. Debt-guard recovery kept the implementation and amended only the guard allowlist; no new capability was added.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts` -> passed; 4 files, 18 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts` -> passed; 2 files, 15 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` -> first run failed 1/75 on exact 7N-3B2 factory export allowlist; after the approved guard amendment, passed; 1 file, 75 tests.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` -> passed.

**For next agent:** Start W2 implementation only from the committed T1 state and `Docs/WIP/2026-05-17_V2_Slice_X7-W2_Product_Internal_Candidate_Provider_Network_Source_Package.md` as corrected by `f0311f47`; wire one hidden product-internal provider-network candidate path and pass `attemptTelemetrySink` from the W2 owner, but do not edit `source-acquisition-network-envelope.ts`, `source-acquisition-network-transport.ts`, public/product report surfaces, prompts/config/model/schema, cache/SR/storage, source material, parser, EvidenceCorpus, live-job, ACS/direct URL, or V1 files unless a new reviewed package explicitly authorizes it.

**Learnings:** No Role_Learnings update. The useful implementation lesson is local to W2: first-provider evidence needs observable byte counts from the provider-network boundary, but those counts should be projected as internal scalar telemetry instead of widening provider result objects or leaking diagnostics.

**DEBT-GUARD RESULT**
Classification: failed-attempt recovery for an exact boundary-guard allowlist.
Chosen option: amend the existing boundary guard allowlist in place after keeping the production telemetry projection.
Rejected path and why: rejecting or reverting telemetry would remove the W2 prerequisite that the reviewed T1 package was created to provide; broad guard refactoring would exceed T1 scope.
What was removed/simplified: nothing removed; the guard expectation was narrowed to the actual approved export/import contract.
What was added: two approved factory exports and one approved type import in the 7N-3B2 exact boundary guard.
Net mechanism count: unchanged.
Budget reconciliation: final diff stayed inside the approved T1 production/test/guard envelope and did not add branches, flags, fallbacks, retries, public surfaces, cache/SR/storage, source material, parser, EvidenceCorpus, reports, verdicts, live jobs, or V1 work.
Verification: focused runtime tests, candidate runtime/envelope tests, boundary guard, build, and whitespace checks passed.
Debt accepted and removal trigger: none for T1; boundary-guard size remains a separate W2 maintainability concern.
Residual debt: W2 must prove the telemetry is useful with first limited hidden provider-network candidate records; report-quality value is still unproven until later source/evidence/report slices.
