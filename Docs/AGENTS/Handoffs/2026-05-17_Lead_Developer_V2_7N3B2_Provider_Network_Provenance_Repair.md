---
role: Lead Developer
date: 2026-05-17
topic: V2 7N-3B2 provider-network provenance repair
related:
  - Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md
  - Docs/AGENTS/Handoffs/2026-05-16_Lead_Architect_V2_7N3B2_Provider_Network_Boundary.md
  - apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts
---

# Lead Developer Handoff: V2 7N-3B2 Provider-Network Provenance Repair

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 7N-3B2 Provider-Network Provenance Repair

**Task:** Resolve the W2 debate blocker where 7N-3B2 documentation and runtime approval provenance disagreed.

**Finding:** `Docs/WIP/2026-05-16_V2_Slice_7N3B2_Candidate_Provider_Network_Source_Package.md` and the 7N-3B2 handoff identify `54b8af1a` as the landed provider-network implementation commit. `git show 54b8af1a` confirms it added the provider-network source and tests. The runtime approval constant in `source-acquisition-network-envelope.ts` incorrectly used `c426eefd`, which `git show c426eefd` confirms was only a handoff-index documentation update.

**Change:** Updated `SOURCE_ACQUISITION_NETWORK_PACKAGE_COMMIT` from `c426eefd` to `54b8af1a` and added a focused test asserting both the exported constant and `sourceAcquisitionNetworkApproval().packageCommit`.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-network-envelope.ts`; `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts`; this handoff; `Docs/AGENTS/Agent_Outputs.md`; generated handoff index.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts` passed: 4 files, 17 tests.

**Scope guard:** This is a provenance-only repair. It does not authorize W2 implementation, provider-network product wiring, live jobs, content dereference, parser execution, source material, EvidenceCorpus, cache/SR/storage, public output, ACS/direct URL, V1 reuse, or V1 cleanup.

**DEBT-GUARD RESULT**

**Classification:** `incomplete-existing-mechanism`.

**Chosen option:** Amend the existing approval constant in place.

**Rejected path and why:** Adding a W2 override or separate provenance alias would create a competing source of truth and weaken the exact-match authority validation.

**What was removed/simplified:** No mechanism removed; the incorrect commit pointer was corrected.

**What was added:** One focused regression assertion for the approval commit.

**Net mechanism count:** Unchanged.

**Budget reconciliation:** Actual diff stayed within the expected single-site provenance repair plus test.

**Debt accepted and removal trigger:** None.

**Residual debt:** W2 still needs an explicit provider endpoint/credential posture package before implementation.
