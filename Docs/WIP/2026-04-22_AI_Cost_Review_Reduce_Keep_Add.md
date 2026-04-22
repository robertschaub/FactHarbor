# FactHarbor AI Cost Review — Reduce / Keep / Add

**Date:** 2026-04-22
**Role:** LLM Expert
**Status:** Draft recommendation — awaiting Captain decision before any subscription cancellations or code work. Revised after adversarial review (GPT-5.4 critique + `/debate` STANDARD-tier reconciliation).
**Scope:** Both development AI tooling (subscriptions) and runtime pipeline APIs.
**Related:**
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) — external funding / Batch API / credits track
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md) — residual allocation ideas
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) — runtime optimization status
- [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md) — token-debate outcomes this plan inherits

---

## 1. Why this plan is short

The obvious runtime levers are already done or explicitly deferred:

- Tiered routing (Haiku for extract/understand, Sonnet for verdict/context refinement) is live in `apps/web/src/lib/analyzer/model-tiering.ts`. The baked-in expectation was 50-70% cost reduction, which is already being captured.
- Prompt caching is wired in the hot stages **and in `grounding-check.ts`** (verified during debate: grounding-check already calls `getPromptCachingOptions` in both its LLM call sites). See [Prompt_Caching_Debate_Consolidation](../AGENTS/Handoffs/2026-04-15_LLM_Expert_Prompt_Caching_Debate_Consolidation.md).
- Broader token-reduction via chunking was debated with a split outcome in [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md). Three wins were **approved**: instrumentation, preliminary chunking, and boilerplate truncation. Verdict-evidence filtering was rejected on fair-trial grounds. Extraction sub-chunking was deferred pending measurement.
- Phase-1 pipeline speed/cost work is mostly shipped; `P1-A` clustering downgrade is the only remaining quality-sensitive runtime lever ([Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md)).

So the remaining real cost levers are: **subscription-stack rationalization, three approved-but-unshipped safe wins, a provider-preserving runtime mechanism (Batch API), a quality-gated provider-routing experiment (Gemini Flash), and free credit programs.** Not more pipeline surgery.

---

## 2. What you are actually paying for

### Development (monthly subscriptions, user-confirmed)

- **Cursor Pro** — $20 (credit pool, unlimited Tab, auto mode)
- **Claude Max** — $100 (5x) or $200 (20x); includes unlimited Claude Code + Sonnet 4.6 + Opus 4.6 on 5-hour windows
- **GitHub Copilot Pro** — $10 (300 premium requests/mo)
- All three provide Claude Sonnet 4.x access, which is the material model overlap. The workflow overlap is narrower — see §3.

### Runtime (pay-as-you-go)

- **Anthropic API** — drives 100% of the default pipeline (`"llmProvider": "anthropic"` in `apps/web/configs/pipeline.default.json`). This is the single largest runtime cost line.
- **Provider keys to reassess individually:**
  - `OPENAI_API_KEY` — used by the debate **challenger** role (`pipeline.default.json:109`) and the TPM guard fallback (`openaiTpmGuardFallbackModel: "gpt-4.1-mini"`). Captain did not list an OpenAI account — either he has one not listed, the challenger is silently failing, or the fallback path never fires. Investigate before acting.
  - `GOOGLE_GENERATIVE_AI_API_KEY` — only used if the `llmProvider` is switched or Google models are added via UCM; the Gemini experiment in §4 would activate this.
  - `MISTRAL_API_KEY` — Mistral is a **supported provider surface** in `llm.ts`, `model-resolver.ts`, `config-schemas.ts`, admin routes, and tests. Unused by current defaults but **not dead code**. Treat the key as local-env hygiene only.
- **Search:** Google CSE (primary, 8k/day free cap) + Serper (secondary, paid beyond free tier). Brave + SerpAPI keys set but providers disabled in `apps/web/configs/search.default.json`. Note: `"provider": "auto"` + `"autoMode": "accumulate"` means Serper **contributes to recall**, not just fallback.

---

## 3. Development Tooling — Reduce / Keep / Add

### 3.1 REDUCE — verify-then-decide, not blanket cancel

- **GitHub Copilot Pro — conditional cancel ($120/yr).** Cursor Pro covers the same Sonnet models and has a stronger multi-file agent; Claude Max covers Claude Code (terminal) and the Claude Sonnet + Opus web UI. Copilot's distinct remaining lanes per [Tool_Strengths.md](../AGENTS/Policies/Tool_Strengths.md) are:
  - (a) inline completion in non-VS-Code IDEs (JetBrains, Neovim),
  - (b) PR summaries / Copilot Workspace on github.com,
  - (c) the GitHub Copilot coding agent triggered from issues.

  **Only cancel if none of those three lanes is in your daily workflow.** If you use any, keep it.
