---
title: Phase 2 Gate G2 — Captain Deputy Review
date: 2026-04-11
reviewer: Captain Deputy (acting on behalf of the Captain/user)
parent: Docs/WIP/2026-04-11_Phase2_Gate_G2_Replay_Plan.md
status: Review complete — Gate G2 Rev 3 re-scope pending user direction
verdict: MODIFY-THEN-PROCEED
---

# Captain Deputy Review — Gate G2 Plan Rev 2

Received 2026-04-11. Complements the earlier LLM Expert technical review with cross-cutting strategic concerns.

## Verdict

**MODIFY-THEN-PROCEED.** The G2 package is serious and mostly disciplined but has grown beyond "Historical Baseline Map" into a partly pre-decided Phase 3/4 package, and it is larger than necessary to answer the Captain's immediate Apr 10 deterioration question.

## Key findings

### Master-plan drift is real and partly problematic
- Productive drift: adding measurement definitions, safety rails, and stop rules is legitimate Phase 2 work.
- **Problematic drift**: the G2 doc already says which logic should be kept, which should be deleted, and that a specific refactor is "queued for Phase 4". That's Phase 3/4 language bleeding into the G2 gate. Fair criticism.

### Gate discipline is formally preserved but substantively leaking
- Nothing has run. Formal gates intact.
- **G1 deferral is biting**: without user-set priorities, the plan had to cover "everything plausibly relevant" — 10 inputs, 5 commits, broad coverage. The breadth isn't ambition; it's a symptom of missing priorities.
- Implicit G3/G4 judgments already present in the refactor language.

### User-constraint compliance
- **Facts-only**: self-correcting (9cdc8889 correction caught me; LLM Expert caught commit-interval mislabeling). Process works but some summaries still outrun evidence.
- **No dirty fixes**: the Wave 1A safeguard committed "as-is" before replay is exactly the kind of workaround that violates this — it changes measurement semantics vs. the 4 R2 baseline jobs.
- **No deterministic manipulation**: direction respected, but the refactor SCOPE is narrower than the real scope (LLM Expert identified the full scope; Lead Architect's original line was partial).
- **Matrix improvement deferred implicitly** — should be explicit.
- **Multi-agent debate**: "arguably over-met". Steering-question load is rising.

### Opportunity cost
Replay vs momentum. The team has produced substantial planning and review output but no replay data yet. The current G2 is strongest for Phase 3's Change Impact Ledger, weaker for the Captain's immediate question "did yesterday's wave worsen reports overall, and where?". The plan under-discusses the counterfactual.

### Minimum viable version (Captain Deputy's recommendation)
Compare **current state vs one pre-wave reference**, not five commits. Use only backward-anchored, high-signal inputs (R2, R3, R3b, R4) with R2 at higher replication. Answers the Captain's actual question; leaves forensic breadth for optional Phase 2B.

## Top three recommendations

1. **Re-scope G2 to answer the Apr 10 deterioration question first**, and explicitly label broader historical mapping as optional Phase 2B rather than bundling it into the first approval ask.

2. **Freeze all Phase 3/4 conclusions inside the G2 package to "strong priors" only**; do not let "keep/delete/refactor" language become de facto gate decisions before replay closes.

3. **Force one small priority decision from the Captain now**, even if G1 stays deferred: whether this effort is primarily for forensic attribution or for fastest path to restored report quality.

## Questions for the Captain

1. Immediate goal: **what changed in the Apr 8–10 wave**, or **best historical baseline overall**? Different scopes, shouldn't share one approval packet.
2. Optimize for **fast answer** or **full ledger-quality evidence**?
3. Willing to name **3 priority criteria** now as a mini-G1 substitute, so the replay doesn't have to be broad by default?
4. Should the replay be **strictly apples-to-apples** with the historical baseline behavior — no Wave 1A safeguard commit in the replay path unless separately approved?
5. Should matrix-coloring improvement be **explicitly deferred** outside G2, or carried in parallel?

## Lead Architect's response

See next turn in the conversation. Summary: agree with most findings; will produce Gate G2 Rev 3 in three possible shapes (A minimum-viable / B narrow-attribution / C full forensics) and ask the Captain to pick forensic-vs-fast before drafting Rev 3 concretely.
