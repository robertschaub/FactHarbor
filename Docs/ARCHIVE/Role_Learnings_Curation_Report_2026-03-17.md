# Role Learnings Curation Report

**Date:** 2026-03-17
**Role:** Agents Supervisor
**Agent/Tool:** Claude Code (Opus 4.6)
**Phase:** 6 of Agent Rules Cleanup Plan
**Status:** EXECUTED AND ARCHIVED
**Execution Commit:** `dc9729e5`

> Archive note: This file preserves the original 2026-03-17 audit and recommendation set.
> The cleanup was later executed with a small delta: 20 tips were promoted across
> 7 role files, 8 entries were archived/removed, and 3 organizational fixes were
> applied. One additional governance tip was promoted into `Agents_Supervisor.md`
> beyond the original 19-promotion recommendation.

---

## Summary

Reviewed all 46 entries across 8 role sections in `Docs/AGENTS/Role_Learnings.md`.
Cross-referenced against current codebase state, AGENTS.md rules, and role definition files.

| Action | Count | Details |
|--------|-------|---------|
| **Promote** to role files | 19 recommended / 20 executed | The audit recommended 19 promotions; execution added 1 more governance tip in `Agents_Supervisor.md` |
| **Archive/Remove** | 8 | Stale references, superseded, redundant, or too generic |
| **Keep as-is** | 19 | Still relevant but situational |
| **Organizational fix** | 3 | Misplaced under wrong role section |

No role definition file currently has a "Tips" or "Learned Patterns" section.
All promotions would create new sections.

---

## Codebase State (basis for assessments)

| Referenced Item | Current State |
|-----------------|---------------|
| `orchestrated.ts` | **REMOVED** — orchestrated pipeline removed pre-release |
| `DEBATE_PROFILES` in `config-schemas.ts` | **REMOVED** — debate profiles replaced by direct `debateModelTiers` config |
| `assessTextSimilarityBatch` | **MOVED** — now in `evidence-deduplication.ts` (was in orchestrated.ts) |
| `ClaimBoundary_Pipeline_Architecture_2026-02-15.md` | **ARCHIVED** to `Docs/ARCHIVE/` |
| `auth.ts`, `warning-display.ts`, `truth-scale.ts`, etc. | All still exist and active |
| Calibration system (`apps/web/src/lib/calibration/`) | Still exists (7 files) |
| `.geminiignore` | Still exists at repo root |

---

## Entries to PROMOTE (19)

Promotions add a new **## Tips from Role Learnings** section at the bottom of the role file (before Anti-patterns if present). Each promoted entry becomes a concise bullet.

### → Lead_Architect.md (3 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| LA-4 | 2026-02-16 | Categorical vs continuous field design rule | Universal type-design principle: "Categorical for LLM classification, continuous for LLM assessment." Resolves field granularity decisions upfront. |
| LA-7 | 2026-02-27 | AGENTS.md abstract-form rule scoped to analysis prompts, not calibration data | Common misunderstanding — multiple agents could hit this. Calibration fixtures need concrete, researchable topics. Abstract placeholders produce UNVERIFIED on both sides. |
| LA-2 | 2026-02-16 | Make EvidenceScope mandatory at prompt level, not schema level | Universal LLM structured output pattern: schema `required` is necessary but not sufficient — the LLM also needs source-type-specific examples. *Also relevant to LLM Expert.* |

**Proposed text for Lead_Architect.md:**
```markdown
## Tips from Role Learnings

- **Categorical vs continuous fields.** Use categorical values (high/medium/low) for LLM classification outputs and continuous values (0-100) for LLM assessment outputs. LLMs produce categorical outputs more reliably. Apply this rule upfront before debating individual field granularity.
- **Abstract-form rule scope.** AGENTS.md "no test-case terms in prompts" applies to analysis prompts (`apps/web/prompts/`), NOT calibration fixture data (`test/fixtures/`). Calibration needs concrete, researchable topics — abstract placeholders produce meaningless metrics.
- **Schema required ≠ LLM will populate.** Making fields required in Zod schema is necessary but not sufficient. The LLM prompt must include source-type-specific examples showing what meaningful values look like (e.g., news article methodology = "journalistic reporting"). Combine prompt examples + Zod validation + retry.
```