- **Cursor Pro — keep unless Claude Code covers agent needs.** Daily use of Cursor Composer / multi-file Agent / Tab autocomplete makes $20/mo a straight win. If you have migrated entirely to Claude Code (terminal) for agent work, Cursor Hobby may suffice.

### 3.2 KEEP

- **Claude Max (5x or 20x).** Best $/capability in the stack. Flat-rate includes cache reads which is where the real value lives; using Claude Code via raw API at this intensity typically runs $500-$2000/mo per industry data.
- **Anthropic API (pay-as-you-go).** Required for the FactHarbor runtime. Max credits do NOT transfer to the API — separate billing systems.

### 3.3 ADD — free / discounted programs (verify terms at primary source first)

- **Claude for Open Source Maintainers — 6 months of Max 20x free (~$1,200 value)**, reportedly closing June 30, 2026. Verify current terms at `claude.com/contact-sales/claude-for-oss` (or Anthropic's current canonical URL) **before** investing application time. If valid, FactHarbor is the target audience.
- **Anthropic AI for Science Program — up to $20–50k in API credits** if a research framing applies, reportedly evaluated monthly. Verify at `anthropic.com/ai-for-science-program-rules` before applying. FactHarbor's input-neutrality / multilingual-robustness methodology is a plausible research angle.
- **Claude for Nonprofits — up to 75% off Team/Enterprise** if you register a 501(c)(3) or international equivalent. Only relevant if you formalize legally.

---

## 4. Runtime Pipeline — Reduce / Keep / Add

### 4.1 REDUCE

- **Clarify OpenAI spend before acting.** Inspect runtime logs for challenger-role activity. Then choose:
  1. **Fund OpenAI and swap to GPT-4.1-mini** (`$0.40/$1.60` vs GPT-4.1's `$2/$8`) in `pipeline.default.json:109`. Cheaper challenger, preserves cross-family adversarial pressure. Recommended.
  2. **DO NOT swap the challenger to Anthropic** without a debate-symmetry audit. LLM Expert role learnings ([Roles/LLM_Expert.md](../AGENTS/Roles/LLM_Expert.md)) explicitly warn: *"Debate model symmetry — never upgrade only the challenger"* and *"LLM self-eval bias — LLMs rate same-family output higher on correlated dimensions."* Collapsing challenger onto Anthropic risks the reconciler rubber-stamping same-family advocate output. The prior `~$0.024/analysis` savings estimate ([LLM_Allocation_and_Cost_fwd_arch.md](../ARCHIVE/LLM_Allocation_and_Cost_fwd_arch.md) Rec-B) does not pay for analytical-quality regression.
- **Local env hygiene — remove `MISTRAL_API_KEY` from local `.env.local`** if not actively running Mistral experiments. Do NOT remove Mistral from `.env.example`, `llm.ts`, `model-resolver.ts`, or `config-schemas.ts` — it is a supported provider surface.
- **Serper — verify-then-disable, do not blanket-cut.** `search.default.json` uses `provider: "auto"` with `autoMode: "accumulate"` — Serper is not a rare fallback; it contributes to recall every time it accumulates. Before disabling in UCM, run a small benchmark-family batch with and without Serper and compare evidence-count / source-diversity deltas. Disable only if recall holds.

### 4.2 KEEP

- **Tiered routing + prompt caching** — already optimal. Do not regress.
- **Google CSE as primary search** — cheapest + fastest + 8k/day free is enough for solo-dev volume.
- **Wikipedia provider** — free, high-quality, keep enabled.

### 4.3 ADD — four approved runtime levers (priority order)

1. **Token instrumentation per stage (Phase 0, prerequisite for everything below).** Add input/output token counters keyed by stage + job. Cannot prioritize the rest without this. Approved by the 2026-04-20 token debate.
2. **Preliminary chunking + boilerplate truncation (approved safe wins, not yet shipped).** Both were explicitly approved in [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md) §6 as Phase-1 items but have not landed. Both are low-risk:
   - Header-based preliminary chunking at 3-4K chars in `claim-extraction-stage.ts:1703-1705`
   - Better boilerplate stripping at fetch time in `research-acquisition-stage.ts` before the 8K char cap (structural plumbing, not analytical — allowed by AGENTS.md)
3. **Anthropic Batch API integration — 50% off input AND output (primary runtime lever).** Provider-preserving; no re-calibration risk. Best fit: self-consistency calls (2 per claim) and validation/summary calls, which are not latency-critical. Blocker is queue management in the AI SDK wrapper. Prior estimate: 20-30% total job cost reduction.
4. **Gemini 2.5 Flash routing experiment — quality-gated, BUDGET tier only.** The pricing delta is material: Gemini Flash `$0.15/$0.60` vs Haiku 4.5 `$1.00/$5.00` per MTok per `model-tiering.ts` — roughly 6-8x cheaper. Infrastructure is already wired. **But this is NOT a flagship lever**: FactHarbor's prompts, confidence calibration, neutrality testing, and multilingual-robustness work are calibrated against Anthropic Haiku+Sonnet. Provider changes are quality-sensitive per AGENTS.md. Run as a scoped experiment with mandatory gates:
   - **Scope:** budget tier tasks only (`understand`, `extract_evidence`) — do NOT touch verdict/context-refinement.
   - **Gate A:** neutrality test (≤4% tolerance per AGENTS.md input-neutrality rule).
   - **Gate B:** multilingual validation across en/fr/de/pt inputs (AGENTS.md multilingual robustness rule).
   - **Gate C:** benchmark-family run vs current Anthropic baseline — no regression on evidence-count, high-probativeValue ratio, or verdict stability beyond run-to-run noise.
   - Only promote to default if all three gates pass. Leave as per-task config flag otherwise.

---

## 5. Bottom-line recommendations (priority order)

### 5.1 Immediate — deadline-driven or zero-risk

- [ ] Verify Claude OSS Maintainers program terms at primary source; if valid, apply before the stated June 30, 2026 deadline (~$1,200 value).
- [ ] Verify Copilot workflow lanes; cancel only if none are in daily use ($120/yr if yes).
- [ ] Remove `MISTRAL_API_KEY` from local `.env.local` (keep provider code path).
- [ ] Decide OpenAI: fund + swap to GPT-4.1-mini, OR investigate silent-failure — explicitly DO NOT collapse onto Anthropic.

### 5.2 Near-term — one focused code session each

- [ ] Add per-stage token instrumentation (Phase 0 unlock).
- [ ] Ship preliminary chunking + boilerplate truncation (both already approved).
- [ ] Run a benchmark-family Serper-on-vs-off recall comparison before disabling.

### 5.3 Medium-term — bigger effort, biggest provider-preserving return

- [ ] Wire Anthropic Batch API for non-latency-sensitive calls. Target 20-30% total job cost reduction.
- [ ] Verify and apply for Anthropic AI for Science credits.

### 5.4 Experimental — only with calibration budget

- [ ] Gemini 2.5 Flash routing on budget-tier tasks, behind neutrality + multilingual + benchmark-family gates. Promote only if all gates pass.

### 5.5 Do NOT

- Cut Claude Max — best $/value dev tool.
- Switch the debate challenger to Anthropic without a symmetry audit — violates LLM Expert role learnings.
- Treat Gemini Flash as a drop-in flagship lever — it is a quality-sensitive experiment.
- Disable Serper blindly — `auto/accumulate` means it contributes to recall every run.
- Remove Mistral provider code — it is a supported surface.
- Revisit evidence-filtering for verdict cost — rejected on fair-trial grounds.
- Revisit prompt caching refactor in hot stages or grounding-check — already wired.

---

## 6. Provenance

- **Author:** LLM Expert role (Claude Opus 4.7, via Cursor).
- **Adversarial review:** GPT-5.4-medium via Task subagent flagged staleness on `grounding-check.ts`, weak scoping on Copilot/Serper/Mistral cuts, and a self-contradiction on the challenger-Anthropic swap. See this session's chat transcript for the critique.
- **Reconciliation:** `/debate` STANDARD tier with Advocate/Challenger/Reconciler roles. Verdict: MODIFY (surgical patch, not wholesale rewrite). This document is the post-debate revised version.
- **Items dropped from the original draft:** `grounding-check.ts` caching patch (already shipped — verified); blanket Copilot cancel (softened to workflow-conditional); blanket Serper disable (softened to recall-verified); blanket Mistral removal (narrowed to local env only); challenger-to-Anthropic swap (explicitly forbidden without symmetry audit).
- **Items added to the original draft:** preliminary chunking + boilerplate truncation (approved safe wins that were missed); Gemini 2.5 Flash routing as quality-gated experiment; credit-program "verify at source" guard.
