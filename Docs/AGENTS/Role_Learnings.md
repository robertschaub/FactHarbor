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

### 2026-04-11 — Don't pre-solve later gates inside the current gate
**Role:** Lead Architect  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** useful-pattern
**Learning:** Rev 2 of the Phase 2 Gate G2 replay plan carried Phase 3/4 judgments ("keep Option G", "refactor `isVerdictDirectionPlausible`", "queue for Phase 4") inside the G2 package body. Both the LLM Expert and Captain Deputy reviewers independently flagged this as scope drift — decisions being made outside the gate they belong to. The fix was a dedicated "Strong priors (NOT decisions)" section at the end of the plan that (a) explicitly labels each hypothesis as a prior, (b) gives each prior a "replay may show" falsification condition, (c) states "none of these priors are being acted on until Phase 3 data is in". This preserves the value of the investigator's intuition without letting it bleed into premature decisions. Reuse this pattern whenever a plan document drifts into pre-solving later work. Also surfaced by the same review: per-input acceptance criteria (e.g. "R2 must have `rechtskräftig` in primary claim + verdict in 11–31 range") are more useful than generic Stage-1 signals (e.g. "Q-S1.3 modifier preservation") when the replay set is narrow, because they give concrete measurable pass/fail per input without forcing the Phase 3 analyst to re-derive the mapping.
**Files:** `Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md`, `Docs/WIP/2026-04-11_Phase2_Per_Input_Expectations.md`, `Docs/WIP/2026-04-11_Phase2_Gate_G2_LLM_Expert_Review.md`, `Docs/WIP/2026-04-11_Phase2_Gate_G2_Captain_Deputy_Review.md`

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

### 2026-04-17 — Terminal SSE gating needs a separate history path
**Role:** Lead Developer  **Agent/Tool:** GitHub Copilot (GPT-5.4)
**Category:** gotcha
**Learning:** On `/jobs/[id]`, suppressing SSE for terminal jobs is only safe if the page has another way to hydrate historical events. In this repo the timeline was populated only by SSE replay, so terminal gating required a separate `events/history` API route plus a client-side history fetch.
**Files:** `apps/web/src/app/jobs/[id]/page.tsx`, `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts`

### 2026-04-17 — Clean retry outputs need the same anchor-carrier protection as repairs
**Role:** Lead Developer  **Agent/Tool:** GitHub Copilot (GPT-5.4)
**Category:** gotcha
**Learning:** A Stage 1 retry that revalidates cleanly is still vulnerable if downstream structural-protection hooks only recognize `stageAttribution === "repair"`. Low-centrality anchor carriers introduced on retry must survive centrality capping and Gate 1 the same way repaired carriers do, or the original contract-loss failure can recur.
**Files:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`

### 2026-04-17 — Clean restart must clear bound API executables, not only dev shells
**Role:** Lead Developer  **Agent/Tool:** GitHub Copilot (GPT-5.4)
**Category:** gotcha
**Learning:** On Windows, `restart-clean.ps1` cannot assume killing `dotnet watch run` PowerShell shells is enough. A stale `FactHarbor.Api.exe` can stay bound to port 5000 and keep serving old controller code, which makes route-level browser validation lie. Clean restart logic needs explicit listener-port cleanup for the API port as well as the web port.
**Files:** `scripts/restart-clean.ps1`

### 2026-04-17 — New job read endpoints must inherit hidden-report semantics end-to-end
**Role:** Lead Developer  **Agent/Tool:** GitHub Copilot (GPT-5.4)
**Category:** gotcha
**Learning:** When adding a new read path for jobs or job events, validate `jobId` on the API side and reuse the same hidden/admin access model as the existing report detail flow. If a Next.js proxy sits in front of that route, it also needs to forward `X-Admin-Key` on admin requests; otherwise hidden-report admin views silently lose data while public callers gain a looser path than intended.
**Files:** `apps/api/Controllers/JobsController.cs`, `apps/web/src/app/api/fh/jobs/[id]/events/route.ts`, `apps/web/src/app/api/fh/jobs/[id]/events/history/route.ts`

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

### 2026-03-19 — ClaimBoundary config provenance is currently missing for real jobs
**Role:** Senior Developer  **Agent/Tool:** Codex (GPT-5)
**Category:** gotcha
**Learning:** Do not assume `apps/web/config.db` can tell you which pipeline/search/calc config a current ClaimBoundary job used. In the live runner path, `runClaimBoundaryAnalysis()` loads config with `loadPipelineConfig("default")` / `loadSearchConfig("default")` / `loadCalcConfig("default")` and never passes `jobId`, so `config_usage` is not recorded for those jobs. `job_config_snapshots` can also look populated while being stale and unrelated to the current API DB. For March 2026 quality investigations, you have to combine active-config history, git history, and result content instead of relying on those audit tables.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/src/lib/config-loader.ts`, `apps/web/config.db`

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

