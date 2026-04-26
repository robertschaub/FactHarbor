---
### 2026-04-26 | Code Reviewer | Claude Opus 4.6 | Pipeline Review Since ACS Baseline (2f7a2805)
**Task:** Review all pipeline code changes since commit 2f7a2805 (~90 commits, 16,080 lines added across 99 files) for quality, safety, and coverage gaps.
**Files touched:** None (read-only review).
**Key decisions:**
- Structured review into three parallel tracks: (A) Stage 1 & prompts, (B) Stages 2–5, (C) ACS full-stack + API.
- Prioritized findings by severity to give the pipeline bug-fixing agent actionable guidance.

**Open items:**

| # | Finding | Severity | Area | Status |
|---|---------|----------|------|--------|
| 1 | No C# unit tests for `ClaimSelectionDraftService` (1,057 lines, complex state machine, invite slot contention, token auth) | **High** | ACS/API | Untested |
| 2 | Verdict citation integrity fallback: if neutral adjudication fails, falls back to original citations without re-enforcing integrity constraints | Medium | Stage 4 (`verdict-stage.ts`) | Silent fallback |
| 3 | Relevance classification cache key missing model/provider — stale cache if config changes mid-analysis | Medium | Stage 2/3 (`research-orchestrator.ts`) | Unguarded |
| 4 | MT-5(C) corrective retry lacks explicit max-retry guard | Medium | Stage 1 (`claim-extraction-stage.ts`) | Implicit bound only |
| 5 | SR budget exhaustion: remaining domains silently skipped mid-batch; Pass 2 runs full logic even if no Pass 1 domains evaluated | Medium | Stage 4 (`source-reliability.ts`) | No coverage warning |
| 6 | Draft → Job creation race: relies on DB unique constraint only, no app-level lock | Low–Med | ACS/API (`ClaimSelectionDraftService.cs`) | Mitigated by constraint |
| 7 | Selection state TOCTOU: read-validate-write window in `UpdateSelectionStateAsync` | Low–Med | ACS/API (`ClaimSelectionDraftService.cs`) | Mitigated by timestamp |
| 8 | Silent salience commitment catch — errors marked `success: false`, downstream proceeds without verification | Low | Stage 1 (`claim-extraction-stage.ts`) | No assertion |
| 9 | Cross-stage evidence profile asymmetry: Stage 3 expects `expectedEvidenceProfile` in prompt but Stage 2 only provides it during extraction, not search refinement | Low | Stage 2/3 | Null padding hides gap |
| 10 | Contract validator rule 20 density: single ~15-line paragraph, risk of LLM selective attention | Low | Prompt (`claimboundary.prompt.md`) | Readability |
| 11 | Report `compactMarkdownText()` truncates at 700 chars without sentence boundary check | Low | Output | Cosmetic risk |

**Warnings:**
- **Finding #1 is the biggest gap.** The draft service handles concurrency (serializable isolation + retries), security (SHA-256 token hashing, fixed-time comparison), and complex state transitions — all without a single unit test. Any refactor risks silent regression.
- **Finding #2 can produce weaker citation quality than pre-adjudication** if the LLM adjudication call fails. The fallback path skips re-enforcement, so a transient LLM error could degrade final report quality.
- **Prompt rule tension** between rule 18 (independent-status exception for modifier splits) and rule 20 (decomposition integrity) — auditors may disagree on "separately verifiable."
- The revert-then-rearchitect on contract repair (6536b8cf → 5ed5619b → 987dc115) was the right call — passing `contractValidationSummary` to the repair prompt is cleaner than preserving evidence state through the retry loop.

**For next agent:**
- The comparison evidence profile threading is architecturally consistent across all 7 pipeline stages — good work.
- ACS security posture is strong (token auth, invite slot management, input validation, SSRF protection).
- If writing C# tests for `ClaimSelectionDraftService.cs`, prioritize: (a) state transitions and expiry, (b) invite slot contention retry, (c) token validation, (d) failure history dedup, (e) concurrent draft-to-job creation.
- If hardening verdict stage, add re-enforcement after adjudication fallback in `adjudicateNeutralCitationDirections()`.
- If touching research orchestrator, add model/provider to relevance cache key.

**Learnings:** No — read-only review, no role-specific learnings to append.

---

### Positive observations

- **Revert discipline is good.** Two intentional reverts (6536b8cf, d7632d78) followed by better solutions — shows the team is willing to back out bad approaches rather than patching on top.
- **Test coverage for new features is strong.** ACS client/flow/recommendation all have dedicated test files. Prompt contract tests verify rule presence. Multi-event and dedup tests cover new Stage 1 logic.
- **Security is well-designed.** Fixed-time token comparison, SHA-256 hashing, parameterized queries, private address blocking, server-side claim ID validation against prepared set.
- **Observability improvements are meaningful.** Stage 1 timing instrumentation, SR budget tracking with skip counts, draft preparation milestones — these will pay off in debugging.