### → LLM_Expert.md (4 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| LLM-1 | 2026-02-19 | Anthropic tool calling soft refusal mechanism | Critical SDK behavior — model soft-refuses via empty tool args, SDK silently discards text blocks. Must know when working with Anthropic structured output. |
| LLM-3 | 2026-02-19 | Two-level Zod validation in AI SDK Output.object() | Companion to soft refusal — SDK validates before your code runs. Without `.catch()`, normalization code is dead for the failure case. |
| LLM-9 | 2026-02-22 | Opus challenger without Opus reconciler creates asymmetric debate | Fundamental multi-model debate design principle — never upgrade only the adversary. |
| LLM-11 | 2026-02-22 | LLM self-evaluation unreliable for generation-correlated dimensions | Universal principle — LLMs rate same-family output higher. Use structural checks + rubric-based eval instead. |

**Proposed text for LLM_Expert.md:**
```markdown
## Tips from Role Learnings

- **Anthropic soft refusal.** With `structuredOutputMode: "jsonTool"`, Anthropic models soft-refuse sensitive content by calling the tool with null/empty args — no hard error. The SDK silently discards all text blocks, making refusal invisible. Quality gates must detect empty fields. Fact-checking framing must be in the SYSTEM prompt, not just USER.
- **Two-level SDK validation.** `Output.object({ schema })` runs `schema.safeParse()` BEFORE your code. Add `.catch()` defaults to prevent `NoObjectGeneratedError` — this lets your normalization/validation logic actually execute on failures.
- **Debate model symmetry.** Never upgrade only the challenger model tier. The reconciler is the decision-maker — if it can't evaluate the challenger's arguments, sophisticated-sounding but wrong challenges slip through. Upgrade reconciler first, or both.
- **LLM self-eval bias.** LLMs rate same-family output higher on correlated dimensions (clarity, completeness, coherence). Prefer structural checks (citation count, counter-evidence addressed) + rubric-based eval with explicit scoring dimensions. Treat scores as diagnostic until validated against human evaluation.
```

### → Senior_Developer.md (4 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| SD-4 | 2026-02-18 | EnsureCreated() doesn't update schema — delete DB | Common .NET/SQLite gotcha every API developer will hit when adding columns. |
| SD-13 | 2026-03-12 | Always copy the exact generateText call pattern | Critical — the 5-part pattern is non-obvious and mismatches cause silent runtime failures caught by fail-open catch blocks. |
| SD-10 | 2026-03-05 | Search provider geo params cause evidence bias | Major design decision — search must stay unfiltered. Language/geography go to LLM query generation only. |
| SD-2 | 2026-02-18 | Config threading eliminates global mutation race conditions | Universal concurrency pattern — pass config as parameter instead of global state. |

**Proposed text for Senior_Developer.md:**
```markdown
## Tips from Role Learnings

- **EnsureCreated() won't add columns.** The API uses `EnsureCreated()` for SQLite, which creates DB if missing but does NOT alter existing tables. After adding new entity columns: stop API → back up `factharbor.db` → delete it → restart. Schema rebuilds from scratch.
- **Copy the generateText pattern exactly.** The pipeline's `generateText` call has 5 interrelated parts: (1) system message with `providerOptions: getPromptCachingOptions()`, (2) user message, (3) `output: Output.object({ schema })`, (4) top-level `providerOptions: getStructuredOutputProviderOptions()`, (5) `extractStructuredOutput(result)` with single arg. Getting any one wrong causes silent runtime failure — no build error, no test failure. Always copy-paste from a working call.
- **No geo params to search providers.** Never send `lr`/`hl`/`gl` to search APIs automatically — they cause language-based evidence bias. Pass `detectedLanguage` and `inferredGeography` to the query generation LLM prompt only.
- **Thread config, don't mutate globals.** For modules with concurrent access (search, caching, circuit breaker), add optional config parameters to functions rather than using module-level state. Safer than locks, backward-compatible, makes config flow explicit.
```