### 2026-04-10 — Competing prompt rules are a structural failure, not a wording failure
**Role:** LLM Expert  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** gotcha
**Learning:** When a model is told (a) "preserve modifier X" and (b) "do not extract claims about Y" and X happens to be a Y, the model resolves the conflict in the only way the prompt allows — by externalizing the contradiction into a side-claim. No amount of additional "be careful" instructions fix this. The fix is precedence or reconciliation. Concrete case: `CLAIM_EXTRACTION_PASS2` had a "preserve truth-condition modifiers" rule (line 162-166) and a "no inferred normative claims" rule (line 190); for `rechtskräftig` (a German legal-finality adverb that is *both*), the model produced a separate AC_03 carrying the modifier, which Gate 1 then stripped. Look for this pattern any time you investigate a "the model knows X but does Y" failure — read adjacent rules for structural conflict before adding more instructions.
**Files:** `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS2 lines 162-166 vs 190)

### 2026-04-10 — Deterministic substring re-checking of LLM structured output is an anti-pattern
**Role:** LLM Expert  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** gotcha
**Learning:** If the LLM returns a structured `preservedInClaimIds`/`preservedByQuotes` and your TypeScript then re-checks it with `claimText.toLowerCase().includes(anchor.toLowerCase())`, you have replaced LLM intelligence with a worse heuristic. Substring matching breaks on inflected morphology (German `rechtskräftig`/`rechtskräftige`/`rechtskräftiger`), transliterations, plurals, and any non-English language. Either trust the LLM and add a structural validity check (cited IDs must exist in the claim list), or re-run the LLM contract validator on the final accepted claims. Do not substring-match across LLM judgments — the AGENTS.md LLM Intelligence mandate explicitly prohibits this.
**Files:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (`evaluateClaimContractValidation`, lines 1841-1866)

### 2026-04-10 — Stage 1 cascading: prompt → Pass 2 shape → Gate 1 strip → contract failure → silent ship
**Role:** LLM Expert  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** useful-pattern
**Learning:** When a quality investigation lands on "the contract validator detects the failure but the pipeline continues," check whether the contract validator's outputs reach downstream stages (here: Gate 1 has zero visibility into `truthConditionAnchor`), and check whether the post-Gate-1 re-validation has a branch for `preservesContract === false` (here: it refreshes the summary into a variable and then `return`s). The data is often sitting in a result envelope that no one reads. The diagnostic is: grep for the field name in stages downstream of where it is set; if you find no consumers, the enforcement is observational.
**Files:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts` (lines 645-690)

