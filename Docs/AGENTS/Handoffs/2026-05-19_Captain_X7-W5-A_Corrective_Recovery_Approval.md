---
### 2026-05-19 | Captain | Codex Thread | X7-W5-A Corrective Recovery Approval
**Task:** Durable repo-local approval record for the corrective X7-W5-A recovery package.
**Approval anchor:** Captain message in the current Codex thread on 2026-05-19 beginning: "Captain decision: Choose B."
**Source package:** `Docs/WIP/2026-05-19_V2_Slice_X7-W5_First_Bounded_EvidenceItem_Authorization_Review_Package.md`.
**Key decision:** Captain explicitly authorized a corrective X7-W5-A recovery package limited to repairing and validating the quarantined candidate draft. This approval is not retroactive approval of the fabricated approval record.
**Required correction:** The fabricated `approvedAt` value `2026-05-19T17:10:00.000Z` must not be used as authority. The committed approval authority is this Captain decision, represented in code as `ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL`.
**Authorized scope:** Correct X7-W5-A approval metadata, fix the evidence-lifecycle task-policy TypeScript contract, update the V2 gate register only to reflect the approved hidden/internal `evidence_extraction` state, and keep implementation hidden/internal with default admin projection hash/length/provenance-only.
**Explicitly not authorized:** Live jobs or canaries, public API/UI/report/export behavior, parser execution, report/verdict/warning/confidence behavior, cache read/write, SR/storage behavior, provider expansion, ACS/direct URL, or V1 work.
**Verification required before commit:** `git diff --check`; `npm -w apps/web run build`; `npm run validate:v2-gates`; `npm run debt:sensors`; focused W5 unit tests; W5-relevant boundary guard coverage.
**Stop conditions:** Raw text leak into public/default-admin/log/error surfaces; expansion beyond hidden/internal bounded extraction; unclear verifier root cause; new mechanism count growth without W4-I/W4-chain merge or retirement plan; Steer-Co dissent.
**Warnings:** This approval does not authorize a W5-A live canary or any autonomous feature work after the corrective package. A separate Captain-approved canary package is required before runtime validation.
**For next agent:** Treat this file as the durable repo-local approval anchor for `ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL`. Do not infer broader approval from the W5 review package or this corrective recovery record.
**Learnings:** Approval records that flip prompt/model/cache gateway state need a durable repo-local pointer before commit, not only a thread-local statement.

**DEBT-GUARD RESULT**
Classification: corrective recovery for an unauthorized candidate draft and failed validation.
Chosen option: amend the existing quarantined W5-A draft inside the Captain-approved corrective scope, then verify cleanly.
Rejected path and why: restoring to review-only boundary was rejected by Captain choice B; broad new feature work, live validation, and canary execution remain outside this approval.
What was removed/simplified: the fabricated approval timestamp is removed as authority and replaced by this durable approval anchor.
What was added: repo-local approval record plus gate-register/code references to the corrected approval authority.
Net mechanism count: no additional runtime mechanism beyond the quarantined W5-A candidate; retirement pressure is recorded against the W4-I/W4-chain.
Debt accepted and removal trigger: W4-I remains as same-ledger closure evidence until the first accepted W5 canary or Steer-Co rollback decision, after which standalone W4-I denial machinery must be merged, deleted, or quarantined.
Residual debt: W5-A is committed only as hidden/internal corrective implementation. Canary, public behavior, extraction validation beyond the approved hidden path, and downstream report-quality work require separate packages.
