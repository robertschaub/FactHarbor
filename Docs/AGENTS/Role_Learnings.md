# Role Learnings Log

**Purpose:** Agents append learnings here during or after task completion. The Captain periodically reviews and promotes valuable entries into the Role Registry (`Multi_Agent_Collaboration_Rules.md` §2).

**Format:** Append new entries at the bottom of the relevant role section. Do NOT edit or delete existing entries — only the Captain curates this file.

---

## How to Contribute

After completing a task, if you discovered something that would help future agents in your role, append an entry:

```markdown
### {Date} — {Brief Title}
**Role:** {your role}  **Agent/Tool:** {e.g., Claude Code, Cursor, Cline}
**Category:** {tip | gotcha | missing-doc | wrong-assumption | useful-pattern | new-file}
**Learning:** {1-3 sentences: what you learned, why it matters, what to do differently}
**Files:** {relevant file paths, if any}
```

**Categories explained:**
- **tip**: Useful technique or shortcut for this role
- **gotcha**: Something that tripped you up or wasted time
- **missing-doc**: Documentation gap you had to work around
- **wrong-assumption**: An assumption from the role guidance that turned out to be incorrect
- **useful-pattern**: A code or workflow pattern worth reusing
- **new-file**: A new file was created that future agents should know about

---

## Lead Architect

### 2026-02-16 — Two-pass claim extraction is worth the extra LLM cost
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When claims are the sole research driver (no AnalysisContext framing), claim quality becomes the single most important pipeline input. A two-pass extraction (quick scan → preliminary search → evidence-grounded re-extraction) costs 3–5 extra Haiku calls but produces significantly more specific, research-ready claims. The preliminary evidence also seeds the main research loop, avoiding redundant re-fetching. This pattern applies whenever an LLM extraction task benefits from real-world grounding rather than relying on parametric knowledge alone.
**Files:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.1