### 2026-04-10 — Spotting deterministic semantic rescue functions on first read
**Role:** LLM Expert  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** tip
**Learning:** Functions named `is*Plausible`, `*Rescue`, `*Override`, or `safeDowngrade*` that sit next to an LLM validation step deserve immediate scrutiny. Test: is the function deciding "is this verdict directionally correct?" or "did the model preserve meaning X?" using arithmetic on weighted ratios, hemisphere checks, or string matching? If yes, it is the deterministic semantic adjudication the LLM Intelligence mandate prohibits — even if it looks like a "robustness layer." Concrete cases in the analyzer: `isVerdictDirectionPlausible` (verdict-stage.ts:1561) uses hemisphere/tolerance/ratio rules to override LLM direction validation; `evaluateClaimContractValidation` (claim-extraction-stage.ts:1832) uses substring matching to override LLM anchor preservation. Both should be replaced with LLM re-validation, keeping only structural plumbing (citation polarity bucket consistency, ID validity).
**Files:** `apps/web/src/lib/analyzer/verdict-stage.ts:1561`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts:1832`

### 2026-04-13 — Trimming root AI-instruction files without losing rules
**Role:** LLM Expert  **Agent/Tool:** Claude Opus 4.6 (1M)
**Category:** tip
**Learning:** Three lessons from trimming a 458-line `AGENTS.md` and 62-line `CLAUDE.md` down to 297 and 34 lines respectively, while externalizing ~170 lines to `Docs/AGENTS/Policies/`:

1. **Grep the destination file before declaring any section "duplicate and safe to delete."** An initial Plan-agent assessment said `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md` duplicated the Agent Exchange Protocol in `AGENTS.md` and recommended outright deletion. Grep of MACR.md during Phase 3 review found the opposite — MACR.md explicitly points *to* `AGENTS.md` as the source of truth ("see AGENTS.md § Agent Exchange Protocol"). Had the original "delete as duplicate" recommendation been followed, the protocol content would have been lost and MACR.md's pointers would dangle. **Rule of thumb: when one file says "see X for full details," X is the source, not the duplicate.**

2. **Use a three-layer stub pattern when externalizing from multi-tool instruction files.** Claude Code supports `@path/to/file.md` auto-imports, but Cursor, Codex, Copilot, and Gemini do not reliably follow them. For every externalized section, leave in the root file: (a) the section heading (so the section still exists in search), (b) a one-line human-readable summary, (c) an explicit `Docs/AGENTS/Policies/Xxx.md` path pointer. This makes the externalized content reachable even for tools that ignore `@`-imports.

3. **Capture a keyword-based rule-inventory baseline before editing and verify count is ≥ baseline after.** Grep for `MANDATORY|MUST|NEVER|always` across the root files pre-trim, save the count, and re-run post-trim across all affected files (including new Policies files). If the total drops, a rule was silently lost. In this refactor: 23 baseline → 24 post-refactor. Fast, cheap, catches regressions that line-diff review would miss in 450+-line files.

**Files:** `AGENTS.md`, `CLAUDE.md`, `Docs/AGENTS/Policies/Handoff_Protocol.md`, `Docs/AGENTS/Policies/Tool_Strengths.md`, `Docs/AGENTS/Policies/xWiki_Reading.md`, `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`

### 2026-04-15 — Prompt caching ROI depends more on prompt shape than on cache flags
**Role:** LLM Expert  **Agent/Tool:** GitHub Copilot (GPT-5.4)
**Category:** useful-pattern
**Learning:** In the current ClaimBoundary runtime, Anthropic prompt caching is already wired correctly through `getPromptCachingOptions()` in the main stage calls, so a proposal to "add cache breakpoints" can be directionally right but operationally redundant. The real limiter on cache payoff is prompt shape: many system prompts inline dynamic job payload (`analysisInput`, claims, evidence, verdict inputs), which collapses cache reuse across calls even though cache metadata is present. Before proposing more cache flags, first ask whether the static instructions and dynamic payload are separated cleanly enough for prompt reuse to matter.
**Files:** `apps/web/src/lib/analyzer/llm.ts`, `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/research-extraction-stage.ts`, `apps/web/src/lib/analyzer/verdict-generation-stage.ts`, `apps/web/prompts/claimboundary.prompt.md`

### 2026-04-16 — Structural rubric before subjective evaluation in multi-agent debate skills
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.7, 1M)
**Category:** useful-pattern
**Learning:** When a skill spawns LLM sub-agents to evaluate other LLM-generated output (e.g., `/report-review` Phase 4 panels assessing verdicts, reasoning traces, warnings), every panel's brief MUST lead with structural checks (count-based, schema-based, citation-graph checks) that cite observed values before any subjective evaluation. Structural checks are cheap, deterministic, and self-anchoring — they pin the panel to evidence before vibes can take over. This is the operational form of the existing "LLM self-eval bias" learning: the mitigation isn't "don't use LLMs to eval LLMs", it's "force them to count first". Example structural checks that work well: "does `verdictReason` reference any evidence ID NOT in `supportingEvidenceIds ∪ contradictingEvidenceIds`?" for reasoning review; "is each warning `type` registered in `warning-display.ts`?" for severity review. Key design move: put structural checks in a dedicated column of the panel map table, not buried in panel prose — this makes them impossible to skip. Pair with a strict return-format spec (`[STRUCTURAL] [FINDING] [FIX] [NEW]` line prefixes) so the main thread can parse panel output by regex and flag panels that skipped the structural step.
**Files:** `.claude/skills/report-review/SKILL.md` (Phase 4 panel map and sub-agent brief template)

### 2026-04-16 — Cross-model review catches self-referential rule violations that same-model debate misses
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.7, 1M) + GitHub Copilot (GPT-5.4)
**Category:** useful-pattern
**Learning:** A skill that contains self-referential constraints (rules that bind the skill's own behavior — e.g., `/report-review` constraint 9 requires index-first for handoff scans) can silently contradict those rules in downstream phases without any same-model reviewer catching it. A 5-panel same-model debate (Lead Architect, LLM Expert, Code Reviewer, Senior Developer, Devil's Advocate) on `/report-review` passed without flagging that Phase 2b instructed direct grep of `Docs/AGENTS/Handoffs/` in violation of its own rule 9 — every panel read the constraint list at the top of the skill but none of them cross-checked it against every downstream Phase. An independent GPT-5.4 adversarial review caught it on first pass. The likely mechanism is that same-model reviewers share attention priors: they all gravitate to the same "interesting" content and all look away from the same "boilerplate", so a rule-vs-usage mismatch inside the boilerplate slips through. Operational rule: any skill with constraints that bind its own phases should get at least one cross-model adversarial review pass before shipping. Specifically brief that review to check every rule against every Phase.
**Files:** `.claude/skills/report-review/SKILL.md` (Phase 2b index-first fix); `Docs/AGENTS/Handoffs/2026-04-16_Lead_Developer_LLM_Expert_Report_Review_Skill_Improvements.md` (third amendment — GPT-5.4 review record)

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

### 2026-03-18 — Contrastive prompting prevents LLM over-generalization in classification tasks
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When a classification prompt defines categories that share surface features (e.g., "foreign media reporting domestic events" vs. "foreign government reactions"), lightweight models (Haiku) over-generalize without concrete contrastive examples. Adding paired examples showing the boundary ("BBC reporting Brazilian sentencing → contextual" vs. "Reuters reporting US sanctions → foreign_reaction") plus the rule "classify by evidence substance, not publisher nationality" eliminated misclassification. The APPLICABILITY_ASSESSMENT prompt had this pattern; RELEVANCE_CLASSIFICATION didn't — fixing the asymmetry resolved the issue. Always check that classification prompts at different pipeline stages use consistent guidance quality.
**Files:** `apps/web/prompts/claimboundary.prompt.md` (RELEVANCE_CLASSIFICATION, APPLICABILITY_ASSESSMENT)

### 2026-03-22 — Supplementary language is not a reliable proxy for evidential direction
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** wrong-assumption
**Learning:** Phase 2 v2 assumed that running contrarian queries in a supplementary language (e.g., EN for DE inputs) would reliably yield evidence in the direction OPPOSITE to the current pool majority. In practice it did not: the one run where the supplementary pass fired (DE exact, ratio=0.58) swung the verdict from MOSTLY-FALSE (21%/77%) to MOSTLY-TRUE (74%/24%) — the wrong direction. The EN search space for this topic returns failure-mode evidence regardless of contrarian query framing, because the failure narrative dominates EN-language sources. Language selection and evidential direction must be controlled independently. Never assume that a cross-linguistic pass will systematically add opposing-direction evidence.
**Files:** `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md`

### 2026-03-22 — Pool-balance gate at 0.55 blocks almost all supplementary passes
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** gotcha
**Learning:** After the main + contradiction loops run, evidence pool majority ratios typically converge to ≤ 0.55 (observed: 0.48–0.55 across 5 of 6 validation runs). A gate of `ratio > 0.55` therefore blocks the supplementary pass on almost every run. The FR exact and Hydrogen runs both landed at exactly 0.55 and were blocked by strict `>`. If a supplementary mechanism depends on pool skew detection, the threshold must be calibrated against the actual post-loop distribution, not set by intuition. Validate firing rate against a real run set before committing to a threshold value.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Step 3.5)

### 2026-03-22 — Verify mechanism fires before evaluating quality
**Role:** Senior Developer  **Agent/Tool:** Claude Code (Sonnet 4.6)
**Category:** useful-pattern
**Learning:** When validating an experimental mechanism, always verify whether the mechanism actually fired before interpreting results as evidence for or against it. In the Phase 2 v2 batch, 3 of 4 "passing" gate criteria were achieved without the supplementary pass firing at all — meaning those passes are run variance, not evidence that v2 works. Build firing-detection into the result analysis step: check the evidence pool majority ratio against the threshold for each run, and flag any "improvement" that occurred with the pass blocked. Results from non-firing runs are baseline measurements, not v2 evidence.
**Files:** `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md`

### 2026-03-18 — LLM output ordering is not a ranking signal
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** When an LLM returns a list of classified items with scores, the emission order is not guaranteed to match the scores. Using `.slice(0, N)` on unsorted LLM output silently drops high-scored items that happen to appear later in the response. Always sort by the LLM-assigned score (with a stable tie-break like original input rank) before truncating. This is a structural bug class — any pipeline that takes "top N from LLM list" without sorting is vulnerable.
**Files:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (classifyRelevance call site)

### 2026-04-09 — Evidence-mix drift outweighs clustering variance as regression root cause
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** wrong-assumption
**Learning:** When investigating a verdict regression, do not stop at Stage 3 boundary concentration as the root cause. In the Bolsonaro family, the initial 9-agent investigation concluded "Stage 3 is ~95% of the effect" based on the 84% mega-boundary. A Senior Architect review showed this was overclaimed: (1) a same-commit rerun at 74% concentration still scored 52%, disproving concentration as the sole cause; (2) Lula/Lava Jato material volume varied 4→26 items across runs, with the regression job having 56% historical material in AC_03 (vs 3% baseline); (3) source fetch degradation (75-100% failure) correlates with historical backfill. The correct model is three-layer: retrieval drift (primary) → evidence admission (secondary) → clustering amplification. Always trace evidence content upstream before attributing to structural pipeline stages.
**Files:** `Docs/AGENTS/Handoffs/2026-04-09_LLM_Expert_Bolsonaro_Evidence_Mix_Regression_Investigation.md`

### 2026-04-09 — Multi-agent debate requires fact-checking agent arguments against hard data
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** In a multi-agent debate (9 agents), several agents made compelling-sounding arguments that did not survive numerical verification. Challenger A argued the complete-assessment guard was a "one-way valve" causing the regression — but the actual impact was <1pp. The Defender conceded the stochasticity defense on the "52% attractor" claim — but that claim was based on misunderstanding weighted averages (the narrative LLM was adjusting DOWNWARD, not being blocked from adjusting upward). Always verify agent arguments against the actual job data before accepting their conclusions. Compute the actual numbers yourself rather than trusting agent reasoning about what "must" happen.
