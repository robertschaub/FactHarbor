---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B1 Candidate Runtime Hardening
**Task:** Address post-implementation code-safety review findings for the hidden/internal 7N-3B1 candidate-acquisition runtime shell.
**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.ts`; `apps/web/src/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.ts`; `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts`; `apps/web/test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`.
**Key decisions:** Fixed all code-review blockers in the existing shell instead of adding a second path. `3d05583e` binds 7N-3B1 authority hashes to the parent 7N-3A snapshot, rejects URL/secret-like provider attempt IDs by requiring opaque `ATT_<digits>` IDs, forbids candidates on non-success provider outcomes, and races injected provider calls against the configured timeout.
**Open items:** Post-7N-3B1 consolidation remains next. Concrete source/provider IO, parser/network execution, hidden source packet handling, public/product wiring, live jobs, cache IO, and Source Reliability remain blocked by a later reviewed package.
**Warnings:** Provider timeout enforcement is intentionally local to the injected boundary shell; it does not imply approval for real network IO. The hidden runtime still does not construct HTTP callbacks, SDK clients, cache keys, source records, evidence items, warnings, verdicts, or report fields.
**For next agent:** Treat `878ba6ba` + `3d05583e` as the current 7N-3B1 implementation baseline. If drafting 7N-3B2/7N-3C, start from the reviewed package and these hardening constraints, not from a direct provider wiring assumption.
**Learnings:** No Role_Learnings.md update.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts` -> 2 files / 15 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` -> 11 files / 72 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` -> 45 files / 335 tests passed.
- `npm -w apps/web run build` -> passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` and `git diff --cached --check` -> passed.

**DEBT-GUARD RESULT**
Classification: review-finding bugfix / incomplete-existing-mechanism.
Chosen option: amend.
Rejected path and why: no revert because the 7N-3B1 shell remained correct in direction and verifier-green; no additive workaround because the existing authority, validator, and provider-boundary mechanisms could carry the missing checks.
What was removed/simplified: none.
What was added: parent-hash equality checks, opaque provider-attempt-id validation, non-success candidate rejection, and provider-call timeout racing inside the existing shell.
Net mechanism count: unchanged; timeout enforcement completes an already specified timeout mechanism.
Budget reconciliation: touched only the two runtime source files and their focused tests; no provider SDK/direct fetch/network/cache/SR/product/public/live-job wiring was added.
Verification: focused tests, runtime suite, analyzer-v2 suite, build, and whitespace checks passed.
Debt accepted and removal trigger: hidden/injected-boundary-only runtime remains planned temporary debt until a later reviewed concrete source-IO package.
Residual debt: next package must still define real provider/network semantics before any live smoke.