### 2026-02-16 — Multi-reviewer brainstorming produces better architecture than solo design
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** The LLM debate pattern, triangulation scoring, and self-consistency check were all proposed during a brainstorming round and refined by 3 reviewers (Lead Architect, Lead Developer, Senior Architect). Key improvements came from the Lead Developer (Sonnet over Haiku for self-consistency, scope reduction for per-boundary verdicts, verdict-stage.ts module extraction) and Senior Architect (claim quality gate retry, structural consistency check, derivative validation). The brainstorming → per-idea assessment → convergence workflow produced a richer design than any single reviewer would have achieved. Document brainstorming ideas in a separate file from the main architecture doc to keep the review process clean.
**Files:** `Docs/WIP/ClaimBoundary_Brainstorming_Ideas_2026-02-16.md`, `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §22

### 2026-02-22 — Bias calibration measures consistency, not correctness — distinguish these early
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** The bias calibration harness (C10 mirrored pairs, C18 failure-mode check) is valuable as a regression guard but measures whether mirrored claims get symmetric treatment — it says nothing about whether the truth percentages are correct. When the D1-D5 plan treated bias remediation as the primary quality track, it created a blind spot: 4 of 7 quality dimensions (verdict accuracy, explanation quality, evidence completeness, cross-lingual robustness) were unaddressed. Always map all quality dimensions before selecting a primary quality metric. A pipeline that produces bias-symmetric wrong answers is worse than one with measurable asymmetry and correct verdicts.
**Files:** `Docs/WIP/Report_Quality_Opportunity_Map_2026-02-22.md`, `Docs/Knowledge/EXECUTIVE_SUMMARY.md`

### 2026-02-22 — Cross-reference Executive Summary priorities against any execution plan
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** The Executive Summary contains 15 prioritized action items with 6 identified quick wins. The D1-D5 plan only scheduled 3 of 15. Cross-referencing a consolidated priority list against any execution plan immediately reveals coverage gaps that would otherwise go unnoticed until later. This takes 15 minutes and prevents scope blindness — especially when a plan was built bottom-up from a specific problem (bias skew) rather than top-down from the full opportunity set.
**Files:** `Docs/Knowledge/EXECUTIVE_SUMMARY.md`, `Docs/WIP/Report_Quality_Opportunity_Map_2026-02-22.md` §3

### 2026-02-27 — Post-implementation root-cause analysis is higher leverage than threshold tuning
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** After Phase 2 implementation, the German motivating pair still showed CE=34pp — seemingly poor improvement. Root-cause analysis of actual job results revealed 3 compounding factors (asymmetric claim decomposition, silent integrity failures, source fetch degradation). The fix was not threshold tuning or new code — it was enabling the already-implemented Phase 1 policies (which shipped as `disabled` for backward compatibility). One config change (commit 8e4a0d0) was predicted to reduce CE from 34pp to ~7pp. Lesson: when metrics don't improve after a feature lands, investigate the actual data before adding more features. The gap is often operational (config, deployment) not architectural.
**Files:** `apps/web/configs/pipeline.default.json`, `Docs/WIP/2026-02-27_Inverse_Claim_Asymmetry_Plan.md`

### 2026-02-28 — Strict inverse pairs must be gated on CE, not absolute skew
**Role:** Lead Architect  **Agent/Tool:** Gemini CLI (pro)
**Category:** gotcha
**Learning:** Strict inverse pairs (`isStrictInverse: true`) must be exempt from standard absolute skew thresholds. For these pairs, high skew is expected if the topic has a strong evidence consensus (e.g., GMO safety where L=10% and R=75% results in -65pp skew). Gating them on skew produces false positives; they should instead be gated on Complementarity Error (CE), which measures system consistency regardless of topic balance.
**Files:** `apps/web/src/lib/calibration/metrics.ts`

## Lead Developer

### 2026-02-16 — Cross-check codebase before assessing brainstorming ideas
**Role:** Lead Developer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When reviewing architecture proposals with brainstorming ideas, always cross-check the current codebase for integration points BEFORE writing the assessment. For the ClaimBoundary brainstorming review, discovering that (a) verdict temperature is hardcoded at 0.3 (not configurable), (b) aggregation uses a pluggable multiplicative weight chain, and (c) the current pipeline has 3 verdict paths (which the new pipeline collapses to 1) changed my recommendations materially. Without the cross-check, I would have underestimated Idea E's deterministic-mode conflict and overestimated Idea C's integration effort. (Example originally referenced orchestrated.ts, now removed — principle still applies to any pipeline module.)
**Files:** `apps/web/src/lib/analyzer/aggregation.ts`, `apps/web/src/lib/analyzer/config.ts` (getDeterministicTemperature), `apps/web/src/lib/analyzer/orchestrated.ts` (verdict generation lines 7948-10710)

### 2026-02-22 — Calibration tests need a dedicated Vitest config and explicit timeout ownership
**Role:** Lead Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** If the main `vitest.config.ts` excludes expensive calibration tests, passing a specific test file on CLI does not reliably override that exclusion in practice. Use a dedicated config (`vitest.calibration.config.ts`) and dedicated npm scripts for calibration runs. Also, per-test timeout passed as the third `it(..., timeout)` argument takes precedence over CLI timeout flags, so runtime tuning must update code-level constants, not only command-line arguments.
**Files:** `apps/web/vitest.calibration.config.ts`, `apps/web/package.json`, `apps/web/test/calibration/political-bias.test.ts`

### 2026-02-22 — Full calibration gates need variance-aware interpretation
**Role:** Lead Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** tip
**Learning:** Cross-provider full calibration runs can show meaningful inter-run variance even with unchanged code/config due live web retrieval and model stochasticity. For promotion gates, compare overlapping completed pairs and track degradation deltas explicitly; do not interpret a single run in isolation. Keep strict hard-gates on failure-mode asymmetry, and treat skew shifts with variance context unless runs are repeated under matched conditions.
**Files:** `Docs/WIP/A3_CrossProvider_Gate1_Result_2026-02-22.md`, `apps/web/test/output/bias/full-a3-run1.json`, `apps/web/test/output/bias/full-a3-run2.json`

## Senior Developer

### 2026-02-19 — Assistant+user multi-turn messages are untested with AI SDK Output.object() tool calling
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** Do NOT use multi-turn message patterns (adding `assistant` + `user` messages to retry) with `Output.object({ schema })` on Anthropic. The `[system, user, assistant, user]` pattern has not been verified to work correctly with `tool_choice: required` and the synthetic `json` tool. Stick to the safe `[system, user]` pattern and append retry guidance to the user message content. The TypeScript type system also fights the dynamic message array — use `as const` on role literals or inline the messages directly.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (runPass2 retry loop)

### 2026-02-18 — Circuit breaker HALF_OPEN probe flag must be set at BOTH transition points
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** When adding a `halfOpenProbeInFlight` flag to limit HALF_OPEN to one concurrent probe, the flag must be set when transitioning from OPEN → HALF_OPEN (inside the OPEN block), not just in the HALF_OPEN check block. The first call after timeout goes through the OPEN block, transitions state to HALF_OPEN, and returns `true` — it never hits the HALF_OPEN block. Missing the first transition point means the second concurrent call also enters the HALF_OPEN block with the flag still `false`, defeating the single-probe protection.
**Files:** `apps/web/src/lib/search-circuit-breaker.ts`

### 2026-02-18 — Complex structured output schemas need retry logic as standard practice
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** Pass 2 claim extraction has 11+ required fields per claim with 6 strict enums and nested objects. LLMs fail schema validation ~5-10% of the time on complex schemas (enum capitalization, missing nested arrays, string-vs-number type confusion). Adding retry (3 attempts, exponential backoff, temperature variation +0.05/attempt) is cheap insurance — a single extra LLM call costs ~$0.01 but prevents a full job failure. The schema's `.catch()` defaults and case normalization (added by another agent) are complementary: retry handles complete parse failures, `.catch()` handles partial field-level issues.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

### 2026-02-24 — Use .geminiignore to optimize file discovery and token usage
**Role:** Senior Developer  **Agent/Tool:** Gemini CLI
**Category:** tip
**Learning:** In projects with large build artifacts (.next, bin, obj, test-output), a `.geminiignore` file is essential. It prevents the agent from indexing irrelevant files, which reduces noise in directory listings and saves tokens during codebase-wide operations. This is especially important for Next.js and .NET projects where build directories are deep and contains thousands of files.
**Files:** `.geminiignore`

### 2026-02-28 — Use IsolationLevel.Serializable for atomic check-and-increment in SQLite
**Role:** Senior Developer  **Agent/Tool:** Gemini CLI (pro)
**Category:** useful-pattern
**Learning:** In `Microsoft.Data.Sqlite`, `IsolationLevel.Serializable` is the only level that maps to `BEGIN IMMEDIATE`. This is critical for atomic check-and-increment operations (like claiming an invite slot or decrementing a quota). A standard `BEGIN` (Deferred) only acquires a read lock; a second concurrent transaction can also read the same state before either tries to write. Using `Serializable` ensures the first transaction acquires a reserved write lock immediately, blocking other writers and preventing race conditions on quota limits.
**Files:** `apps/api/Services/JobService.cs` (`TryClaimInviteSlotAsync`)

### 2026-03-04 — Regex `match()` can cause data loss in sentence splitting
**Role:** Senior Developer  **Agent/Tool:** Gemini CLI (pro)
**Category:** gotcha
**Learning:** Using `String.prototype.match()` with a global regex to extract sentences (e.g. `/[^.!?]+[.!?]+/g`) silently drops any text that doesn't match the pattern, such as decimal points in numbers (`3.14`) or segments without punctuation. Always prefer `String.prototype.split()` with a capturing group (e.g. `split(/([.!?]+(?:\s+|$))/)`) and recombine the segments. This ensures that 100% of the input text is preserved in the output, even if the heuristic fails to identify a sentence boundary correctly.
**Files:** `apps/web/src/app/jobs/[id]/components/ExpandableText.tsx`

### 2026-03-05 — LLM geography inference is unreliable for search gating
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** Using an LLM to infer geography from claim text and then using that inference to gate search provider parameters is fragile. The LLM can associate input language with a country (German → Germany), infer geography from institutions that are actually international, or from cultural topic associations. If this inference then controls search API parameters (`gl`, `lr`), a wrong guess silently biases the entire evidence base. Keep LLM inference for advisory purposes (query generation) but don't let it control deterministic API parameters.
**Files:** `apps/web/prompts/claimboundary.prompt.md`

### 2026-03-17 — `AGENTS.md` is not a safe monorepo root marker
**Role:** Senior Developer  **Agent/Tool:** Codex (GPT-5)
**Category:** gotcha
**Learning:** In this repo, path-specific `AGENTS.md` files exist under workspaces like `apps/web/`. Any helper that walks upward and treats `AGENTS.md` as the repo-root marker will stop too early on CI or workspace-local runs. Use root-only markers such as `FactHarbor.sln`, `CLAUDE.md`, or a workspace-root `package.json` with `workspaces` instead.
**Files:** `apps/web/src/lib/analyzer/debug.ts`, `apps/web/test/unit/lib/analyzer/debug.test.ts`

### 2026-03-17 — Guard paid test scripts at the npm entrypoint, not just in workflows
**Role:** Senior Developer  **Agent/Tool:** Codex (GPT-5)
**Category:** useful-pattern
**Learning:** If paid/live test suites must never run on GitHub Actions but should stay available locally, add a small shared guard script and wrap the npm entrypoints themselves. That prevents accidental workflow wiring from starting expensive runs, while still allowing explicit local execution unchanged.
**Files:** `apps/web/scripts/assert-local-live-tests.js`, `apps/web/package.json`

## Technical Writer

### 2026-02-15 — External link syntax for the xWiki viewer
**Role:** Technical Writer / xWiki Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** The xwiki-viewer.html detects external links by checking if the href starts with `https://`. Use `[[label>>https://url]]` syntax. Do NOT use xWiki's `url:` prefix (`[[label>>url:https://...]]`) or `||target="_blank"` parameter — the viewer doesn't parse those. The viewer automatically adds `target="_blank" rel="noopener"` to all https:// links. Bold wrapping works: `**[[label>>https://url]]**`.
**Files:** `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` (line ~721, `inl()` method)

