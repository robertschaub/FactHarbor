# FactHarbor AI Cost Review — Split Tracks

**Date:** 2026-04-22  
**Last updated:** 2026-04-22 — **Claude Max** explicitly confirmed in stack + Max vs API vs Cline BYOK overlap note; primary **ChatGPT Pro (Codex)**; **Cline** BYOK/credits; **§A1b** FactHarbor pairing.  
**Role:** LLM Expert  
**Status:** Draft recommendation — awaiting Captain decision before any subscription cancellations or code work.  
**Scope:** Explicitly split into two independent tracks:
1. Developer tools (your personal coding workflow)
2. FactHarbor runtime (product execution costs)

**Do not mix the tracks:** developer tool choices should not automatically change runtime provider decisions, and runtime provider decisions should not be based on personal model preference alone.

**Related:**
- [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md) — external funding / Batch API / credits track
- [LLM_Allocation_and_Cost_fwd.md](LLM_Allocation_and_Cost_fwd.md) — residual allocation ideas
- [Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md](Pipeline_Speed_Cost_Optimization_Plan_2026-03-19.md) — runtime optimization status
- [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md) — token-debate outcomes this plan inherits

---

## Track A — Developer Tools (Personal Workflow Only)

This track optimizes your own coding productivity and subscription spend. It is independent of FactHarbor runtime behavior.

### A1. Current stack and operator signal

- **Primary developer lane (KEEP as anchor):** **ChatGPT Pro** — Codex coding agent and maximum Codex access on the plan you use (ChatGPT pricing UI: Pro ~CHF 83/mo with 5x vs 20x usage tier; Plus ~CHF 20/mo includes Codex at a lower cap). This is your stated default for day-to-day coding.
- **Other paid tools (reconcile against primary lane):**
  - Cursor Pro (~USD 20/mo — separate from ChatGPT billing)
  - **Claude Max (confirmed active)** — USD ~$100 (5×) / ~$200 (20×): Claude Code (terminal), claude.ai web/app, Sonnet/Opus within plan limits. **This is not the same product as Anthropic API billing** for FactHarbor jobs — Max credits do not pay pipeline `ANTHROPIC_API_KEY` usage (Track B).
  - GitHub Copilot Pro (~USD 10/mo)
  - **Cline (VS Code extension)** — **no monthly Cline subscription** for the OSS extension itself; cost is **usage-based** via **(a)** your own API keys (BYOK → you pay Anthropic/OpenAI/Google/OpenRouter per token) and/or **(b)** **Cline credits** if you use Cline’s hosted inference. Treat Cline as **variable spend**, not a flat line item like Cursor Pro. **If Cline is BYOK’d to Anthropic**, you can pay **both** Claude Max (flat) **and** API metered usage for the same model family — watch that stack.
- **Operator signal:** Codex (via ChatGPT) is primary; Claude Opus perceived as degraded for *your* coding use cases — so Claude Max is a **reassess / likely cut** candidate unless you still get weekly value from **Claude Code** or claude.ai workflows that Codex + Cursor do not replace.

### A1b — FactHarbor repo: recommended coding assistant pairing

FactHarbor is a **split codebase** (Next.js under `apps/web`, ASP.NET Core under `apps/api`) with **heavy repo conventions** (`AGENTS.md`, `Docs/AGENTS/Handoffs/`, pipeline stages under `apps/web/src/lib/analyzer/`). That shape favors **two complementary surfaces**, not four overlapping subscriptions.

| Role | Tool | Why it fits FactHarbor |
|------|------|-------------------------|
| **Primary (reasoning + agent outside the tree)** | **ChatGPT Pro + Codex (GPT‑5.4)** | Long threads, design/debate, reading handoffs, cross-cutting questions where the chat/agent UX is the main surface. |
| **Complement (in-repo editing)** | **Cursor Pro** | Multi-file edits across `apps/web` + `apps/api`, `@`-context into `AGENTS.md` and specific stage files, Composer-style refactors. |

**Default stance for FactHarbor:** **ChatGPT Pro + Cursor Pro** is enough for day-to-day development. **Do not add** another paid coding assistant for this repo unless a **named weekly workflow** breaks without it (see Copilot lanes in §A2).

**Explicitly out of this pairing:** pipeline **runtime** API keys (Anthropic/OpenAI/Google for jobs) — those belong to **Track B** only; billing and decisions stay separate from “which IDE/chat assistant I use to write code.”

### A2. Recommendations — Reduce / Keep / Reassess

#### Keep (primary lane)

- **ChatGPT Pro (or the minimum tier that still covers your Codex usage).** Do not downgrade until you confirm Codex limits on Plus/Go still meet your weekly agent workload. If Pro is required for “maximum Codex,” treat it as the non-negotiable anchor until measured otherwise.

#### Reduce first (highest overlap, lowest risk)

- **GitHub Copilot Pro — conditional cancel ($120/yr).**
  - Keep only if you rely on one of these lanes regularly:
    1. inline completion in non-VS-Code IDEs
    2. PR summary/workflow features on github.com
    3. GitHub-native coding-agent flows tied to issues/PRs
  - If none of the above are daily/weekly critical, cancel first.

#### Reassess second (largest monthly delta after Copilot)

- **Claude Max — strong candidate to downgrade or cancel.**
  - Primary coding is Codex (ChatGPT Pro); keep Max only if Claude still delivers weekly value *outside* what Codex + Cursor already cover (e.g. long Opus-only reasoning sessions you still run on purpose).
  - If not, canceling Max is typically the largest single subscription saving after Copilot.

#### Cursor — editor complement, not a second “primary brain”

