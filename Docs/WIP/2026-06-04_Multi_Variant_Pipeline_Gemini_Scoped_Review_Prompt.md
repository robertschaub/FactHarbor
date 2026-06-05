# Gemini 3.1-pro (via Cline) — SCOPED second-opinion prompt

A deliberately narrow review. The proposal already had a deep, code-grounded correctness review (Codex GPT-5.5) whose findings are incorporated. This pass is **only** for two *conceptual* lenses that review didn't focus on. Paste the block below into Cline/Gemini running in the repo.

---

You are a **principal architect / research-methodology reviewer** giving a FactHarbor proposal a **scoped** second opinion. A deep, code-grounded correctness review (Codex GPT-5.5) is already done and incorporated — **do NOT redo it**: do not re-enumerate call sites, blast radius, contract field lists, schema details, or AGENTS line-item compliance. Your entire value is the **two conceptual questions below**. Be concrete, reason from first principles, and disagree where warranted.

## Read (repo `C:\DEV\FactHarbor`; you have read access)
- `Docs/WIP/2026-06-04_Multi_Variant_Pipeline_Architecture.md` — start at the **Locked decisions** block; skim §3.3 (Stage-1 pin), §8 (rebuild workflow), §10 (rejected alternatives).
- `Docs/WIP/2026-06-04_Multi_Variant_Pipeline_Implementation_Plan.md` — skim the phase map + Phase 3c.
- Treat the Specification as background; you don't need to audit its contracts.

## The goal these docs serve (what success means)
FactHarbor wants to **attribute quality changes across historical pipeline "eras"** — *which era's analysis pipeline was best, and why* — and more generally to run/compare multiple pipeline variants (code + prompt + config) in parallel with full provenance, on a file-authoritative config model. Near-term concrete target: rebuild **3 historical git tags** — `Quality_Top_Peak` (`b7783872`), `2before_bol_fix` (`d528b62c`), `quality_before_decline` (`d3ad26ca`) — as comparable variants. These tags are **code-divergent** from HEAD (42 / 21 / 16 analyzer files). A Captain constraint **pins the AtomicClaim generation + selection *logic* to HEAD** for all variants: a variant = **Stages 2–5 only**, fed an injected `ClaimContract`; for historical eras a **structural adapter** maps HEAD's claim shape to what that era's downstream stages expected.

## Q1 — Experimental validity (methodology, not code)
Does the design actually answer "which era's pipeline was best and why"?
- Pinning Stage-1 logic to HEAD and feeding each era's Stages 2–5 via a HEAD→era `ClaimContract` adapter: does this **isolate** downstream quality, or **confound** it? Era-X's Stages 2–5 were tuned for era-X's *own* claim shape/fields; running them on HEAD's (possibly richer/different) claims may measure *"era-X downstream on out-of-distribution claims,"* not era-X. How serious is this, and how would you detect/bound it?
- Is "downstream-only on HEAD claims" answering a **different question** than intended? If the real question includes how each era *selected/extracted claims*, this design deletes exactly that signal. Is that acceptable given the goal?
- What is the **minimal set of comparison conditions** that would actually answer the attribution question? (e.g., also run each era *fully unmodified* as a true baseline; share one `ClaimContract` across arms vs. per-arm extraction; isolate and measure the Stage-1 contribution separately.)
- The Stage-1 pin is a Captain decision. Your job: surface with reasoning whether it **undermines the stated goal**, so the Captain can reconsider with eyes open — not to assume it's wrong.

## Q2 — Is there a materially simpler architecture? (fresh eyes, unanchored)
For *this near-term goal* (compare 3 historical eras + provenance), is there a **materially leaner** path than the proposal (in-tree variant registry + Stage-1 hoist + config/prompt threading + file-authoritative UCM rework)?
- In particular: would **running the actual old commits** (a worktree/process per era) behind a thin comparison harness be both **less work** *and* **more faithful** than **re-implementing each era's Stages 2–5 as new in-tree modules**? The proposal rejected process-per-variant and locked the in-tree registry — but that was decided before it was clear the variants are *deeply code-divergent historical rebuilds*. Re-implementing 3 eras faithfully is substantial and error-prone; running the original code is exact. Make the **strongest case for the alternative**, then say explicitly whether it is compelling enough to **reopen the locked decision**.
- Where is the design **over-built** for "compare 3 eras"? (e.g., is the full config-DB removal + file-authoritative UCM rework a true *prerequisite*, or could a smaller seam deliver the comparison sooner?) Where is it **under-built**?
- Is there a smaller **core** that delivers a usable 3-era comparison fastest, deferring the rest?

## Output (concise; conceptual, ranked — not line-by-line)
1. **Q1 verdict** — valid as designed? Biggest validity threat in one paragraph; the concrete comparison set you'd run instead/additionally.
2. **Q2 verdict** — is there a materially simpler architecture worth reopening a locked decision for? If yes: the alternative + why it's compelling + what it costs. If no: say so plainly and why.
3. **Top 3 changes you'd make**, ranked, one sentence each.
4. **Blind-spot check** — anything a code-grounded correctness review would miss *by construction* that you'd want the Captain to see.

Do not implement. No expensive/LLM tests. Prefer reasoning over file dumps.