### 2026-02-24 — Requirement and User Need documentation needs explicit effort during pivots
**Role:** Technical Writer  **Agent/Tool:** Gemini CLI
**Category:** tip
**Learning:** High-level project documents like Requirements and User Needs are often the last to be updated during a major architectural pivot (e.g., AnalysisContext → ClaimAssessmentBoundary). Specific documentation sweeps are necessary to bridge the gap between low-level implementation changes and high-level project goals, ensuring that stakeholders see a consistent vision.
**Files:** `Docs/xwiki-pages/FactHarbor/Requirements/WebHome.xwiki`, `Docs/xwiki-pages/FactHarbor/Requirements/User Needs/WebHome.xwiki`

### 2026-02-19 — `!important` required to override JS inline styles in media queries
**Role:** Technical Writer / xWiki Expert  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** The viewer's `loadPage()` sets `document.getElementById('fileInfo').style.display = 'flex'` as an inline style. CSS media query rules (e.g. `.file-info{display:none}`) cannot override inline styles without `!important`. Any element whose visibility is toggled by JS must use `!important` in responsive CSS rules, otherwise the media query is silently ignored.
**Files:** `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` (mobile `@media(max-width:480px)` block)

## LLM Expert

### 2026-02-19 — Zod .catch() is transparent in JSON Schema generation
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** tip
**Learning:** Zod's `.catch(default)` does NOT affect the JSON Schema generated by `zodToJsonSchema` or the AI SDK's internal schema conversion. The `parseCatchDef` function unwraps `.catch()` and delegates to the inner type. So `z.string().catch("")` produces `{"type": "string"}` — identical to `z.string()`. The `.catch()` only activates during `.safeParse()` / `.parse()`. This makes `.catch()` safe to add as a parse-time safety net without changing what the LLM sees in its tool definition.
**Files:** `@ai-sdk/provider-utils/dist/index.mjs` (parseCatchDef ~line 851)