### → Code_Reviewer.md (6 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| CR-1 | 2026-02-16 | Cross-check UCM prompt keys against prompt file sections | Standard review checklist item — verify every prompt key in code has a matching section definition. |
| CR-2 | 2026-02-16 | Verify default values match the spec at every layer | Layered config systems can have divergent defaults — trace the actual call chain. |
| CR-3 | 2026-02-17 | Vitest esbuild strips types — ghost imports | After type renames, stale imports in test files go undetected. Grep test files for old names. |
| CR-7 | 2026-02-18 | Module-scoped state resets on HMR | Next.js dev gotcha — use `globalThis` for state that must survive hot reloads. |
| CR-14 | 2026-03-05 | Display severity floor is a safety net | The `warning-display.ts` severity floor must survive refactors — verify after any warning system changes. |
| CR-15 | 2026-03-05 | Bucket assignment: user-facing meaning, not root cause | Warning bucket assignment rule: "what does the user see?" not "what caused it internally?" |

**Proposed text for Code_Reviewer.md:**
```markdown
## Tips from Role Learnings

- **Verify prompt key → section mapping.** Every UCM prompt key in code (e.g., `llmCall("VERDICT_ADVOCATE", ...)`) must have a corresponding section in the prompt file. Cross-check against `requiredSections` frontmatter.
- **Trace config defaults through call chain.** Configurable parameters can have different defaults at different layers (schema, stage config, utility function). Confirm which default actually takes effect at runtime.
- **Ghost type imports after renames.** Vitest esbuild strips types without checking. `npm run build` only covers `src/`. After a type rename, grep test files for the old name — stale imports compile fine but are wrong.
- **Use globalThis for HMR-surviving state.** Module-scoped `Map`/`Set` instances reset on Next.js hot module reload. Use `globalThis` pattern for any in-memory state that must persist across HMR. Reference: `getRunnerQueueState()` in `internal-runner-queue.ts`.
- **Severity floor must survive refactors.** The `warning-display.ts` display severity floor (promoting `info` → `warning` for degrading types) is a safety net. Verify it exists after any warning system refactor.
- **Bucket = user-facing meaning.** Warning bucket assignment: ask "what does the user see?" not "what caused it internally?" E.g., `budget_exceeded` is an analysis quality issue, not a provider issue.
```

### → Security_Expert.md (2 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| SE-2 | 2026-03-01 | Content-Length insufficient for SSRF size caps | Universal HTTP security pattern — chunked responses bypass Content-Length checks. |
| SE-3 | 2026-03-01 | Cross-check Next.js and .NET auth independently | Multi-stack security audit principle — tech stacks drift on security patterns. |

**Proposed text for Security_Expert.md:**
```markdown
## Tips from Role Learnings

- **Content-Length is unreliable for size caps.** Chunked transfer-encoded responses have no Content-Length. `response.text()` buffers the entire body regardless. Use a streaming byte counter that aborts at the limit for robust SSRF size enforcement.
- **Audit each tech stack independently.** Different tech stacks in the same project drift on security patterns (e.g., Next.js using timing-safe comparison while .NET uses `==`). Never assume one layer's security posture applies to the other.
```

### → DevOps_Expert.md (2 entries)

| Entry | Date | Title | Why Promote |
|-------|------|-------|-------------|
| DO-1 | 2026-02-15 | Viewer is shared between FactHarbor and BestWorkplace | Critical cross-repo dependency — any viewer edit must be synced to both repos. |
| DO-2 | 2026-02-15 | build_ghpages.py uses exact string patches | Fragile patch mechanism — any viewer edit in a patched region must be verified against all `str.replace()` calls in both repos. |

