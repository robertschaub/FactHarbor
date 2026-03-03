# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-03
**Status**: WIP Consolidation #5 complete. Archived 3 files (deployment strategy, UCM defaults, quality regression). 9 active files remain. Primary track: VPS operational; quality stabilization deployed; next focus is evidence quality features and cost reduction.

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** VPS deployment operational (`app.factharbor.ch` + `test.factharbor.ch`). Pre-release live. Quality P0 fixes deployed. Next: evidence quality features, cost optimization, model auto-resolution completion.

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents

### 1. Evidence Quality & Consistency (3 files)

#### Multi-Source Evidence Retrieval Plan v2.1 (2026-02-24)
**Status:** 🔧 In Progress — Provider layer complete, pipeline integration pending (~60% done)
- **Document:** [Multi-Source_Evidence_Retrieval_Plan.md](Multi-Source_Evidence_Retrieval_Plan.md)
- **Scope:** Wikipedia, Semantic Scholar, Google Fact Check Tools API.
- **Next Step:** Phase 3.2-3.6: Google Fact Check pipeline integration (seeding + dedup).

#### Inverse Claim Asymmetry Plan (2026-02-27)
**Status:** 🔧 Mostly Done — Phases 0-2 DONE, Phase 3 partially started
- **Document:** [2026-02-27_Inverse_Claim_Asymmetry_Plan.md](2026-02-27_Inverse_Claim_Asymmetry_Plan.md)
- **Scope:** Symmetry audit, complementarity error metrics, integrity gating (Safe Downgrade).
- **Next Step:** Phase 3: Validate German pair re-run, confirm CI rollout posture (warn vs fail).

#### Claim Strength Preservation Study (2026-03-01)
**Status:** 🔬 Investigation — Not started
- **Document:** [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)
- **Scope:** Stage 1 weakens claim assertions (30-43pp variance). Pre-evidence claim extraction issue.
- **Next Step:** Phase A parallel investigation (multi-agent: LLM Expert, Senior Dev, Lead Architect).

---

### 2. Alpha Strategy & Architecture (3 files)

#### Alpha Phase Acceleration & Observability Plan (2026-02-25)
**Status:** ✅ Phase 1 DONE (instrumentation). Phase 1.2 IN PROGRESS (model auto-resolution). Phases 1.5-1.6 deferred post-deployment.
- **Document:** [Alpha_Phase_Acceleration_Plan_2026-02-25.md](Alpha_Phase_Acceleration_Plan_2026-02-25.md)
- **Next Step:** Finish model auto-resolution integration (Step 1.2).

#### Model Auto-Resolution Plan (2026-02-23)
**Status:** 🔧 In Progress — Resolver implemented, full consumer wiring pending
- **Document:** [Model_Auto_Resolution_Plan.md](Model_Auto_Resolution_Plan.md)
- **Next Step:** Replace hardcoded model IDs in `src/` with `resolveModel()` calls. Config validation update.

#### Multi-Agent Cross-Provider Debate (2026-02-27)
**Status:** 🧭 Proposal — Awaiting Prioritization (prerequisite: self-consistency baseline experiment)
- **Document:** [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md)

---

### 3. Backlog Proposals (3 files)

#### API Cost Reduction Strategy (2026-02-13)
**Status:** 🧭 Proposal — Key items: Batch API, NPO/OSS credits
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Next Step:** NPO credit applications (highest ROI).

#### Test/Tuning Mode Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)

#### Test/Tuning UI Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)

---

## Cleanup History

| Date | Action | Files |
|------|--------|-------|
| 2026-03-03 | **Consolidation #5**: Archived 3 files (deployment strategy done, UCM defaults done, quality P0 done). Moved LinkedIn Article to Marketing. Extracted P1/P2 to Backlog. 13→9 files. | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-03-02 | **Consolidation #4**: Archived 4 files (pre-release readiness Steps 0-12 done, dynamic pipeline removal done, UI texts done, calibration cost policy done). 14→10 files. | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-03-01 | **Consolidation #3**: Archived 11 files (invite code, quality investigations, fidelity, runtime issues). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-23 | **Consolidation #2**: Archived 5 files (framing-symmetry v3, debate analysis, execution plans). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-23 | **Consolidation #1**: Archived 8 files (CB architecture, cross-provider, quality map decisions, code reviews). | See `ARCHIVE/README_ARCHIVE.md` |
| 2026-02-22 | **Consolidation #0**: Archived 17 files (code reviews, quality map reviews, process docs). | See `ARCHIVE/README_ARCHIVE.md` |

---

## Guidelines

**WIP folder is for:**
- ✅ Active design proposals awaiting prioritization
- ✅ Future research / enhancement proposals
- ✅ Technical assessments for decision-making
- ✅ Active execution plans and decision records

**WIP folder is NOT for:**
- ❌ Completed work (move to ARCHIVE)
- ❌ Implementation tasks (add to Backlog.md)

**Consolidate WIP**: When requested by the Captain, agents follow the **Consolidate WIP Procedure** (§ "Consolidate WIP Procedure" in AGENTS.md).