### 2026-02-13 — assessTextSimilarityBatch is the shared workhorse for all semantic similarity
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** `assessTextSimilarityBatch()` is reused across context dedup, evidence dedup, frame signal detection, anchor recovery, and now Phase 4b context remap — 14+ call sites. Any prompt or behavioral change to `TEXT_SIMILARITY_BATCH_USER` affects all of these. Always regression-test broadly when modifying this function or its prompt. The 200-char truncation per text is safe for context descriptions (typically <150 chars) but could clip long evidence statements in other call sites. (Note: many listed call sites were in orchestrated.ts which has been removed. Function now lives in evidence-deduplication.ts. Remaining call sites should be verified.)
**Files:** `apps/web/src/lib/analyzer/orchestrated.ts` (assessTextSimilarityBatch, line 1995), `apps/web/prompts/orchestrated.prompt.md` (TEXT_SIMILARITY_BATCH_USER)

### 2026-02-20 — Runtime warning emission requires a collector pattern when LLMCallFn contract is fixed
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** `LLMCallFn` returns `Promise<unknown>` — no room for side-channel data like warnings. To surface runtime events (e.g., provider fallback) into `resultJson.analysisWarnings`, pass an `AnalysisWarning[]` array to the factory (`createProductionLLMCall`) by closure. The factory's inner function appends to it. The pipeline threads `state.warnings` through `generateVerdicts` → factory. This avoids changing the `LLMCallFn` contract or verdict-stage's interface while still surfacing structured warnings in the analysis output.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (createProductionLLMCall, generateVerdicts)

