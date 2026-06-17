# Additive Repair Drift — Problem Statement

**Date:** 2026-04-21  
**Status:** Active reference analysis  
**Role:** Lead Architect  
**Scope:** AI-agent workflow architecture, not analyzer runtime behavior  
**Related:** [2026-04-20_Prompt_Split_Plan.md](2026-04-20_Prompt_Split_Plan.md), [2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md)

---

## 1. Problem Statement

During iterative problem solving, agents can lack attempt-retirement discipline. After a failed code or prompt change, they can keep that failed or unverified change in the active solution and layer further changes on top of it, instead of explicitly deciding whether the earlier change should be kept, quarantined, or reverted.

This can create **additive repair drift**:

- context grows
- causal attribution gets weaker
- overengineering becomes more likely
- human correction can depend on very precise rollback instructions

Architecturally, the repair loop has no first-class **retire prior attempt** step. Failed hypotheses can remain live in code and prompt context, so later iterations optimize on top of contaminated state instead of re-establishing a clean verified baseline.

---

## 2. What Led To This Statement

This problem statement was not invented in the abstract. It emerged from the convergence of:

1. **Captain observation in current workflow use**
   - Agents often keep adding code or prompt text after an unsuccessful attempt.
   - Partial undo is rarely proposed proactively.
   - Rollback-like moves are usually accepted only when the Captain specifies them very precisely.

2. **Recent FactHarbor agent-tooling work**
   - [2026-04-20_Prompt_Split_Plan.md](2026-04-20_Prompt_Split_Plan.md) concluded that the real issue was not only file size but **behavioral compliance**: competent agents can use targeted reads, but they do not do so consistently.
   - [2026-04-16_Agent_Indexing_System_Design.md](2026-04-16_Agent_Indexing_System_Design.md) identified repeated agent discovery waste and explicitly called out that instruction-based adoption has a meaningful bypass risk.
   - `Docs/AGENTS/Handoffs/2026-04-13_LLM_Expert_Root_Instruction_File_Trim.md` documented community evidence that larger instruction files correlate with compliance decay and bloat.

3. **External evidence from research, official docs, and practitioner reports**
   - The external signal does not prove one universal failure mechanism, but it does show that additive drift, context bloat, and insufficient mechanical controls recur in multiple real-world reports.

---

## 3. External Evidence

### Research / official guidance

