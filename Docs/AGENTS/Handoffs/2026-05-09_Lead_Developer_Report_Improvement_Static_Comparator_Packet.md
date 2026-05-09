---
### 2026-05-09 | Lead Developer + LLM Expert | Codex (GPT-5) | Report Improvement Static Comparator Packet

**Task:** Continue the active report-improvement plan on `main` by producing the required static comparator/root-cause packet before any further fix or live-job spending.

**Files touched:**
- `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md`
- `Docs/WIP/2026-05-08_DirectionBasis_Regression_Fix_Proposal.md`
- `Docs/AGENTS/Handoffs/2026-05-09_Lead_Developer_Report_Improvement_Static_Comparator_Packet.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** The packet identifies Stage 2 applicability/direction reliability as the strongest current root-cause hypothesis. The recent Bolsonaro failures preserve the expected three-AtomicClaim decomposition but are support-starved because concern/recusal/role-conflict material is admitted as direct contradiction evidence. The asylum failures find the decisive 235,057 current SEM aggregate, so their issue is calibration and stale/current direction handling rather than source discovery. The packet rejects another broad first-pass query increase because the prior `090a25c` attempt was reverted after cross-family regression.

**Open items:** Review the packet before editing. If approved, load `/debt-guard` before any code or prompt change, because this is failed-validation recovery. No live jobs were spent; the remaining report-improvement budget is still 9 jobs.

**Warnings:** Do not treat comparator reports as current validation. They are baselines for report-shape and quality judgment. Do not add deterministic semantic rules, domain keywords, or benchmark-specific prompt examples. Commit, restart/reseed, and use exact Captain-defined inputs before any future live job.

**For next agent:** Start from `Docs/WIP/2026-05-09_Report_Improvement_Static_Comparator_Packet.md`. It contains the target/comparator job table, four-source quality check, stage-separated diagnosis, rejected alternatives, minimal proposed change surface, validation sequence, and a Sonnet review prompt. The likely next step is a focused Sonnet Lead Architect + LLM Expert review, then one narrow Stage 2 LLM-mediated applicability/direction change only if that review agrees.

**Learnings:** Not appended. No stable reusable role learning beyond the existing plan guardrails.

---

### UCM Search Config Change — 2026-05-09 12:30 UTC

**What changed:** Search provider priority swapped as part of cost reduction Phase 1.

| Setting | Before | After |
|---|---|---|
| `serper.priority` | 2 | **1** (primary) |
| `googleCse.priority` | 1 | **2** (fallback) |
| `googleCse.dailyQuotaLimit` | 8000 | **100** (free tier) |

**Why:** Google Cloud billing was disabled for the FactHarbor project. Google CSE is now capped at 100 free queries/day. Serper ($1/1k queries) handles all primary search volume. Saving ~$130–170/Mo.

**Impact on report improvement work:**
- Search results may differ slightly (Serper vs Google CSE return different result sets)
- Any live validation jobs will now use Serper as the primary search provider
- The comparator baselines in the static packet were produced under the old config (Google CSE primary) — note this when comparing future job outputs
- After force-reseeding from JSON defaults, the active search DB row should be only a system-owned mirror of `apps/web/configs/search.default.json`, not a custom/admin override; future JSON default changes auto-refresh on restart

**Config version:** system default from `apps/web/configs/search.default.json`