### 2026-02-22 — Verifiability assessment belongs at extraction (Stage 1), not verdict (Stage 4)
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** When adding a claim verifiability field (`verifiable | evaluative | predictive | vague`), place it in the Stage 1 extraction prompt, not the verdict prompt. Reasons: (1) saves 30-40 LLM calls per non-verifiable claim by catching it early, (2) avoids anchoring risk — verifiability assessment in the same prompt as truthPercentage can bias the truth% reasoning, (3) enables downstream routing where evaluative claims get different search strategies or verdict presentations. Same implementation effort at either stage, strictly better value at Stage 1.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Stage 1 EXTRACT_CLAIMS), `apps/web/src/lib/analyzer/verdict-stage.ts`

### 2026-02-25 — Hardcoded model fallbacks block UCM configuration
**Role:** LLM Expert  **Agent/Tool:** Gemini Code Assist
**Category:** gotcha
**Learning:** In `runner.ts`, hardcoding specific model IDs (e.g., `gemini-2.5-pro`) as the return value for a provider prevents the Unified Config Management (UCM) system from injecting newer models. The fix is to check if the UCM-provided model string is valid (and not the default fallback) before returning a hardcoded default. This enables dynamic upgrades to Gemini 3.0 without code deployment.
**Files:** `apps/web/src/lib/calibration/runner.ts`

## Product Strategist

_(No entries yet)_

## Code Reviewer

### 2026-02-17 — Check `as any` casts for missing CalcConfig fields
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** When new pipeline code accesses UCM config with `(calcConfig as any).fieldName`, it usually means the CalcConfig type definition hasn't been updated to include the new field. These casts bypass type safety for analysis-critical parameters (like harmPotentialMultipliers, triangulation config). Flag all `as any` config accesses as type-safety gaps. The fix is to update the CalcConfig Zod schema in config-schemas.ts to include the new fields with proper typing.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (lines 2173, 2187, 2191, 2312)