1. **AI-generated code is often over-inclusive and later removed**
   - [What to Cut? Predicting Unnecessary Methods in Agentic Code Generation](https://arxiv.org/abs/2602.17091) reports that agentic coding produces larger PRs and that a notable portion of AI-generated code is later deleted during review.
   - This does not by itself prove why the code was added, but it is strong evidence that additive generation often overshoots what should remain.

2. **Official review guidance already assumes this class of failure**
   - [GitHub: Review AI-generated code](https://docs.github.com/en/enterprise-cloud%40latest/copilot/tutorials/review-ai-generated-code) tells reviewers to check whether the code solves the right problem, reject code that is harder to refactor than rewrite, and watch for tests being deleted or skipped instead of fixed.
   - That is an official acknowledgment that AI-generated changes frequently drift from clean problem-solving into low-quality or misdirected patching.

3. **Better debugging comes from smaller verified units, not from treating the program as one blob**
   - [Debug like a Human](https://arxiv.org/abs/2402.16906) argues that iterative refinement is weaker when the generated program is treated as an indivisible whole and reports better performance when debugging uses runtime verification over smaller code units.
   - This supports a repair loop that isolates and verifies the smallest failing unit before broadening scope.

4. **Backtracking is strong enough to be an explicit architectural mechanism**
   - [SRLCG](https://arxiv.org/abs/2504.00532) introduces dynamic backtracking as part of large-scale code generation.
   - The relevance here is architectural: successful agent workflows often need an explicit mechanism for retreat, not just another forward patch.

5. **Prompt bloat degrades performance**
   - [RAG-MCP](https://arxiv.org/abs/2505.03275) reports that passing only relevant tool descriptions cut prompt tokens by over 50% and more than tripled tool-selection accuracy in the reported benchmark.
   - This supports the broader point that failed-attempt residue left in active context is not harmless.

### Directional practitioner signal

6. **Edit-first drift and context growth are reported in real agent use**
   - In [anthropics/claude-code issue #42796](https://github.com/anthropics/claude-code/issues/42796), the reporter describes a measured shift from research-first to edit-first behavior, including a read:edit drop from `6.6` to `2.0`, doubled full-file writes, and worsening correction loops.
   - This is anecdotal and product-specific, but the reported pattern matches the failure mode described above.

7. **Prompt governance alone is not enough when write-capable agents broaden scope**
   - In [openai/codex issue #16798](https://github.com/openai/codex/issues/16798), the reporter argues that the problem is not only model carelessness but the lack of enforced mechanical controls when an agent broadens scope from a narrow request into broader mutation.
   - The associated [OpenAI approvals/security documentation](https://developers.openai.com/codex/agent-approvals-security) explicitly separates technical permissions from approval policy, which supports the same architectural lesson.

8. **Large injected instruction payloads reduce working memory**
   - In [openclaw/openclaw issue #41594](https://github.com/openclaw/openclaw/issues/41594), the reporter describes 15-20K-token system prompt payloads as a quality problem, not only a cost problem.
   - Again, this is directional rather than authoritative, but it aligns with the repo’s own prompt/context reduction work.

---

## 4. Working Explanation

The current evidence supports treating this as a workflow-architecture bias, not as a moral failure of any one model.

### 4.1 Forward motion is easier than subtraction

Most agent loops are optimized around:

- inspect failure
- propose fix
- apply more changes
- retry

They are usually **not** optimized around:

- inspect failure
- identify which earlier change is now a bad hypothesis
- retire or quarantine that change
- retry from a cleaner state

### 4.2 Deletion requires higher confidence than addition

Adding one more patch is locally safe-looking. Removing or undoing an earlier change feels riskier unless the agent has:

- explicit authority to revert
- a checkpoint to revert to
- a verifier that proves the earlier change is the problem

Without those, the agent tends to preserve prior work and stack more on top.

### 4.3 Failure feedback is usually under-specific

A failed build or bad output often says only that the current state is wrong. It rarely says:

- which earlier hunk caused the drift
- whether the right move is revert vs refine
- whether the scope should narrow or expand

That uncertainty encourages additive patching.

### 4.4 Failed attempts contaminate active context

Once a weak attempt remains present in:

- the working tree
- the prompt context
- the agent’s recent-turn memory

later steps reason around it as if it were still a viable part of the solution. At sufficient scale, this context growth can exhaust finite context windows, causing hard mechanical truncation rather than gradual degradation — the [Prompt Split Plan](2026-04-20_Prompt_Split_Plan.md) documents FactHarbor-specific measurements (53K tokens, 13–21% of current model limits from a single prompt file alone).

### 4.5 Prompt-only governance has a ceiling

Telling agents to be careful helps, but prompt instructions alone do not reliably enforce:

- rollback boundaries
- scope boundaries
- hunk quarantine
- approval gates for broadening work

That requires mechanism, not only wording.

---

## 5. What This Statement Does And Does Not Claim

### It does claim

- the failure mode is real enough in this repo to be architecturally relevant
- the external signals listed here suggest the pattern is broader than one product or one repo
- future agent workflows should include an explicit way to retire failed attempts

### It does not claim

- that every failed attempt should be reverted
- that rollback should be the default answer in all cases
- that the external evidence proves one single root cause with high certainty

The strongest supported posture is **verifier-gated bounded backtracking**, not blanket rollback-first behavior.

---

## 6. Recommended Architectural Response

If this problem is later turned into policy or tooling, the response should stay bounded and verifier-led. Items below are directional design responses grounded in the evidence above. Items marked **[hypothesis]** have no specific evidence counterpart in the inventory and require validation before implementation:

1. **Isolate the smallest failing unit**
   - Do not let the whole previous patch stay mentally “live” if the failure can be localized.

2. **Quarantine speculative hunks after a failed attempt** **[hypothesis]**
   - Failed or weak changes should stop participating as assumed-good solution state.

3. **Require fresh verification before scope expansion**
   - If the first narrow fix failed, the next broader fix should be explicitly justified, not implicitly assumed.

4. **Preserve old attempts as metadata, not active context** **[hypothesis]**
   - Keep history for learning, but do not let failed attempts crowd the prompt or working solution.

5. **Treat rollback as a recovery tool, not the default**
   - Revert when the verifier and local evidence indicate contamination, not as a reflex.

6. **Use mechanism-enforced approval for scope broadening**
   - Broadening from a local fix into cross-file or cross-system mutation should be an explicit decision.

---

## 7. Operational Interpretation For Future Agents

When a code or prompt fix fails, the next agent should not assume the right move is “add one more patch.”

The agent should explicitly answer:

1. Which earlier change is still believed to be correct?
2. Which change is now only speculative?
3. Which change should be quarantined or reverted before retry?
4. Is the next attempt narrower, equivalent, or broader in scope?
5. What verifier justifies keeping prior edits active?

If the agent cannot answer those questions, it is likely already in additive repair drift.

---

## 8. Current Recommendation Status

This document is a **problem-framing reference**, not a new binding AGENTS.md rule.

It records an architecture concern whose local relevance is established, while leaving prevalence and final policy response open.

It exists so future agents do not misread the concern as:

- “Captain prefers rollback”
- “Agents should always delete more”
- “The issue is just prompt size”

The actual issue is narrower and more structural:

> failed attempts remain live for too long, and the workflow lacks a first-class retire/quarantine/revert decision point.

