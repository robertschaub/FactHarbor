---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-1 Review Modifications
**Task:** Address deputy review findings on the 7N-3B3-1 content-dereference source package draft.
**Files touched:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Content_Dereference_Source_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`.
**Key decisions:** Implementation remains blocked. The amended package now requires hermetic tests, concrete package ceilings, commit-first provenance, exact rollback target, refresh/reseed criteria, hidden artifact samples, static public-route reachability proof, connection pinning to prevalidated safe addresses, rejection before request emission on final-address mismatch, and non-reversible opaque policy ids or keyed HMACs for host/path/query/locator fields.
**Review and consolidation:** Pipeline/LLM-quality approved the draft. Security returned `MODIFY` for connection pinning and bare hash leakage. Test/Ops/Cost returned `MODIFY` for hermetic tests, concrete caps, provenance/rollback, and public-leak proof. All requested document changes were applied.
**Open items:** Re-review `Docs/WIP/2026-05-16_V2_Slice_7N3B3-1_Content_Dereference_Source_Package.md`. Do not implement before re-review approval.
**Warnings:** 7N-3B3-1 still excludes parser/sink implementation, redirects, product/public wiring, live jobs, cache/SR, evidence/report generation, V1 reuse/cleanup, and Captain canaries.
**For next agent:** Run security, pipeline/LLM-quality, and test/ops/cost re-review. If all approve, implementation may start only inside the exact file envelope named in the package.
**Learnings:** Bare deterministic hashes of locator material are not raw-URL-free enough; use non-reversible opaque ids or keyed/HMAC fingerprints. Content transport tests must be hermetic and must not depend on ambient DNS or internet access.

**Verification:**
- `git diff --check` -> passed.
- `git diff --cached --check` -> passed before docs commit.

**DEBT-GUARD RESULT**
Classification: docs/review hardening, no source bugfix.
Chosen option: amend the draft package in place.
Rejected path and why: no implementation because review returned `MODIFY`; no broad redesign because reviewers found concrete package wording gaps, not a flawed direction.
What was removed/simplified: bare hash allowance was removed.
What was added: hermetic test requirement, package ceilings, connection-pinning requirements, provenance/rollback/leak-proof requirements, and keyed/HMAC/opaque-id locator policy.
Net mechanism count: unchanged.
Budget reconciliation: docs-only; no runtime behavior, provider call, parser, cache, SR, product/public path, live job, or V1 behavior added.
Verification: whitespace checks passed.
Debt accepted and removal trigger: package remains implementation-blocked until re-review approves it.
Residual debt: 7N-3B3-1 needs re-review before source work.
