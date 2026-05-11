### 2026-05-11 | Lead Developer + LLM Expert | Codex (GPT-5) | Plastic Deploy-Readiness Review

**Task:** Continue report-improvement/deploy-readiness work after the Captain asked whether current quality is good enough to deploy, with explicit instruction not to guess, to use helpers where meaningful, and to commit source/prompt changes before live jobs so job metadata records the tested revision.

**Key decisions:**

- Confirmed local work is on `main`.
- Kept `01466a0d` (`fix(stage2): prioritize refuting contradiction queries`) as the only behavior change from this slice. It was exercised by exact plastic job `939563ecbea14a4c90249eb13c9743ef`, which ran one contradiction iteration and moved the report from high `MIXED` 52 toward false-side `LEANING-FALSE` 37.
- Reverted `3bd484a4` (`fix(prompt): require contract repair to remove rejected tails`) with `4b3fb1d4` because the only canary that exercised the repair prompt still failed in Stage 1, while the successful canary passed via retry and did not use `CLAIM_CONTRACT_REPAIR`.
- Kept `0b3238b9` / `7b6cce38` Stage 1 repair observability and result-builder typing as diagnostics/plumbing.
- Updated `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`, `Docs/AGENTS/Captain_Quality_Expectations.md`, `Docs/AGENTS/benchmark-expectations.json`, and `Docs/AGENTS/report-quality-expectations.json` to record current plastic status and the Captain-owned `LEANING-FALSE` decision point.

**Live jobs reviewed/spent in this slice:**

- `bbbbc49180d5440492461ec6d0ff2d4`: exact `plastic-en`, `UNVERIFIED` 50/0, zero evidence. Aborted in Stage 1 repair, so it did not validate Stage 2.
- `7222f56018c64d94ba9f1026d5fbd229`: exact `plastic-en` after prompt reinforcement, also `UNVERIFIED` 50/0. This contradicted the prompt-fix claim.
- `939563ecbea14a4c90249eb13c9743ef`: exact `plastic-en`, `LEANING-FALSE` 37/62, 3 AtomicClaims, 6 boundaries, 144 evidence items, 34 sources, no `report_damaged`.

**Report-quality conclusion:**

- `939563ec` is a material improvement over current high-mixed exact reports `38655e2b60d24aaf93ea16d044d1a1c4` and `8e3c9b9d58304dfe9cb4705b5c67cb41`.
- It is not a new best comparator. Best exact local comparator remains `32f00bb32d644a909f0c99521e800536` (`MOSTLY-FALSE` 21/68), which has stronger nominal calibration and more balanced evidence.
- Under current `benchmark-expectations.json`, `939563ec` passes Q-BE2/Q-BE3/Q-BE4 with tolerance but strictly misses Q-BE1 because `LEANING-FALSE` is not in expected labels for `plastic-en`.

**Warnings:**

- Do not spend another immediate plastic job until Captain decides whether `LEANING-FALSE` should be accepted for `plastic-en`.
- Do not reintroduce the reverted repair-prompt change without a local Stage 1 repair harness or a live verifier that actually exercises repair successfully.
- If Captain rejects `LEANING-FALSE`, the next investigation should be no-live-job and focused on why contradiction/refuting research still admits mostly support-direction evidence for broad absolute claims.

**Verification:**

- `npm -w apps/web run test -- test/unit/lib/analyzer/claimboundary-pipeline.test.ts` passed.
- `npm -w apps/web run build` passed.
- `Docs/AGENTS/benchmark-expectations.json` and `Docs/AGENTS/report-quality-expectations.json` parse successfully after docs update.
- `git diff --check` passed before docs commit.
- Local services restarted after commit `21e9a817`; `http://localhost:3000/api/version` reports `21e9a81740fddb77cd551dd4c4233ed21f40664e`, and API `/health` is OK.

**Learnings:**

- For broad absolute inputs such as `Plastic recycling is pointless`, false-side edge reports can be structurally reasonable even when most extracted evidence supports the existence of severe system failures; the decisive distinction is whether the absolute wording overstates those failures.
- A repair prompt change is not validated by a successful job unless the job actually exercises the repair path. Stage attribution and observability must be checked before claiming the prompt fixed anything.

**Captain follow-up:** Captain explicitly accepted `LEANING-FALSE` as acceptable for plastic reports in English and other languages, and accepted `939563ecbea14a4c90249eb13c9743ef` as a good report. The expectation docs should therefore treat `939563ec` as an accepted current-stack exact report, while retaining `32f00bb32d644a909f0c99521e800536` as the stronger historical exact comparator.

**For next agent:** Start from current `main` HEAD after the Captain acceptance docs. Do not spend another immediate plastic job. If deployment validation needs one more current-hash run, spend at most one exact `plastic-en` repeat after commit/restart. Otherwise use remaining budget on higher-value watch lanes. If future plastic reports regress to high true-side or support-tail proxy claims, inspect contradiction-query generation/admission for broad absolute claims before adding another prompt patch.