**Proposed text for DevOps_Expert.md:**
```markdown
## Tips from Role Learnings

- **Viewer is shared cross-repo.** `xwiki-viewer.html` is identical in FactHarbor and BestWorkplace (`C:\DEV\BestWorkplace`). Changes must be copied to both repos, then both pushed for CI deployment. Only the viewer HTML is shared — build scripts differ.
- **build_ghpages.py uses exact string patches.** `str.replace()` with exact matching. If you modify lines in the viewer that are patch targets, patches silently fail. After any viewer edit, verify all `html.replace(...)` calls in both repos' `build_ghpages.py` still find their targets. Run `python build_ghpages.py -o /tmp/test` and verify output.
```

---

## Entries to ARCHIVE/REMOVE (8)

| # | Role | Date | Title | Reason |
|---|------|------|-------|--------|
| LLM-4 | LLM Expert | 2026-02-13 | Context ID similarity threshold rationale (0.65) | References `orchestrated.ts` which was **removed**. The `oldToNewSimilarityThreshold` and context remap logic no longer exist. |
| LLM-5 | LLM Expert | 2026-02-13 | One-to-many context splits not covered by Phase 4b | References `orchestrated.ts` (lines 2152-2167) which was **removed**. The entire context refinement mechanism is gone. |
| LLM-7 | LLM Expert | 2026-02-20 | Profile presets must define explicit provider intent | **Self-declared superseded** (entry itself notes "Superseded 2026-02-23"). `DEBATE_PROFILES` removed from `config-schemas.ts`. The config pattern no longer exists. |
| SD-7 | Senior Dev | 2026-02-24 | Foundational GEMINI.md bridges system instructions | Too generic — the "thin pointer" pattern is self-evident from the existing file structure and now documented in AGENTS.md §Instruction Precedence. |
| SD-12 | Senior Dev | 2026-03-10 | Automated drift tests protect UCM authoritative defaults | **Already captured** in AGENTS.md ("JSON is Authoritative for Defaults" subsection under Configuration Placement). Redundant. |
| CR-5 | Code Reviewer | 2026-02-18 | Auth utility extraction reduces copy-paste drift | **One-time migration completed.** `auth.ts` exists and is in use. The learning was about the migration task, not an ongoing concern. |
| CR-8 | Code Reviewer | 2026-02-18 | New modules need test files | Too generic/obvious — "write tests for new code" is not a project-specific learning. |
| DO-6 | DevOps Expert | 2026-02-19 | build_ghpages.py patch strings must be kept in sync | **Redundant** with DO-2 (same topic, less comprehensive). DO-2 already covers this with more context. Only adds a specific resolved incident (analytics insertion breaking patch #5). |

---

## Entries to KEEP as-is (19)

These entries are still relevant but situational — they apply only when working on specific subsystems. Not universal enough to promote to role files.

### Lead Architect (5 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| LA-1 | 2026-02-16 | Two-pass claim extraction is worth the extra LLM cost | Valid architecture principle for extraction design. Situational — applies when designing LLM extraction stages. |
| LA-3 | 2026-02-16 | Multi-reviewer brainstorming produces better architecture | Process wisdom about multi-agent design sessions. Situational — applies during architecture brainstorming. |
| LA-5 | 2026-02-22 | Bias calibration measures consistency, not correctness | Quality metrics philosophy. Situational — applies when designing quality metrics. |
| LA-6 | 2026-02-22 | Cross-reference Executive Summary priorities against any execution plan | Planning best practice. Situational — applies during execution planning. |
| LA-8 | 2026-02-27 | Post-implementation root-cause analysis is higher leverage than threshold tuning | Debugging wisdom. Situational — applies when metrics don't improve after feature implementation. |

### Lead Architect (1 keep, renumbered)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| LA-9 | 2026-02-28 | Strict inverse pairs must be gated on CE, not absolute skew | Calibration-specific. Only relevant when working on calibration metrics. |

### Lead Developer (3 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| LD-1 | 2026-02-16 | Cross-check codebase before assessing brainstorming ideas | Valid principle. Note: example references removed `orchestrated.ts` but the principle is sound. |
| LD-2 | 2026-02-22 | Calibration tests need a dedicated Vitest config | Calibration-specific. `vitest.calibration.config.ts` still exists and this applies when modifying calibration. |
| LD-3 | 2026-02-22 | Full calibration gates need variance-aware interpretation | Calibration-specific. Cross-provider variance is inherent and this guidance prevents misinterpretation. |

### Senior Developer (5 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| SD-1 | 2026-02-19 | Assistant+user multi-turn messages untested with AI SDK Output.object() | SDK-specific limitation still applies. Situational — only matters when implementing retry with multi-turn patterns. |
| SD-3 | 2026-02-18 | Circuit breaker HALF_OPEN probe flag at both transition points | Implementation detail for `search-circuit-breaker.ts`. Situational — only if touching circuit breaker state machine. |
| SD-6 | 2026-02-24 | Use .geminiignore to optimize file discovery | Tool-specific tip. Situational — only matters for Gemini CLI users. |
| SD-8 | 2026-02-28 | IsolationLevel.Serializable for atomic check-and-increment in SQLite | .NET/SQLite gotcha. Situational — only when implementing atomic DB operations in the API. |
| SD-9 | 2026-03-04 | Regex match() can cause data loss in sentence splitting | UI-specific gotcha. Situational — only if touching text splitting code. |

### Senior Developer (1 keep, needs update note)

| Entry | Date | Title | Why Keep (with caveat) |
|-------|------|-------|----------------------|
| SD-11 | 2026-03-05 | LLM geography inference is unreliable for search gating | Companion to promoted SD-10. Adds nuance about WHY LLM inference is unreliable for API parameter control. Keep but note it's the "why" behind the promoted "what." |

### Technical Writer (2 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| TW-1 | 2026-02-15 | External link syntax for the xWiki viewer | Viewer-specific syntax detail. May overlap with `GlobalMasterKnowledge_for_xWiki.md` — verify during promotion of DevOps viewer entries. |
| TW-2 | 2026-02-24 | Requirement docs need explicit effort during pivots | Documentation process wisdom. Situational — only during major architectural pivots. |

### LLM Expert (3 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| LLM-2 | 2026-02-19 | Zod .catch() is transparent in JSON Schema generation | SDK knowledge. Situational — useful when deciding whether to add `.catch()` to schemas. |
| LLM-8 | 2026-02-20 | Runtime warning emission requires a collector pattern | Architecture pattern still in use. Situational — only if extending the warning system. |
| LLM-10 | 2026-02-22 | Verifiability assessment belongs at Stage 1, not Stage 4 | Pipeline design principle. Situational — applies if implementing claim verifiability classification. |

### LLM Expert (2 keep, with caveats)

| Entry | Date | Title | Why Keep (with caveat) |
|-------|------|-------|----------------------|
| LLM-6 | 2026-02-13 | assessTextSimilarityBatch is the shared workhorse | Function still exists (now in `evidence-deduplication.ts`). Core principle valid: regression-test broadly when modifying shared functions. **Caveat:** many listed call sites (context dedup, frame signal, anchor recovery) were in removed `orchestrated.ts`. Entry should note call sites are partially stale. |
| LLM-12 | 2026-02-24 | Required Reading must reference authoritative sources | Governance best practice. **Almost promoted** — very close to universal. Keeping because AGENTS.md §Instruction Precedence already implies this. Could alternatively be promoted to Agents_Supervisor.md. Captain's call. |
| LLM-13 | 2026-02-25 | Hardcoded model fallbacks block UCM configuration | Calibration-specific. `runner.ts` still exists. Situational — only when touching model selection in calibration. |

### Code Reviewer (4 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| CR-4 | 2026-02-17 | Check `as any` casts for missing CalcConfig fields | Review principle valid even if specific instances fixed. Situational — applies during config-touching code reviews. |
| CR-6 | 2026-02-18 | Circuit breaker double-counting causes early trips | Specific integration gotcha. Situational — only if modifying how circuit breaker failures are recorded. |
| CR-9 | 2026-02-18 | vi.resetModules() breaks instanceof | Vitest-specific gotcha. Situational — only when writing tests with module resets. |
| CR-10 | 2026-02-18 | Promise-based DB singletons must reset the promise on close | Specific pattern gotcha. Situational — only when modifying DB singleton teardown. |

### Code Reviewer (2 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| CR-11 | 2026-02-18 | Creating a shared utility is only half the migration | The principle "grep ALL callers after extracting a utility" is valuable and non-obvious. Different from the removed CR-5 (which was about the specific auth migration). |
| CR-12 | 2026-02-22 | Calibrations need review of diagnostics completeness | Calibration review pattern. Situational — applies when reviewing calibration job results. |
| CR-13 | 2026-03-05 | Audit prompts must enforce category-first classification | Warning severity audit pattern. Already encoded in `Audit_Warning_Severity.md`. Situational — only during warning severity audits. |

### Security Expert (1 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| SE-1 | 2026-03-01 | Retry endpoints are a hidden quota bypass vector | Open security concern. Situational — needs verification of whether the fix has been applied. Keep until confirmed resolved. |

### DevOps Expert (2 keep)

| Entry | Date | Title | Why Keep |
|-------|------|-------|----------|
| DO-3 | 2026-02-15 | GitHub OAuth token needs `workflow` scope | Situational — only during initial repo setup or re-authentication. |
| DO-5 | 2026-02-19 | Cloudflare Worker + KV for static-site analytics | Architecture decision context. Situational — useful if revisiting analytics implementation. |

---

## Organizational Issues (3 misplaced entries)

Three entries under the **DevOps Expert** section header have role tags of **"Technical Writer / xWiki Expert"**:

| Entry | Date | Title | Current Section | Should Be |
|-------|------|-------|----------------|-----------|
| DO-4 | 2026-02-19 | `!important` required to override JS inline styles | DevOps Expert | Technical Writer (viewer CSS gotcha) |
| DO-5 | 2026-02-19 | Cloudflare Worker + KV for analytics | DevOps Expert | Either is fine (infra + docs overlap) |
| DO-6 | 2026-02-19 | build_ghpages.py patch strings sync | DevOps Expert | Moot — recommended for removal (redundant with DO-2) |

**Recommendation:** Move DO-4 to Technical Writer section. DO-5 can stay in DevOps (it's infra). DO-6 is being removed anyway.

---

## Execution Plan (historical recommendation)

1. **Add "Tips from Role Learnings" sections** to 6 role files: Lead_Architect, LLM_Expert, Senior_Developer, Code_Reviewer, Security_Expert, DevOps_Expert
2. **Remove 8 archived entries** from Role_Learnings.md
3. **Move DO-4** from DevOps Expert section to Technical Writer section
4. **Update LLM-6** to note stale call sites (orchestrated.ts removed)
5. **Update the Captain Review Log** at the bottom of Role_Learnings.md
6. **Commit** with: `chore(agents): curate Role_Learnings — promote 19, archive 8, fix 3 misplaced`

**Execution outcome:** Implemented later in `dc9729e5` as
`chore(agents): curate Role_Learnings — promote 20 to role files, archive 8, fix 3 misplaced`.

Estimated effort: ~45 minutes for a single agent.

---

## Notes for Captain

- **No entries for Product Strategist or Agents Supervisor.** These roles either haven't accumulated learnings yet or their learnings were captured elsewhere.
- **LLM-12 (Required Reading → authoritative sources)** is borderline promote vs. keep. It's a governance principle that could go into `Agents_Supervisor.md` or even into AGENTS.md itself. Captain's call.
- **Promoted entries stay in Role_Learnings.md** with a `[Promoted]` tag for traceability, or are removed entirely — Captain decides which approach.
- **LD-1 example references removed file** (`orchestrated.ts`) but the principle is sound. Could add a note or leave as-is.