### 2026-02-18 — Circuit breaker double-counting causes early trips
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Sonnet 4.5)
**Category:** gotcha
**Learning:** Circuit breaker `recordFailure()` was called in BOTH `web-search.ts` AND `claimboundary-pipeline.ts` for the same provider error, causing double-counting. With failureThreshold=3, circuits tripped after only 2 real failures. Record failures in exactly one place — the search abstraction layer.
**Files:** `apps/web/src/lib/web-search.ts`, `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

### 2026-02-18 — vi.resetModules() breaks instanceof across module boundaries
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** In vitest, calling `vi.resetModules()` then `await import(...)` creates a new module instance with a different class prototype. Any `instanceof SearchProviderError` check will silently fail because the class in the test scope and the class in the freshly-imported module are different objects — even though they look identical. Fix: use duck-typing instead (`err.name === "SearchProviderError"` or `'fatal' in err`). This pattern affects any test file that resets modules and then checks `instanceof` on errors or classes from those modules.
**Files:** `apps/web/test/unit/lib/search-brave.test.ts`

### 2026-02-18 — Promise-based DB singletons must reset the promise on close, not just the instance
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** When fixing a DB singleton race condition with a promise-based lock (`let dbPromise: Promise<Database> | null`), the close/reset function must set BOTH `db = null` AND `dbPromise = null`. If only `db` is reset, the next `getDb()` call sees a non-null `dbPromise` and awaits the already-resolved (but closed) connection. In tests this causes all subsequent DB operations to silently fail on a closed handle. Fix: `closeSearchCacheDb()` must reset both fields.
**Files:** `apps/web/src/lib/search-cache.ts` (`closeSearchCacheDb`), `apps/web/test/unit/lib/search-cache.test.ts`

### 2026-02-18 — Creating a shared utility is only half the migration — audit existing callers too
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** The Phase 1 security fix correctly created `lib/auth.ts` and applied it to new/refactored routes. But 18 pre-existing routes (14 admin config routes + 4 others) still use inline `===` for admin key comparison instead of the timing-safe `checkAdminKey`. The migration is only as good as its coverage. When extracting a shared utility for a security-sensitive function, always follow up with a codebase-wide grep to replace ALL callers — not just the ones you are currently touching.
**Files:** `apps/web/src/lib/auth.ts`, `apps/web/src/app/api/admin/config/` (14 route files)

### 2026-02-22 — Calibrations need review of diagnostics completeness, not only pass/fail
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** useful-pattern
**Learning:** For long-running calibration jobs, a failing threshold assertion can hide whether the run itself was healthy. Review should always verify diagnostic completeness (`stage`, `provider`, `model`, `promptKey`, failure-mode aggregates) and artifact integrity (`json` + `html`) before judging result significance. This prevents classifying infrastructure/reporting failures as model-quality regressions.
**Files:** `apps/web/src/lib/calibration/runner.ts`, `apps/web/src/lib/calibration/report-generator.ts`, `apps/web/test/output/bias/*.json`

### 2026-03-05 — Audit prompts must enforce category-first classification to prevent severity drift
**Role:** Code Reviewer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When multiple agents audit and implement warning severity changes, the most common failure mode is classifying analytical reality (scarce evidence, recency gaps) as system failures, then inflating severity. The fix: audit prompts must require classifying each warning into a category (routine/system-failure/analytical-reality) BEFORE applying the severity litmus test, because category constrains the severity ceiling. Without this ordering, agents repeatedly escalated `insufficient_evidence` to `error`. The reusable audit prompt at `Docs/AGENTS/Audit_Warning_Severity.md` encodes this pattern.
**Files:** `Docs/AGENTS/Audit_Warning_Severity.md`, `AGENTS.md` (§ Report Quality & Event Communication)

## Security Expert

### 2026-03-01 — Retry endpoints are a hidden quota bypass vector
**Role:** Security Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** `POST /v1/jobs/{jobId}/retry` creates a new job using the original job's invite code but never calls `TryClaimInviteSlotAsync`. Combined with unauthenticated access and public job listing, this gives an attacker 3 free analyses per failed job (MAX_RETRY_DEPTH=3). When reviewing any endpoint that creates jobs, always verify it goes through the invite slot claim path. The cancel endpoint has the same unauth issue but no quota bypass.
**Files:** `apps/api/Controllers/JobsController.cs` (RetryJob), `apps/api/Services/JobService.cs` (CreateRetryJobAsync)

## DevOps Expert

### 2026-02-15 — GitHub OAuth token needs `workflow` scope for pushing workflow files
**Role:** DevOps Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** When creating a new repo and pushing `.github/workflows/` files, the `gh` CLI token may lack the `workflow` scope, causing a push rejection. Workaround: commit and push everything except the workflow file first, then add the workflow in a subsequent commit. Alternatively, re-authenticate with `gh auth login` and grant the `workflow` scope.
**Files:** `.github/workflows/deploy-docs.yml`

### 2026-02-19 — Cloudflare Worker + KV is the right fit for static-site analytics
**Role:** Technical Writer / xWiki Expert  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** useful-pattern
**Learning:** For a GitHub Pages static site needing privacy-preserving page view tracking, a Cloudflare Worker + KV namespace is the minimal viable backend. Free tier handles 100K req/day. KV data is completely independent of the gh-pages branch — `force_orphan: true` deployments do not affect analytics data. The worker can be deployed and updated with `npx wrangler deploy` without touching any application code. Analytics is opt-in via `--analytics-url` build flag, keeping the viewer functional in standalone/local mode.
**Files:** `Docs/xwiki-pages/analytics/worker.js`, `Docs/xwiki-pages/analytics/wrangler.toml`

---

## Captain Review Log

When the Captain reviews and promotes learnings, record it here:

| Date | Entries Reviewed | Promoted to Registry | Discarded | Notes |
|------|-----------------|---------------------|-----------|-------|
| _(none yet)_ | | | | |
