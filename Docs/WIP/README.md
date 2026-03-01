# FactHarbor Work In Progress (WIP)

**Last Updated**: 2026-03-01
**Status**: WIP Consolidation #3 complete. Archived 11 completed/superseded files. Active tracks: (1) Limited Public Pre-Release Readiness, (2) Multi-Source Retrieval integration, (3) Inverse Claim Asymmetry (Phase 3), (4) Model Auto-resolution (Phase 2 integration).

---

## Overview

This directory contains **active design proposals, execution plans, and future work items** for the Alpha phase.

**Forward direction:** POC declared complete (`v1.0.0-poc`). The ClaimAssessmentBoundary pipeline v1.1 is operational with tiered access control (invite codes), wildcard search, and automated daily/lifetime quotas. 1113 tests passing. 

For completed work, historical documents, and reference materials, see:
- **[Docs/ARCHIVE/](../ARCHIVE/)** - Completed plans, reviews, and historical documentation
- **[Docs/STATUS/Backlog.md](../STATUS/Backlog.md)** - Consolidated backlog of pending development tasks

---

## Active Documents

### 1. Release Readiness & Operations (3 files)

#### Limited Public Pre-Release Readiness Plan (2026-03-01)
**Status:** 🚀 Active Execution — Steps 7, 9, 10, 11 COMPLETED
- **Document:** [2026-03-01_Limited_Public_PreRelease_Readiness_Plan.md](2026-03-01_Limited_Public_PreRelease_Readiness_Plan.md)
- **Scope:** Hardening, security (SSRF), rate limiting, admin auth, invite code management UI, EF migrations.
- **Next Step:** Step 1 (SSRF Hardening)

#### Invite Code & Access Control Plan (2026-02-28)
**Status:** ✅ Core implemented / Hardening in progress
- **Document:** [2026-02-28_Invite_Code_Architecture_Plan.md](2026-02-28_Invite_Code_Architecture_Plan.md)
- **Scope:** Tiered access (guest search/view vs invite submission), daily/lifetime quotas.

---

### 2. Evidence Quality & Consistency (2 files)

#### Multi-Source Evidence Retrieval Plan v2.1 (2026-02-24)
**Status:** 🔧 In Progress — Provider layer complete, pipeline integration pending
- **Document:** [Multi-Source_Evidence_Retrieval_Plan.md](Multi-Source_Evidence_Retrieval_Plan.md)
- **Scope:** Add Wikipedia, Semantic Scholar, and Google Fact Check Tools API. 
- **Next Step:** Phase 3: Google Fact Check pipeline integration (seeding + dedup).

#### Inverse Claim Asymmetry Plan (2026-02-27)
**Status:** 🔧 In Progress — Phase 0-2 DONE
- **Document:** [2026-02-27_Inverse_Claim_Asymmetry_Plan.md](2026-02-27_Inverse_Claim_Asymmetry_Plan.md)
- **Scope:** Symmetry audit, complementarity error metrics, integrity gating (Safe Downgrade).
- **Next Step:** Phase 3: Calibration automated gate (CI enforcement).

#### Claim Strength Preservation Study (2026-03-01) — NEW
**Status:** 🔬 Investigation — Multi-agent study required
- **Document:** [2026-03-01_Claim_Strength_Preservation_Study.md](2026-03-01_Claim_Strength_Preservation_Study.md)
- **Scope:** Stage 1 silently weakens claim assertions (e.g., "bedingt" → "Komponente"), causing 30-43pp variance for near-identical inputs. Distinct from ICA Plan (post-verdict integrity); this is pre-evidence claim extraction.
- **Next Step:** Phase A parallel investigation (A1: Linguistic analysis, A2: Evidence audit, A3: Broader fidelity audit).

---

### 3. Alpha Strategy & Architecture (3 files)

#### Alpha Phase Acceleration & Observability Plan (2026-02-25)
**Status:** 🧭 In Progress
- **Document:** [Alpha_Phase_Acceleration_Plan_2026-02-25.md](Alpha_Phase_Acceleration_Plan_2026-02-25.md)
- **Scope:** Instrumentation (understand/research/cluster/verdict/aggregate), Model Auto-resolution.
- **Next Step:** Verify instrumentation via `metrics.json` + finish Step 1.2 (integration).

#### Model Auto-Resolution Plan (2026-02-23)
**Status:** 🔧 In Progress — Resolver implemented, integration pending
- **Document:** [Model_Auto_Resolution_Plan.md](Model_Auto_Resolution_Plan.md)
- **Next Step:** Replace hardcoded model IDs in `src/` with `resolveModel()` calls.

#### Multi-Agent Cross-Provider Debate (2026-02-27)
**Status:** 🧭 Proposal — Awaiting Prioritization
- **Document:** [Multi_Agent_Cross_Provider_Debate_2026-02-27.md](Multi_Agent_Cross_Provider_Debate_2026-02-27.md)

---

### 4. Backlog Proposals (4 files)

#### API Cost Reduction Strategy (2026-02-13)
**Status:** 🧭 Proposal — Awaiting Implementation
- **Document:** [API_Cost_Reduction_Strategy_2026-02-13.md](API_Cost_Reduction_Strategy_2026-02-13.md)
- **Next Step:** Prompt Caching / Batch API pilot.

#### Test/Tuning Mode Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_Mode_Design_2026-02-17.md](TestTuning_Mode_Design_2026-02-17.md)

#### Test/Tuning UI Design (2026-02-17)
**Status:** 🧭 Proposal — Pending Approval
- **Document:** [TestTuning_UI_Design_2026-02-17.md](TestTuning_UI_Design_2026-02-17.md)

#### Calibration Cost Optimization Review Plan (2026-02-22)
**Status:** 🧭 Proposal — Awaiting review
- **Document:** [Calibration_Cost_Optimization_Review_Plan_2026-02-22.md](Calibration_Cost_Optimization_Review_Plan_2026-02-22.md)

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