- **Keep Cursor Pro** if Composer / Tab / multi-file edits remain daily; it pairs with Codex rather than replacing it.
- **Downgrade or drop Cursor** only if essentially all editing happens inside Codex workflows and you rarely open the IDE agent.

#### Avoid triple overlap

- **ChatGPT Pro (Codex)** + **Cursor** + **Claude Max** + **Copilot** (+ **Cline** variable) is a heavy stack — target **one primary + one editor complement** (e.g. ChatGPT Pro + Cursor), then **drop Copilot** if GitHub-native lanes are unused, then **reassess Claude Max** unless Claude Code / claude.ai remains weekly-critical. **Cline:** prefer routing Cline to keys that are *not* double-billing alongside Max (e.g. OpenAI if that’s already in your ChatGPT ecosystem), or accept Max + Anthropic API as two meters if you need both.

### A3. Developer-tool decision checklist (14-day rule)

- [ ] Confirm minimum ChatGPT tier (Go / Plus / Pro) that still satisfies Codex usage; document actual CHF/month once stable.
- [ ] Track actual session share for 14 days (ChatGPT+Codex / Cursor / Copilot / Claude Max & Claude Code / Cline-driven API spend).
- [ ] If Claude usage is below 20-25% of coding sessions, downgrade/cancel Claude Max.
- [ ] If Copilot-specific lanes are not missed after one week without it, keep Copilot canceled.
- [ ] Keep **ChatGPT + Codex** as primary; at most one extra paid assistant (usually Cursor) unless a lane proves essential.

### A4. Developer-tool guardrails

- Do not use runtime quality arguments to justify keeping redundant personal subscriptions.
- Do not use personal model preference as evidence that runtime provider should change.

---

## Track B — FactHarbor Runtime (Product Costs Only)

This track optimizes production-like analysis execution costs while preserving AGENTS.md quality constraints.

### B1. Runtime baseline and constraints

- Default runtime provider remains Anthropic (`"llmProvider": "anthropic"` in `apps/web/configs/pipeline.default.json`).
- Tiered routing and prompt caching are already active and should not be regressed.
- Runtime changes must remain quality-gated:
  - input neutrality tolerance <= 4%
  - multilingual robustness
  - benchmark-family stability

### B2. Runtime recommendations — Reduce / Keep / Add

#### Reduce (targeted and validated)

- **Clarify OpenAI spend path.** Challenger role is configured to OpenAI. Verify actual usage and failure/success path before changing spend.
- **Do not switch challenger to Anthropic without a symmetry audit.** Role learnings warn about same-family self-eval bias in debate patterns.
- **Serper: verify-then-disable only.** `auto` + `accumulate` means Serper contributes to recall, not only fallback.
- **Mistral key hygiene:** remove local `MISTRAL_API_KEY` only if unused in your environment; keep provider surface in code.

#### Keep

- Tiered routing + caching baseline.
- Google CSE primary search lane.
- Wikipedia provider.

#### Add (priority order)

1. **Per-stage token instrumentation (Phase 0 prerequisite).**
2. **Approved safe wins from token debate:**
   - preliminary chunking
   - boilerplate stripping before cap
3. **Anthropic Batch API integration** for non-latency-sensitive calls (provider-preserving cost lever).
4. **Gemini Flash experiment** (budget-tier tasks only, behind strict quality gates; not default by assumption).

### B3. Runtime execution checklist

- [ ] Add token telemetry by stage and job.
- [ ] Implement the two approved safe wins (preliminary chunking + boilerplate stripping).
- [ ] Run Serper-on vs Serper-off recall comparison before any provider disable.
- [ ] Implement Batch API where asynchronous flow is acceptable.
- [ ] Run Gemini budget-tier experiment only with neutrality + multilingual + benchmark gates.
- [ ] Promote runtime provider changes only after evidence, not preference.

### B4. Runtime guardrails

- Never optimize runtime by weakening fair-trial evidence handling.
- Never bypass AGENTS.md quality constraints for cost wins.
- Never treat personal tool preference as runtime validation.

---

## Combined Priority Map (Separated by Track)

### Immediate (Developer Tools)

- [ ] Confirm ChatGPT Pro vs Plus for Codex caps (avoid accidental downgrade that blocks agent work).
- [ ] Run 14-day usage audit (Codex vs Cursor vs Claude vs Copilot).
- [ ] Decide Copilot retain/cancel.
- [ ] Decide Claude Max retain/downgrade — default stance **downgrade/cancel** if Codex+Cursor covers coding.

### Immediate (Runtime)

- [ ] Add token instrumentation.
- [ ] Validate OpenAI challenger spend path.
- [ ] Queue safe wins for implementation.

### Medium-term (Runtime)

- [ ] Batch API integration.
- [ ] Gemini Flash budget-tier experiment with mandatory gates.

---

## Provenance

- Original document reviewed and revised after GPT-5.4 critique and `/debate` reconciliation.
- This version restructures the entire document into two non-overlapping decision tracks at user request.
- **2026-04-22:** Track A updated so **ChatGPT Pro + Codex** is the explicit primary developer anchor; CHF pricing taken from Captain’s ChatGPT pricing screenshot (Go / Plus / Pro); Claude Max framed as reassess-first after Copilot.
- **2026-04-22:** Added **§A1b — FactHarbor repo: recommended coding assistant pairing** (ChatGPT Pro + Codex primary, Cursor Pro complement; no third paid assistant for the repo unless a named workflow requires it; runtime APIs stay Track B).
- **2026-04-22:** Captain confirmed **Claude Max** is in the active stack; doc now states **Max ≠ Anthropic API** for pipeline jobs, and flags **Claude Max + Cline Anthropic BYOK** as a possible double meter.
