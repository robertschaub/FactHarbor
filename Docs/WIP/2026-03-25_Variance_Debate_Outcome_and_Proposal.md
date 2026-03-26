# Variance Debate Outcome — Proposal for Per-Claim Evidence Direction Floor

**Date:** 2026-03-25
**Role:** Lead Architect
**Method:** Structured LLM debate (Advocate vs Challenger), reconciled by architect
**Status:** CLOSED (2026-03-26) — experimental branch QLT-4 was implemented, tested, closed, and removed from the codebase. Preflight verification found the targeted root cause (per-claim direction scarcity) does not exist in practice. Plastik EN per-claim evidence is already directionally balanced (ratio 0.62, 21 minority items). Remaining variance is content/quality-driven. No experimental code remains in the active codebase. See `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Preflight_Verification.md` and `Docs/AGENTS/Handoffs/2026-03-26_Senior_Developer_QLT4_Code_Revert.md`. The proposal below is preserved as historical design context only.

---

## 1. Debate Outcome

A structured debate was conducted between an advocate position (stay in monitor mode) and a challenger position (implement a narrowly scoped intervention). Both positions were grounded in the investigation data from `2026-03-25_Controllable_Variance_Investigation.md`.

**Verdict: The challenger identified the right intervention, but the advocate is right about process.**

The per-claim evidence direction floor is technically sound, narrowly scoped, and infrastructure-supported. But EVD-1 was approved the same day with explicit Captain decisions that amber items should be monitored, not actioned. Implementing immediately would undermine the policy on the day it was signed.

**Resolution: Propose the intervention as an explicitly approved next track (QLT-4), not as an extension of the completed stabilization wave.**

---

## 2. What the Debate Established

### Agreed by both sides:
- The 50pp per-claim swing on Plastik EN environmental claim is the dominant remaining quality signal
- Evidence direction ratio is the mechanism connecting search-result variance to verdict variance
- The existing contrarian retrieval infrastructure (article-level) already addresses the right problem at the wrong granularity
- Self-consistency and clustering temperature tuning are NOT the right levers
- Bolsonaro's stability proves that evidence direction consistency → verdict stability

### Contested and resolved:
| Question | Advocate | Challenger | Resolution |
|----------|----------|------------|------------|
| Is 50pp per-claim swing acceptable? | "Genuine contestability" | "Search-result lottery + contestability" | **Challenger is right** — ~20pp is contestability, ~30pp is search luck. The distinction matters. |
| Does EVD-1 allow action? | "Amber = monitor, not act" | "Persistent amber + completed investigation → action" | **Advocate is right on process** — policy was just approved. But the challenger's escalation logic is sound for the next review cycle. |
| Is the intervention risky? | "Artificial balance on one-sided topics" | "Floor, not target; doesn't affect one-sided topics" | **Challenger is right** — a floor of 3 minority items out of 8+ total is not forced balance. Flat Earth and Bolsonaro would be unaffected. |
| Is Alpha the right time? | "Wait for Beta" | "Alpha is cheapest" | **Challenger is right** — but the advocate's process point stands. Propose now, approve explicitly, implement after approval. |

---

## 3. Proposed Intervention: QLT-4 — Per-Claim Evidence Direction Floor

### What it does:
After the main research loop completes, check evidence direction balance **per claim** (not just article-level). If any claim has fewer than N minority-direction items (configurable, default: 3) out of M+ total directional items (default: 8), trigger 1-2 targeted contrarian queries for that specific claim.

### Why it works:
- The mechanism (evidence direction consistency → verdict stability) is empirically proven by Bolsonaro
- The infrastructure (assessEvidenceBalance, contrarian retrieval, contradiction budget) already exists
- The gap is precisely scoped: article-level → per-claim granularity

### What it changes:
| Component | Change |
|-----------|--------|
| `research-extraction-stage.ts` | New `assessPerClaimEvidenceBalance()` wrapping existing function with per-claim filtering |
| `claimboundary-pipeline.ts` | Per-claim balance check after existing article-level C13 check |
| `config-schemas.ts` + `pipeline.default.json` | New UCM parameter `perClaimMinMinorityItems` (default: 3, set 0 to disable) |

### What it does NOT change:
- No temperature changes
- No clustering changes
- No verdict logic changes
- No new LLM call types (uses existing contrarian research iteration)
- No changes to article-level balance check (continues as-is)

### Safety:
- **UCM-reversible**: Set `perClaimMinMinorityItems=0` to fully disable without code deployment
- **Cost**: 2-4 additional search queries per run only on claims with extreme directional skew (~$0.02-0.04)
- **One-sided topics unaffected**: Flat Earth collects 90+ items; a floor of 3 is negligible against that volume

### Validation plan:
1. 5× `Plastic recycling is pointless` — measure environmental claim spread
2. 3× `Ist die Erde flach?` — confirm no regression on Class A control
3. 3× Bolsonaro proceedings — confirm no regression on Class E
4. **Success**: Environmental claim spread drops from 47pp to ≤35pp (EVD-1 Class C green threshold)
5. **Failure signal**: Any control regression OR no measurable improvement → revert via UCM

### Estimated effort:
- Implementation: ~2-3 hours (3 files, extending existing patterns)
- Validation: ~1-2 hours (11 jobs, automated collection)
- Total: Half a day including review

---

## 4. Recommended Plan

| Step | Action | Owner | Gate |
|------|--------|-------|------|
| 1 | **Captain reviews this proposal** | Captain | Approve / reject / modify |
| 2 | If approved: implement QLT-4 as a single commit | Senior Developer | Tests + build pass |
| 3 | Run validation batch (11 jobs per Section 3) | Senior Developer | Results meet success criteria |
| 4 | If success: update EVD-1 family status table | Lead Architect | Plastik EN per-claim moves from amber to green |
| 5 | If failure: revert via UCM (`perClaimMinMinorityItems=0`) | Senior Developer | No code deployment needed |
| 6 | Monitor in next validation round | Per EVD-1 policy | Standard green/amber/red assessment |

---

## 5. What Happens If Captain Rejects

If the Captain decides to stay in pure monitor mode:
- The current system continues to operate within EVD-1 amber bands
- No implementation work occurs
- Plastik EN per-claim environmental spread remains at ~47pp (amber)
- The proposal remains on file for future consideration (e.g., before Beta)
- No harm is done — the system is analytically correct, just variably confident

**Both outcomes are defensible.** The proposal exists to give the Captain a concrete, scoped option rather than an open-ended "maybe someday."

---

*Based on structured LLM debate with advocate and challenger positions, grounded in investigation data from 12+ repeated-run jobs and full pipeline code inspection.*
