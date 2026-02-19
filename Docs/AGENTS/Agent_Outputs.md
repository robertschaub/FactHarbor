# Agent Outputs Log

Rolling log of agent task completions. Most recent entries at top.
Agents: append your output below this header using the unified template from AGENTS.md § Agent Exchange Protocol.

Archived entries are moved to `Docs/ARCHIVE/` during Consolidate WIP.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Code Review Fixes — Wave 2C (xWiki targeted fixes)
**Task:** Implement D-M1, D-M3, D-M4, D-L3 from Code_Review_23h_2026-02-19.md (Area 5: Documentation).
**Files touched:**
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/Core Data Model ERD/WebHome.xwiki`
**Key decisions:**
- D-M1: Changed "3 variants" to "2 variants" in Project Status table (Orchestrated removed, Canonical removed — CB + Monolithic Dynamic remain).
- D-L3: Changed "POC | Current" to "Alpha | Current" in Project Status table. The formerly "Alpha | Planned" row renamed to "Alpha+ | Planned" to avoid duplicate phase labels after the fix.
- D-M3: Changed "EvidenceScope (mandatory)" to "EvidenceScope (optional)" in Key Implementation Notes. Verified against `types.ts` line 419: `evidenceScope?: EvidenceScope` — the `?` confirms optional.
- D-M4: Changed ERD cardinality `EVIDENCE_ITEM ||--|| EVIDENCE_SCOPE` to `EVIDENCE_ITEM |o--o| EVIDENCE_SCOPE` (zero-or-one on both sides, matching the optional field in types.ts).
**Open items:** None — all 4 fixes are targeted and self-contained.
**For next agent:** Wave 2C complete. XAR rebuild needed after all xWiki edits across all waves are done (Wave 4). Remaining documentation issues (D-C1, D-C2, D-H1 through D-H7) relate to Calculations.md — handled in Wave 1C.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Code Review Fixes — Wave 1C (Calculations.md rewrite)
**Task:** Rewrite Docs/ARCHITECTURE/Calculations.md to fix D-C1, D-C2, D-H1, D-H2, D-H3, D-H4, D-H5, D-H7, D-M5, D-M8, D-L1 from Code_Review_23h_2026-02-19.md
**Files touched:** `Docs/ARCHITECTURE/Calculations.md`
**Key decisions:** Verified all facts directly against source code before writing. Organized into 10 sections going deeper than the xWiki counterpart on code-level detail. Included actual `aggregateAssessment()` code from `claimboundary-pipeline.ts` for the weight formula. Added concrete numerical example for the 3-level aggregation. Noted the stale 60% comment in `truth-scale.ts` and `types.ts` vs the actual 40% threshold in `DEFAULT_MIXED_CONFIDENCE_THRESHOLD`. Kept the `truthFromBand` function section from the old doc (still accurate, not stale). Removed the Level 2 "Key Factors" and Level 3 "ClaimAssessmentBoundary Answers" sections entirely (D-C2); the CB pipeline goes directly from claim verdicts to weighted average. Preserved dependency handling and pseudoscience/benchmark guard sections (clearly labeled as Orchestrated-removed, which was already accurate in the old doc).
**Open items:** D-M2 (fix stale code comments in `truth-scale.ts:11-12` and `types.ts:67-68` saying 60% instead of 40%) is a separate task — those are source code comments, not doc changes. D-H6 (Political_Bias_Mitigation.md test count inconsistency) not in scope.
**Warnings:** The xWiki counterpart (`Calculations and Verdicts/WebHome.xwiki`) still shows ">= 60%" for MIXED confidence threshold in line 22 of the table — this is also stale (actual threshold is 40%). The xWiki page itself needs a targeted fix (Wave 2C). Also confirmed: `getClaimWeight()` in `aggregation.ts` handles contestation multipliers; `aggregateAssessment()` in `claimboundary-pipeline.ts` handles the full weight formula including triangulation and derivative factors — these are two separate steps, both in use.
**For next agent:** Wave 1C complete. Calculations.md is now CB-accurate. Wave 2C will handle xWiki targeted fixes (separate files).

---

### 2026-02-19 | Senior Developer | Claude Code (Sonnet 4.6) | Code Review Fixes — Wave 1B (Security: CI/CD + xwiki-viewer)
**Task:** Implement I-MH1, I-M2, I-L2 from Code_Review_23h_2026-02-19.md (Area 4: Infrastructure security fixes).
**Files touched:** `.github/workflows/deploy-docs.yml`, `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html`
**Key decisions:**
- I-MH1: Applied `env:` binding pattern — `ANALYTICS_URL: ${{ secrets.DOCS_ANALYTICS_URL }}` bound in `env:` block, all shell references changed from `${{ secrets.* }}` to `$ANALYTICS_URL`. This is the only secret in shell `run:` blocks in this file.
- I-M2: Used `escAttr(d.p)` for the JS onclick string (handles backslash + single-quote escaping correctly for JS string context) and `esc(d.p)` for `title` attribute and text content. Both `esc()` and `escAttr()` were already defined in the file (lines 2073-2074).
- I-L2: Wrapped `typeLabel` and `sizeKB` with existing `esc()` function in the github-files table row template. Practically unexploitable (derived from file extensions/sizes) but consistent with the file's XSS defense pattern.
**Open items:** Remaining code review findings (46 total, 43 not yet addressed). Next priority items per the review: R-C1 (XSS in fallback HTML export, `page.tsx`), R-H1 (`verdictFromPct` MIXED/UNVERIFIED inconsistency), R-H3 (`javascript:` URI protection), P-H3 (`as any` cast).
**Warnings:** The `esc()` function in xwiki-viewer.html does NOT escape single quotes (only `&`, `<`, `>`, `"`). This is intentional — single-quote context is handled by `escAttr()`. Do not replace `escAttr()` calls with `esc()` in JS string attribute contexts. The analytics overlay (`loadAnalytics()`) uses `escAttr()` for the onclick JS string — this is correct and more thorough than the previous manual `d.p.replace(/'/g,"'")` which missed backslash escaping.
**For next agent:** Wave 1B complete. These two files are not touched by any other Wave. Next wave should address `page.tsx` (R-C1, R-H3) and `generateHtmlReport.ts` (R-H1, R-H2, R-H3, R-L1, R-L2) and `verdict-stage.ts` (P-H3).

### 2026-02-19 | Code Reviewer + Senior Developer | Claude Opus 4.6 | Comprehensive 23-Hour Code Review
**Task:** Review all source code, UCM configurations, and documentation changed in the last 23 hours (~40 commits, Feb 18-19). Identify issues, propose fixes, document findings.
**Files touched:** `Docs/WIP/Code_Review_23h_2026-02-19.md` (created — 46-finding review report), `Docs/WIP/README.md` (updated).
**Key decisions:** Used 5 parallel review agents (pipeline, UCM, UI/reports, infrastructure, docs) for comprehensive coverage. Classified 5 systematic patterns. Provided model-tier-aware fix priority matrix.
**Open items:** All 46 fixes pending implementation. Top priorities: XSS in fallback export (R-C1), verdict label inconsistency (R-H1), CI/CD injection (I-MH1), Calculations.md rewrite (D-C1/C2).
**Warnings:** `Calculations.md` is ~60% stale (Orchestrated content). Default JSON files have drifted from code defaults (11 orphaned fields, value mismatches). MIXED/UNVERIFIED distinction inconsistently applied across UI, reports, and code comments.
**For next agent:** Full report at `Docs/WIP/Code_Review_23h_2026-02-19.md` with fix priority table and model tier recommendations per work package. Immediate fixes are small-effort Sonnet-tier tasks. `Calculations.md` rewrite is a Tech Writer task using xWiki `Calculations and Verdicts/WebHome.xwiki` as the accurate reference.

---

### 2026-02-19 | Lead Architect | Claude Opus 4.6 | Political Bias Mitigation — Stammbach/Ash Low-Hanging Fruits
**Task:** Investigate and implement low-hanging fruits from Stammbach/Ash EMNLP 2024 paper analysis (19 concerns, 6 recommendations).
**Files touched:** `verdict-stage.ts`, `claimboundary-pipeline.ts`, `config-schemas.ts`, `types.ts` + 2 test files (+616 lines, 24 new tests).
**Key decisions:** Harm confidence floor as standalone function (not modify validateVerdicts); debate tiers limited to haiku/sonnet (LLMCallFn constraint); evidence balance uses majority-ratio to avoid FP issues; CalcConfig now loaded at pipeline start.
**Open items:** Action 2 (calibration harness, ~$5-10 LLM cost) deferred. Full provider separation for challenger model deferred (requires LLMCallFn extension).
**For next agent:** WIP doc at `Docs/WIP/Political_Bias_Mitigation_2026-02-19.md` has review checklist. All 6 new UCM params default to no-behavior-change. 877 tests green.

---

### 2026-02-19 | Lead Architect | Claude Opus 4.6 | xWiki CB Pipeline Documentation Update
**Task:** Update 15 xWiki architecture/diagram pages to reflect ClaimAssessmentBoundary pipeline (v2.11.0+). Full rewrites of 3 foundation ERDs + Entity Views, expanded Quality Gates Flow, fixed CB Pipeline Detail verdict steps, corrected stale orchestrated.ts references across 5 additional pages.
**See:** `Docs/AGENTS/Handoffs/2026-02-19_Lead_Architect_xWiki_CB_Pipeline_Documentation_Update.md`

---

### 2026-02-19 | LLM Expert | Claude Opus 4.6 + Claude Sonnet 4.6 + GPT-5.3 Codex | Meeting Prep — Stammbach/Ash EMNLP 2024 + FactHarbor Bias Analysis
**Task:** Prepare comprehensive meeting document for Elliott Ash (ETH Zurich). Review EMNLP 2024 paper, survey Ash's full research portfolio (11 papers), analyze FactHarbor's bias mitigation posture with three independent AI reviewers, produce consolidated meeting-ready document.
**Files touched:** `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md` (created, iterated 8+ times, final consolidated version). Deleted after merge: `Sonnet_Review_Stammbach_Ash_Paper.md`, `GPT53_Review_Stammbach_Ash_Paper.md`, `GPT53_Review_Prompt.md`, `Docs/WIP/Paper_Review_*.md`.
**Key decisions:** Three-model independent review (Opus initial + Sonnet adversarial + Codex cross-model). 19 concerns identified (C1-C19). Codex's "measurement before redesign" principle adopted as strategic framing. Final doc condensed from 711 to 178 lines for meeting use.
**Open items:** Political bias calibration harness (Recommendation #1) — not yet implemented. Meeting outcome may inform priority.
**Warnings:** Document asserts FactHarbor strengths (evidence-first, contradiction search) but Codex correctly noted: "good process architecture ≠ demonstrated bias mitigation outcomes." All "mitigated" claims are design-intent, not measured.
**For next agent:** Single document at `Docs/Knowledge/Stammbach_Ash_LLM_Political_Alignment_EMNLP2024.md`. If implementing recommendations, start with #1 (calibration harness) and #2 (refusal telemetry) before architecture changes.
**Learnings:** Appended to Role_Learnings.md? Yes — see LLM Expert section.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3E — AnalysisContext Tier 4 Sweep
**Task:** Fix ~20 Tier 4 xWiki pages where Orchestrated pipeline terminology (AnalysisContext, KeyFactor, SubClaim, ContextAnswer) appeared implied as current.
**Files touched:** 17 xwiki-pages modified. Key files: `WebHome.xwiki` (root), `Specification/WebHome.xwiki`, `Specification/Automation/WebHome.xwiki`, `Requirements/WebHome.xwiki`, `Specification/Examples/WebHome.xwiki`, `Specification/Workflows/WebHome.xwiki`, `Specification/Implementation Status and Quality/WebHome.xwiki`, `DevOps/Guidelines/Coding Guidelines/WebHome.xwiki`, `DevOps/Subsystems and Components/LLM Configuration/WebHome.xwiki`, `Specification/AI Knowledge Extraction Layer (AKEL)/WebHome.xwiki` [in prior session], `Diagrams/WebHome.xwiki`, `Diagrams/Core Data Model ERD/WebHome.xwiki`, `Diagrams/KeyFactor Entity Model/WebHome.xwiki`, `Diagrams/Claim and Scenario Lifecycle (Overview)/WebHome.xwiki`, `Diagrams/Claim and Scenario Workflow/WebHome.xwiki`, `Diagrams/Analysis Entity Model ERD/WebHome.xwiki`, `Diagrams/Entity Views/WebHome.xwiki`, `Diagrams/LLM Abstraction Architecture/WebHome.xwiki`.
**Key decisions:** Two fix strategies used: (1) Surgical replacement — swap Orchestrated terms for CB equivalents in pages presenting current behavior; (2) Warning block — prepend `{{warning}}` STALE block to diagram/ERD pages that are entirely Orchestrated-era and too large to rewrite in scope. Pages correctly left as-is: POC pages, pages already marked historical, CB Pipeline Detail (hit was in "removed" column), Specification/Data Model (intentional target spec), Context Detection (already uses strikethrough). Data Model conflict verified: `bc29c4f` is NOT in git history for `Architecture/Data Model/WebHome.xwiki`; erDiagram shows pure Orchestrated entities; the Feb 18 Agent_Outputs "Major rewrite" claim was incorrect — this file is a genuine gap needing dedicated rewrite.
**Open items:** `Specification/Architecture/Data Model/WebHome.xwiki` — 6 hits, all Orchestrated entities presented as current architecture — needs dedicated rewrite (Captain decision on when/how). `Diagrams/Entity Views/WebHome.xwiki` and `Diagrams/Analysis Entity Model ERD/WebHome.xwiki` — `{{warning}}` blocks added but full ERD rewrites deferred.
**Warnings:** Entity Views is 825 lines with Orchestrated entities throughout all 5 views — the warning block marks it stale but the content is not yet updated to CB entities. Any reader using it for implementation guidance will see removed entities.
**For next agent:** Phase 3E is committed. Phase 3F next: XAR rebuild (`python Docs/xwiki-pages/scripts/fulltree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar`). After that, the Captain needs to decide on `Architecture/Data Model` rewrite scope — it's the last significant Orchestrated holdout in the Specification section.
**Learnings:** Appended to Role_Learnings.md? No (pattern learnings already captured in prior Phase 3 sessions).

---

### 2026-02-19 | Senior Developer | Codex (GPT-5) | Pass2 Soft-Refusal Recovery Hardening
**Task:** Investigate and fix recurring ClaimBoundary Stage 1 Pass 2 failures for German input (`Die SRG hat einen "Rechtsdrall"`), without masking report-quality risks.
**Files touched:** `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, `apps/web/prompts/claimboundary.prompt.md`.
**Key decisions:** Restored and completed model fallback flow (verdict-tier → understand-tier on total soft refusal), enforced the same Pass2 quality gate on fallback output (no silent acceptance), and surfaced soft-refusal/fallback recovery as `analysisWarnings` (`structured_output_failure`) via pipeline state warnings.
**Open items:** Fallback path did not trigger in the latest live run (retry guidance recovered before fallback). Need additional production observations to confirm fallback activation frequency and quality impact.
**Warnings:** Live run succeeded but still produced a soft-refusal warning and Gate 1 rescue logs; this indicates partial robustness improvement, not full elimination of model caution behavior. Direct local function runs emit metrics persistence 404 because no API job row exists.
**For next agent:** If soft refusals remain frequent in production, add telemetry rollup for `stage1_pass2` warning details (`model`, `attempt`, `degradedPath`) and evaluate whether retry count should be UCM-configurable.
**Learnings:** Appended to Role_Learnings.md? No.

---

### 2026-02-19 | LLM Expert + Senior Developer | Claude Code (Sonnet 4.6) + Claude Opus 4.6 | Pass 2 Schema Validation & Soft Refusal Fix
**Task:** Fix Stage 1 Pass 2 failures — schema validation (`NoObjectGeneratedError`) and content-policy soft refusal for politically sensitive inputs.
**Files touched:** `claimboundary-pipeline.ts` (commits `f397244`, `b8a1477`), `types.ts` (earlier session).
**Key decisions:** `.catch()` defaults on all Pass2 schema fields (JSON Schema unchanged), quality gate with empty-field detection, total refusal detection with fact-checking retry framing, model fallback approach (stashed, not committed).
**Open items:** Sonnet still soft-refuses for "Die SRG hat einen Rechtsdrall" even with fact-checking framing in user message. Model fallback to Haiku (stashed, `git stash pop`) and/or system prompt change needed.
**Warnings:** Stashed code not build-verified. The assistant+user exchange pattern was tried and reverted (untested with tool calling). User message fact-checking framing carries insufficient weight to override content policy.
**For next agent:** See full handoff at `Docs/AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Pass2_Soft_Refusal.md`. Entry point: `runPass2()` in `claimboundary-pipeline.ts` ~line 918. Quick test: submit "Die SRG hat einen 'Rechtsdrall'" via ClaimBoundary pipeline.
**Learnings:** Appended to Role_Learnings.md? Yes — see below.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3D — CB terminology sweep + AKEL Pipeline §1 fix
**Task:** Fix AKEL Pipeline §1 step-by-step (Orchestrated 5-step → CB 5-stage), fix terminology/schema pages with AnalysisContext as primary/current term, assess Data Model pages.
**Files touched:** AKEL Pipeline, Terminology Catalog, LLM Schema Mapping, Provider-Specific Formatting, FAQ (xwiki) — commit `3fbac41`. Also staged the Orchestrated Pipeline Detail deletion (left uncommitted from Phase 3B).
**Key decisions:**
- AKEL Pipeline §1: replaced "Step 1: Understand ... Step 5: Report" with CB stages (`extractClaims → researchEvidence → clusterBoundaries → generateVerdicts → aggregateAssessment`); updated intro line.
- Terminology Catalog: fixed §4 contestation weights (0.3x/0.5x → 0.5x/0.7x per v3.1); replaced entire legacy "Terminology Mapping Tables" bottom section (~270 lines) with CB-accurate equivalent — Table 1 shows ClaimAssessmentBoundary as primary entity (AnalysisContext in "Formerly" column), Table 2 uses claimBoundaryId, CTX_* constants removed, Quick Reference code uses CB types, Pipeline Stage Functions replaces Orchestrated task names, Validation Checklist and FAQ use CB terminology.
- LLM Schema Mapping: added `{{warning}}` banner marking as Orchestrated-era historical reference; replaced Master Mapping Table with CB entities (AtomicClaim, ClaimAssessmentBoundary, CBClaimVerdict); added `{{warning}}` before phase sections; updated Terminology Bridges to show ClaimAssessmentBoundary as primary; fixed contestation weights; updated Pitfalls and Testing Checklist.
- Provider-Specific Formatting: added testing-harness note (`prompt-builder.ts` is not production); removed Orchestrated task types from list (understand, context_refinement, orchestrated_understand); updated Anthropic strengths, base prompts list, provider matrix ("AnalysisContext Detection" → "Boundary Clustering").
- FAQ: Q3 updated to "ClaimAssessmentBoundaries", Q7 workflow steps updated to CB stages, Q10 "Multiple AnalysisContexts" → "Multiple ClaimAssessmentBoundaries".
- Data Model assessment: Architecture Data Model (`/Specification/Architecture/Data Model/`) is entirely Orchestrated-era entities (SubClaim, AnalysisContext, KeyFactor, ContextAnswer). Needs full CB-entity rewrite — flagged for Phase 3E or dedicated phase. Target Data Model (`/Specification/Data Model/`) AnalysisContext references are intentional future PostgreSQL design specs — left as-is.
**Open items:** Phase 3E (~20 Tier 4 batch files, 1-2 hits each); Phase 3F (XAR rebuild after 3E commits); Architecture Data Model full rewrite (Orchestrated entities → CB entities). Captain-level decision pending: Architecture Data Model is a major page — include in 3E or separate dedicated phase?
**Warnings:** Architecture Data Model is the most stale page in the xwiki tree — it still shows SubClaim, AnalysisContext, ContextAnswer, ClaimUnderstanding as if they're current entities. Readers following links from the Architecture overview to this page will see completely wrong entity model. High-value catch.
**For next agent:** Phase 3E scope: ~20 Tier 4 files with 1-2 AnalysisContext/orchestrated hits each. Only fix where Orchestrated pipeline is implied to be current — skip POC pages, `_sort` metadata, confirmed-historical pages. Phase 3F: run `python Docs/xwiki-pages/scripts/fulltree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar` after 3E commits.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3C — Dead refs + Quality Gates + KeyFactors
**Task:** Fix `analysis-contexts.ts` dead refs (5 files), add Quality Gates + KeyFactors Design to this pass per Captain direction.
**Files touched:** Evidence Quality Filtering Pipeline, Pipeline Shared Primitives, AKEL Shared Modules (diagrams), AKEL Pipeline, Deep Dive Index, Quality Gates, KeyFactors Design, Prompt Architecture — commit `2667997`.
**Key decisions:**
- `analysis-contexts.ts` replaced with `claimboundary-pipeline.ts` (Stage 3: `clusterBoundaries`) in all diagram/table references.
- Quality Gates: Gate 1 now documents `quality-gates.ts` + `passedFidelity` LLM field + safety net (rescue highest-centrality claim if all would be filtered, `claimboundary-pipeline.ts:1247`). Gate 4 moved from `orchestrated.ts` to `quality-gates.ts`. Context scoping updated from `contextId` (Orchestrated) to boundary scoping (CB).
- KeyFactors Design: `{{warning}}` banner added (Orchestrated-era, superseded by ClaimAssessmentBoundary). Contestation weights updated from 0.3x/0.5x → 0.5x/0.7x (v3.1).
- Prompt Architecture: Deduplicated Pipeline Variants link in §11.
**Open items:** Phase 3D (6 terminology/schema pages), 3E (~20 Tier 4 batch), 3F (XAR rebuild).
**Warnings:** AKEL Pipeline §1 still describes "5-step pipeline" as "Understand/Research/Verdict/Summary/Report" (Orchestrated era). CB stages are extract/research/cluster/verdict/aggregate. Consider updating §1 step-by-step description in Phase 3D.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3B — xWiki Tier 1 Rewrites Complete
**Task:** Rewrite the 3 Tier 1 xWiki pages (Direction Semantics, Calculations and Verdicts, Prompt Architecture) for the CB pipeline, and archive the Orchestrated Pipeline Detail diagram.
**Files touched:**
- `Docs/xwiki-pages-ARCHIVE/.../Diagrams/Orchestrated Pipeline Detail/WebHome.xwiki` (archived)
- `Docs/xwiki-pages/.../Deep Dive/Direction Semantics/WebHome.xwiki` (major rewrite — commit `b4b26d4`)
- `Docs/xwiki-pages/.../Deep Dive/Calculations and Verdicts/WebHome.xwiki` (major rewrite — commit `a39f24d`)
- `Docs/xwiki-pages/.../Deep Dive/Prompt Architecture/WebHome.xwiki` (major rewrite — commit `6cf5336`)
**Key decisions:**
- CB aggregation hierarchy is 3-level (not 4): Evidence Items → AtomicClaim Verdicts (Stage 4 LLM debate) → Weighted Average → Overall Verdict. No "Key Factor" or "AnalysisContext" intermediate layers.
- `aggregateAssessment()` (claimboundary-pipeline.ts:2789) weight formula: `centralityWeight × harmWeight × confidenceFactor × (1 + triangulationFactor) × derivativeFactor`
- `dedupeWeightedAverageTruth()` and `validateContestation()` do NOT exist in CB. Dedup happens upstream via CLAIM_EXTRACTION_PASS2 LLM call.
- Contestation is now weight-multiplier based (0.5x/0.7x), NOT point-deduction (-12/-8). Changed in v2.9.0.
- Pseudoscience Escalation and Benchmark Guard: Orchestrated-only, not in CB. Added `{{warning}}` blocks to both.
- Prompt Architecture: CB has 13 sections (see table in updated page). Advocate/Challenger/Reconciliation debate is Stage 4 core pattern.
**Open items:** Phase 3C (5 analysis-contexts.ts fixes), 3D (6 schema/terminology pages), 3E (~20 Tier 4 batch), 3F (XAR rebuild). Captain decision pending on lost claim fidelity changes.
**Warnings:**
- §4 Near-Duplicate Claim Handling in Calculations page now explains that CLAIM_EXTRACTION_PASS2 handles dedup upstream — verify this is accurate if CB dedup behavior changes.
- Triangulation and derivative factors in `aggregateAssessment` (lines 2808-2863) are not fully documented in these pages — they exist and affect weights but are currently only briefly noted in §3.1 table.
**Learnings:** Appended to Role_Learnings.md? No — CB aggregation structure discoveries already implicit in the rewritten pages; no new gotchas beyond what's in the code.

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3A xWiki Triage + Phase 2C ARCHITECTURE edits + Phase 2D WIP audit
**Task:** (A) Phase 2C: Update 3 ARCHITECTURE/ .md files for v2.11.0 (orchestrated refs, new CB pipeline refs). (B) Phase 2D targeted WIP audit: 3 files checked; flagged uncommitted claim fidelity gap fixes. (C) Phase 3A: Grep scan all xWiki pages, produce prioritised work plan.
**Files touched:** `Docs/ARCHITECTURE/Calculations.md`, `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md`, `Docs/ARCHITECTURE/Prompt_Architecture.md`, `Docs/WIP/README.md` (claim fidelity status), `Docs/AGENTS/Handoffs/2026-02-19_Technical_Writer_Phase3A_xWiki_Triage.md` (created).
**Key decisions:** Phase 3A triage complete — see handoff. Commits: `0945e3f` (arch), `73a53df` (wip). **IMPORTANT**: LLM Expert claim fidelity gap fixes (3 prompt changes + Gate 1 safety net) and Phase 3 evidence compression code are NOT committed — flagged in WIP README.
**Open items:** Phase 3B (Tier 1 xWiki rewrites: Direction Semantics, Calculations and Verdicts, Prompt Architecture + archive Orchestrated Pipeline Detail diagram), Phase 3C–3F.
**For next agent:** See `Docs/AGENTS/Handoffs/2026-02-19_Technical_Writer_Phase3A_xWiki_Triage.md` for full triage with file-by-file priority. Start with 3B: archive the Orchestrated Pipeline Detail diagram, then rewrite Direction Semantics (21 orchestrated hits, CB equivalents documented in handoff).

---

### 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Documentation Cleanup — Historical Content Archival

**Task:** Archive all historical `.md` and `.xwiki` content that does not document current implementation, future plans, or retained decisions. Split mixed pages.

**Files touched:** 4 archive files created, 5 live files modified/deleted, 1 directory deleted. See full details in [Handoffs/2026-02-19_Technical_Writer_Documentation_Cleanup.md](Handoffs/2026-02-19_Technical_Writer_Documentation_Cleanup.md).

**Key decisions:** Orchestrated Pipeline xwiki archived (pipeline removed v2.11.0). Pipeline Variants page rewritten for CB as default. Current_Status.md split at 2026-02-13 boundary. 18 WIP files all retained (confirmed active). All ARCHITECTURE/, AGENTS/, USER_GUIDES/ retained.

**Open items:** Residual `orchestrated.ts` references in Direction Semantics and KeyFactors Design xwiki pages; `"claimboundary"` pipelineVariant string should be verified against code.

**For next agent:** See handoff file linked above.

---

### 2026-02-19 | Technical Writer / xWiki Expert | Claude Code (Sonnet 4.6) | gh-pages Analytics — Cloudflare Worker + KV Page View Tracking

**Task:** Add privacy-preserving page view tracking to the gh-pages xWiki viewer. View counts per page and per anonymous visitor. No PII. Data persists across deployments.

**Files touched:**
- `Docs/xwiki-pages/analytics/worker.js` — NEW: Cloudflare Worker (~65 lines). `POST /track`, `GET /stats`. KV pattern: `page:{ref} → { v, u:{id:count} }`.
- `Docs/xwiki-pages/analytics/wrangler.toml` — NEW: Worker config. KV namespace ID `7107113738734bb2bf7279519a901899` (live).
- `Docs/xwiki-pages/analytics/README.md` — NEW: Setup instructions.
- `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` — Analytics JS module (anonymous UUID via localStorage, fire-and-forget POST on `loadPage()`), Stats modal, Stats toolbar button, mobile hide (`!important` needed to override JS inline style).
- `Docs/xwiki-pages/scripts/build_ghpages.py` — `--analytics-url` CLI flag; patch #5 updated; patch #12 injects `Analytics.configure(url)`.
- `.github/workflows/deploy-docs.yml` — Reads `DOCS_ANALYTICS_URL` repo secret, passes as `--analytics-url`.

**Key decisions:**
- Cloudflare Worker on user's own account (not a third-party service). Free tier (100K req/day).
- Simplified to 2 endpoints + 1 KV key pattern after initial over-engineered design.
- Fire-and-forget tracking — never blocks UI. Analytics disabled by default when no endpoint configured.
- KV is independent of gh-pages branch — data survives all deployments.

**Live deployment:** Worker at `https://factharbor-docs-analytics.factharbor.workers.dev`. GitHub secret `DOCS_ANALYTICS_URL` set. Verified working.

**Open items:**
- Analytics changes NOT synced to `C:\DEV\BestWorkplace` repo. Viewer is shared — if analytics needed there, apply viewer changes + separate `--analytics-url` config to that repo's build script.
- Stats button hidden on mobile (≤480px). Could add to hamburger menu for mobile access if needed.

**Warnings:**
- `build_ghpages.py` patch #5 target string now includes `Analytics.trackPageView(ref);`. If viewer line order changes, patch silently fails — always run a test build after viewer edits.
- `!important` is required on `.file-info` and `#btnStats` mobile CSS rules because `loadPage()` sets `style.display = 'flex'` inline, which overrides media query rules without it.

**For next agent:** Worker deployed and live. To update worker: edit `worker.js`, run `npx wrangler deploy` from `Docs/xwiki-pages/analytics/`. No changes needed for content-only doc updates.

**Learnings:** Appended to `Role_Learnings.md` — yes.

---

### 2026-02-19 | DevOps / Setup | Claude Code (Sonnet 4.6) | GitHub CLI Installation

**Task:** Install and authenticate GitHub CLI (`gh`) on the developer's Windows machine, pointed at `github.com/robertschaub/FactHarbor`.

**Files touched:** None (environment setup only).

**Key decisions:** Chocolatey was chosen as install method. Initial attempt failed — non-elevated shell + stale NuGet lock file at `C:\ProgramData\chocolatey\lib\03fa614411207ddb46e8aca6ad6abb2721319062`. Resolution: delete lock file + re-run from an admin terminal. User confirmed `gh` working.

**Open items:** None.

**For next agent:** `gh` is installed and authenticated. `gh repo view robertschaub/FactHarbor`, `gh pr create`, `gh issue list`, etc. are all available.

---

### 2026-02-19 | LLM Expert + Senior Developer | Claude Code (Sonnet 4.6) + Claude Opus 4.6 | Dynamic Pipeline `AI_NoObjectGeneratedError` Fix

**Task:** Investigate and fix the recurring `FAILED (100%)` error in the Monolithic Dynamic pipeline (`AI_NoObjectGeneratedError: response did not match schema`). Multi-agent: LLM Expert (Sonnet) + Software Engineer (Opus) ran parallel investigations; findings consolidated and implemented.

**Files touched:**
- `apps/web/src/lib/analyzer/monolithic-dynamic.ts` — Schema fixes (`searchQueries` → optional, `additionalInsights` → `z.any()`) + wired `schema-retry.ts` (1 retry) + graceful degradation fallback
- `apps/web/src/lib/analyzer/types.ts` — Added `"analysis_generation_failed"` to `AnalysisWarningType`

**Key decisions:** Primary root cause: `searchQueries` required in schema but never mentioned in analysis prompt → LLM omits it → Zod rejects. Secondary: `additionalInsights: z.object({})` rejects `null`. Fix: both fields relaxed to `.optional()`. Wired existing `schema-retry.ts` (was dead code for this pipeline) — 1 Zod-aware retry + graceful degradation instead of throwing. Changes **not yet committed**.

**Open items:** Prompt framing for sensitive content (needs Captain approval); `maxOutputTokens` ceiling; schema unification; PLAN stage has no retry wrapper.

**For next agent:** Full details → [`Docs/AGENTS/Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md`](Handoffs/2026-02-19_LLM_Expert_Senior_Dev_Dynamic_Pipeline_Fix.md)

---

### 2026-02-19 | LLM Expert | Claude Code (Sonnet 4.6) | Claim Fidelity Phase 1+2 — Gap Review, Vector Fixes, Gate 1 Safety Net, Validation

**Task:** Review Codex's Phase 1+2 claim fidelity implementation, fix remaining prompt/code gaps, run live validation reruns, diagnose and fix Gate 1 over-filtering for evaluative inputs.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md` — 3 gap fixes: Pass 2 opening framing, schema descriptions, Gate 1 opinion check refinement
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — Gate 1 `passedFidelity` filtering + safety net (rescue last claim if all would be filtered)
- `apps/web/src/lib/analyzer/types.ts` — `passedFidelity?: number` added to `gate1Stats`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` — Updated test + new fidelity test cases

**Key decisions:** Gate 1 safety net prevents empty pipeline — rescues highest-centrality fidelity-passing claim rather than returning a meaningless default verdict. Opinion check refined: evaluative assertions ("X reports in a balanced way") are passed (evidence can assess them); pure opinions ("X is the best") are filtered.

**Validation results (live reruns, Captain-approved):** "The sky is blue" → 1 claim, perfect fidelity, −49% LLM calls. "Die Medien des SRF berichten politisch ausgewogen" → 1 claim, faithful, MIXED (52%).

**Open items:** Phase 3 (evidence payload compression); Phase 4 (broader validation). Changes **not yet committed**.

**For next agent:** All claim fidelity changes (Codex + Lead Architect + LLM Expert) are in the uncommitted working tree. Commit as a single coherent batch. See `Docs/WIP/Pass2_Claim_Quality_Issues_2026-02-18.md` for the original root cause analysis and full proposal stack.

---

### 2026-02-19 | Technical Writer (xWiki Expert) | Claude Code (Sonnet 4.6) | XAR Script Cleanup + Cross-Link Validation + XAR Rebuild

**Task:** (A) Rename internal dependency scripts for consistency. (B) Delete legacy script copies from old locations. (C) Validate all cross-links in .xwiki files. (D) Build new XAR. (E) Verify deletions of 17 deprecated pages leave no broken references.

**Files touched:**
- `Docs/xwiki-pages/scripts/xwiki_fulltree_to_xar_ROBUST.py` → **renamed** to `fulltree_to_xar.py`
- `Docs/xwiki-pages/scripts/xwiki_xar_to_fulltree_generic.py` → **renamed** to `xar_to_fulltree.py`
- `Docs/xwiki-pages/scripts/xar_to_xwiki_tree.py` — updated reference to `xar_to_fulltree.py`
- `Docs/xwiki-pages/scripts/fulltree_to_xar.py` — docstring updated
- `Docs/xwiki-pages/scripts/xar_to_fulltree.py` — docstring updated
- `Docs/xwiki-pages/scripts/WORKFLOW.md` — last-updated, version, example paths
- `Docs/xwiki-pages/README.md` — page count (137→160), directory structure corrected, last-updated
- `Docs/AGENTS/AGENTS_xWiki.md` — page count, example paths, last-updated
- `Docs/AGENTS/InitializeFHchat_for_xWiki.md` — script references updated
- `Docs/xwiki-export/README.md` — updated to current XAR (`FactHarbor_08.Feb.26_22.19.xar`, 150 pages → then 160 after further deletions/additions)
- **Deleted:** `scripts xWiki/` folder (3 files — old copies of renamed scripts)
- **Deleted:** `Docs/ARCHIVE/OLD_MARKDOWN_WORKFLOW/` (4 files — old 4-script workflow wrappers, untracked)
- **Built:** `Docs/xwiki-export/FactHarbor_08.Feb.26_22.19.xar` (150 pages, 580 KB)

**Key decisions:**
- Renamed `xwiki_fulltree_to_xar_ROBUST.py` → `fulltree_to_xar.py` and `xwiki_xar_to_fulltree_generic.py` → `xar_to_fulltree.py` for consistency with the user-facing script names. Did NOT consolidate/inline — kept as separate dependency scripts per user direction.
- Cross-link validation scanned 566 cross-page references (pattern: `[[label>>Space.Page]]`), found 0 broken. The 44 initially flagged were false positives (anchor links, UI mockup text, config examples).
- After user deleted 17 deprecated pages (4 Architecture, 13 Implementation), re-validated: 0 broken references in remaining tree. Test XAR built successfully with 160 pages.

**Open items:** None.

**Warnings:**
- `Docs/xwiki-pages/README.md` directory tree was significantly outdated (showed a `Product Development/` hierarchy that no longer exists). Corrected to match actual tree. Any agents who cached the old structure should re-read.
- The WORKFLOW.md example paths referenced `Product Development/Specification/` (old path). All occurrences replaced with `Specification/Architecture/` (real path). Check any external references.

**For next agent:** Tree is at 160 pages as of 2026-02-19. Latest XAR is `Docs/xwiki-export/FactHarbor_08.Feb.26_22.19.xar`. All scripts in `Docs/xwiki-pages/scripts/` — 2 user-facing + 2 internal dependencies, all with consistent naming. No broken cross-links.

**Learnings:** No new gotchas specific to Technical Writer role. (Existing learning about external link syntax `[[label>>https://url]]` in xwiki-viewer.html still applies.)

---

### 2026-02-18 | Technical Writer | Claude Code (Sonnet 4.6) | Architecture Documentation Rework — Consistency Fixes + ERD Integration

**Task:** (A) Fix 4 documentation inconsistencies found in a prior consistency audit. (B) Rework all entity relationship diagrams as integral architecture documentation: audit every ERD against source code, fix all type/field mismatches, and align the future-design specification as a compatible evolution of the current implementation.

**Files touched (Task A — commit 279cc67):**
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/Data Model/WebHome.xwiki` — Fixed verdict scale ranges (TRUE=86-100%, FALSE=0-14%, mixed confidence threshold=60%), fixed trackRecordScore range to 0.0-1.0
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/Quality and Trust/WebHome.xwiki` — Replaced contradictory "7-Layer Defence" heading with "Defence in Depth" two-phase framing (Phase 1 pre-verdict / Phase 2 post-verdict); fixed SR score range
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/Deep Dive/Evidence Quality Filtering/WebHome.xwiki` — Added phase cross-reference note
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/Deep Dive/WebHome.xwiki` — Updated orchestrated.ts line count to ~13,600

**Files touched (Task B — commit bc29c4f):**
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/Data Model/WebHome.xwiki` — Major rewrite: comprehensive `erDiagram` with 10 entities and 12 relationships derived from `types.ts`. Added entity descriptions table, Quality Gate Entities section, Configuration Entities section.
- `Docs/xwiki-pages/FactHarbor/Specification/Data Model/WebHome.xwiki` — Major rewrite: kept as compatible future evolution (Target Data Model). Replaced "Scenario" → "AnalysisContext" throughout, "Verdict" → "ClaimVerdict" with truthPercentage (int 0-100). Aligned Source fields (trackRecordScore float 0.0-1.0, trackRecordConfidence, trackRecordConsensus). Updated Evidence fields to match EvidenceItem interface (statement, category, probativeValue, sourceAuthority, evidenceBasis). Corrected source scoring from "Sunday 2 AM batch job" to current LLM+Cache with future background refresh enhancement. Added "Not yet implemented" info boxes to User, Flag, QualityMetric, ErrorPattern. Added "Current/Target" annotations.
- `Docs/xwiki-pages/FactHarbor/Specification/Architecture/WebHome.xwiki` — Updated Data Model description to reference 10-entity model.

**Key decisions:**
- **ERD source of truth:** `apps/web/src/lib/analyzer/types.ts` — all entity interfaces read directly. Agents ran 3 parallel Explore agents to map 32+ interfaces against 9 existing ERD diagrams.
- **28 mismatches found across 3 categories:** 9 in Architecture/Data Model, 14 in Specification/Data Model, 5 in KeyFactors Design (left as-is — the "Scenario" rejection documentation is intentional and correct).
- **Future design kept, not redirected:** User instruction was to preserve Specification/Data Model as an evolutionary target but eliminate contradictions. All field types, entity names, and scoring scales were made compatible with current implementation.
- **"Scenario" rejected entity:** The Specification/Data Model previously used "Scenario" as a primary entity. This was the rejected alternative to "AnalysisContext" (see KeyFactors Design page). Replaced everywhere in that page.
- **Source reliability scoring:** "0-100" appeared in multiple places — all corrected to "0.0-1.0" float matching `CachedReliabilityData` in `source-reliability.ts`.

**Open items:**
- `likelihood_range`, `accuracy_history`, `correction_frequency` still appear in `Requirements/User Needs/WebHome.xwiki:295` — outside scope of this rework, may need updating in a future Requirements pass.

**Warnings:**
- The Architecture/Data Model ERD uses entity names in UPPER_SNAKE_CASE (Mermaid convention) that do not match TypeScript interface names. This is intentional: the ERD is a conceptual model, not a code-literal schema. Future agents should not "fix" this discrepancy.
- Specification/Data Model is explicitly framed as "Target Design" (PostgreSQL/Redis/Elasticsearch future state). The gap between current (SQLite JSON blobs) and target (normalized relational tables) is documented and intentional.

**For next agent:** Architecture/Data Model (L2 Architect level) and Specification/Data Model (L3 Target) are now consistent with `types.ts` as of today. Next documentation work should also reference `apps/web/src/lib/config-schemas.ts` (PipelineConfig:86, CalcConfig:751, SearchConfig:52, SourceReliabilityConfig:598) for configuration entity details. The `ResearchState` and `EvidenceScope` entities are present in types.ts but not yet prominently featured in either page — could be added in a future pass.

**Learnings:** No new role learnings to append.

---

### 2026-02-18 | Senior Developer | Claude Code (Sonnet 4.6) | Interactive JSON Tree View — Job Detail Page

**Task:** Add expand/collapse per-node and one-click copy-to-clipboard to the JSON tab on the job detail page.

**Files touched:**
- `apps/web/src/app/jobs/[id]/components/JsonTreeView.tsx` — New component: toolbar (Expand All / Collapse All / Copy JSON) + `react-json-view-lite` tree view.
- `apps/web/src/app/jobs/[id]/components/JsonTreeView.module.css` — New CSS module: styles matching FactHarbor design, icon characters, collapsed content `...` via `::after`.
- `apps/web/src/app/jobs/[id]/page.tsx` — Import + replaced flat `<pre>` JSON display with `<JsonTreeView>` component (lines ~972-977).
- `apps/web/package.json` / `package-lock.json` — Added `react-json-view-lite` v2.5.0 dependency.

**Key decisions:**
- Used `react-json-view-lite` (3KB, zero deps, TS-native) over a custom recursive `<details>` component — handles large JSON (100+ evidence items) without virtualization effort.
- Expand/collapse is state-driven (`expandLevel` → `shouldExpandNode` callback) so Expand All / Collapse All re-renders cleanly without DOM imperatives. Default: first 2 levels expanded.
- Copy uses `navigator.clipboard.writeText()` + `toast.success()` matching existing patterns.
- Library's CSS was NOT imported — all styles are in the CSS module, including the `::after` pseudo-elements for icons (`▶`/`▼`) and collapsed-content ellipsis (`...`). This was necessary because the library renders empty spans and relies on its own CSS for those characters — without this the collapsed nodes showed empty `{}` brackets with no visible or clickable target.

**Open items:** None.

**Warnings:**
- `shouldExpandNode` is also called on re-render when `expandLevel` changes, resetting all node states (including any the user manually toggled). This is a known trade-off of the library's design. The Expand All / Collapse All buttons intentionally reset manual toggles.
- If the library is upgraded, verify `StyleProps` field names haven't changed — they're mapped by name in the `customStyles` object.

**For next agent:** JSON tree view is self-contained in `JsonTreeView.tsx/.module.css`. The parent page passes `job.resultJson` (parsed object) and `jsonText` (stringified string for copy). No other page touches this component.

**Learnings:** No new role learnings to append.

---

### 2026-02-18 | Code Reviewer | Claude Code (Sonnet 4.6) | Full Code Review + Verification — Feb 17-18 Changes

**Task:** Full code review of all changes made Feb 17-18 (20 commits + uncommitted working tree). Identify findings, produce a prioritized 5-phase fix plan, write agent prompts for each phase, verify all fixes after completion, and confirm no regressions.

**Files touched:**
- `Docs/WIP/Code_Review_Fixes_2026-02-18.md` — Created: prioritized work plan (45 findings, 5 phases). Now archived.
- `Docs/WIP/Code_Review_Fixes_Agent_Prompts.md` — Created: copy-paste prompts for all 5 phases + worktree guidance. Now archived.
- `Docs/AGENTS/Agent_Outputs.md` — This entry.
- `Docs/AGENTS/Role_Learnings.md` — 4 learnings appended (auth extraction, circuit breaker double-counting, HMR globalThis, new module test coverage). 3 more appended now (see Learnings below).
- `Docs/WIP/README.md` — Entries added then removed during user-led WIP consolidation.

**Key decisions:**
- 45 findings across 6 critical, 11 high, 13 medium, 15 low. All addressed in 5 phases.
- Phase 4 (search hardening: 3 new test files, config threading, HALF_OPEN probe limit) ran on a worktree `fix/search-hardening` — the only phase with fully isolated file scope.
- Phases 1→2→3→5 ran sequentially on main (shared files prevented parallelism).
- New shared `apps/web/src/lib/auth.ts` centralises `secureCompare` (timingSafeEqual), `checkAdminKey`, `checkRunnerKey`, `validateJobId`, `getEnv`. All new/refactored routes use it.
- Abort signals extracted to `apps/web/src/lib/job-abort.ts` with `globalThis` storage.

**Open items (residuals confirmed by verification):**
1. **M3 partial** — Test file `claimboundary-pipeline.test.ts` still has ~40 occurrences of "ClaimBoundary" (without "Assessment") in factory function names (`createClaimBoundary`), describe blocks, and comments. Type import on line 51 is correct. Cosmetic only.
2. **L10 partial** — 5 older route files (`internal/system-health`, `internal/evaluate-source`, `admin/verify`, `internal/run-job`, `admin/source-reliability`) retain local `getEnv` definitions. Functionally equivalent; not migrated.
3. **10 test failures** — All in Phase 4's newly written tests. Two root causes: (a) `closeSearchCacheDb()` doesn't reset `dbPromise` (fix: add `dbPromise = null`); (b) `vi.resetModules()` breaks `instanceof SearchProviderError` class identity in search-brave tests (fix: switch to duck-typing `err.name === "SearchProviderError"`).
4. **Auth migration incomplete** — 14 admin config routes + 4 others still use inline `===` for admin key comparison instead of shared `checkAdminKey`. Pre-existing debt; shared utility is ready.
5. **Dead code** — Old hardcoded `DYNAMIC_BUDGET` constant at `monolithic-dynamic.ts:107-112` is now superseded by config-driven `dynamicBudget` at line 220. Should be removed.

**Warnings:**
- The 10 test failures are in Phase 4's own test files, not regressions. They will show as failures on `npm test` until fixed.
- Auth migration incomplete across 18 routes — `===` timing-unsafe comparisons persist in all pre-Phase-1 admin config routes.
- `setSearchCacheEnabled`, `setSearchCacheTtlDays`, `setCircuitBreakerConfig` mutation functions still exported from their modules (M6 fix threads config as params, but old setters remain). Low risk; can be cleaned up when those modules are next touched.

**For next agent:** Pick up the 5 residual items above as a quick-fix pass (Haiku/Cline appropriate for all except the auth migration sweep). For the test fixes: `search-cache.ts` → add `dbPromise = null` in `closeSearchCacheDb()`; `search-brave.test.ts` → replace `instanceof` with `err.name === "SearchProviderError"`. The full verification results live in the conversation history (Feb 18 session).

**Learnings:** Yes — 7 total appended to `Role_Learnings.md` (4 from fix commits, 3 new from verification). See below.

---

### 2026-02-18 | Senior Developer | Claude Code (Sonnet 4.6) | Test/Tuning Mode Design

**Task:** Design a complete test/tuning infrastructure for the analysis pipeline — test-scoped UCM configs, partial pipeline execution (stop at any named stage), programmatic + UI access for agents and admin users, non-admin isolation, and cleanup.

**Files touched:**
- `Docs/WIP/TestTuning_Mode_Design_2026-02-17.md` — Created: architecture & implementation plan (5 phases, 7 .NET files, 13 Next.js files). Updated in-session: `maxStage: number` renamed to `stopAfterStage: PipelineStageId` throughout.
- `Docs/WIP/TestTuning_UI_Design_2026-02-17.md` — Created: full UI spec with wireframes, color system, component specs, tab availability matrix, stage stepper component.
- `Docs/WIP/README.md` — Both WIP files registered (done during prior consolidation session).

**Key decisions:**
- `stopAfterStage: PipelineStageId | null` (string ID, not int) — stage gate uses `PIPELINE_STAGE_IDS.indexOf()` for ordinal comparison; `null` = full run. Stage IDs: `"extract-claims"`, `"research"`, `"cluster-boundaries"`, `"verdict"`, `"aggregate"`.
- Test configs use `test/` profile key prefix — zero `config.db` schema changes; all existing UCM API endpoints work unchanged.
- `ConfigOverrides` stored on `JobEntity` (not trigger payload) — persists through process restarts, keeps audit trail.
- Purple (#7c3aed) as universal test-mode accent colour; 🔬 as test-mode icon throughout UI.
- New shared component: `PipelineStepper` (interactive on test-runner page, read-only on job detail).
- Result JSON uses `meta.completedThrough: PipelineStageId` (string) — not a number.

**Open items:**
- No implementation started — both docs are proposals pending Captain approval.
- `Entities.cs`, `JobService.cs`, `JobsController.cs` already have retry/cancel features (added separately during session); test fields are additive.

**Warnings:**
- `loadPipelineConfig("default")` appears at ~7 locations in `claimboundary-pipeline.ts`; all must be updated or test config overrides will be silently ignored at some stages.
- `PIPELINE_STAGE_IDS` must be exported from `types.ts` before referencing it in pipeline or runner code — it is the single source of stage ordering.

**For next agent:** Read both WIP docs before implementing. Start with Phase 1 (JobEntity data model). Architecture doc = backend guide; UI doc = admin pages + `PipelineStepper` component. Use `PIPELINE_STAGE_IDS.indexOf()` for all stage ordering comparisons — never hardcode numeric indices.

---

### 2026-02-18 | Lead Architect | Claude Code (Opus) | Claim Fidelity Validation + Metrics Persistence Fix
**Task:** Validate Lead Developer's claim fidelity fix with runtime testing, complete evidence decontamination (Phase 3), and fix metrics persistence.
**Files touched:** `claimboundary.prompt.md`, `claimboundary-pipeline.ts`, `metrics.ts`
**Key decisions:** Three-layer fidelity defense (prompt prevention + evidence truncation + Gate 1 detection). Direct API call for metrics persistence instead of proxy.
**Open items:** Speed optimization (Phase 3), Gate 1 rebuild (Phase 4), metrics token aggregation. Changes uncommitted.
**For next agent:** Full details in [`Docs/AGENTS/Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md`](Handoffs/2026-02-18_Lead_Architect_Fidelity_Metrics.md).

---

### 2026-02-18 | Lead Developer | Codex (o4-mini) | Claim Extraction Fidelity Fix

**Task:** Fix P0 claim drift caused by Stage 1 Pass 2 over-anchoring to preliminary evidence instead of user input.

**Files touched:** `claimboundary.prompt.md`, `claimboundary-pipeline.ts`, `types.ts`, `truth-scale.ts`, tests, WIP companion doc, plus two governance fixes to `AGENTS.md` step 6 and `Multi_Agent_Meta_Prompt.md` role list.

**Key decisions:** Input-anchored `impliedClaim`, atomic input detection, Gate 1 `passedFidelity` check, safety-net rescue for over-filtering.

**Open items:** Phase 3 (evidence payload compression), Phase 4 (validation against baseline scenarios). Changes uncommitted.

**For next agent:** Full details in [`Docs/AGENTS/Handoffs/2026-02-18_Lead_Developer_Claim_Fidelity.md`](Handoffs/2026-02-18_Lead_Developer_Claim_Fidelity.md).

> **Note:** This entry was written by Agents Supervisor (Claude Code) on behalf of Codex, which did not write to Agent_Outputs.md on completion. See Learnings in the Handoffs file.

---

### 2026-02-18 | Captain (advisory) | Claude Code (Opus) | Agent Output Convention

**Task:** Establish a default convention for agents to write completion outputs to shared files, enabling cross-agent collaboration without explicit per-task instructions.

**Files touched:**
- `AGENTS.md` — added "Agent Output Convention (MANDATORY)" section after Working Principles
- `Docs/AGENTS/Agent_Outputs.md` — created (this file)
- `Docs/AGENTS/Handoffs/README.md` — created (directory + readme for significant outputs)
- `Docs/AGENTS/README.md` — updated with new entries under "Agent Collaboration" section

**Key decisions:**
- Hybrid approach: rolling log (`Agent_Outputs.md`) for standard tasks, dedicated files (`Handoffs/`) for significant tasks, nothing for trivial tasks.
- Separated from `Docs/WIP/` to avoid polluting the design-document lifecycle.
- Convention is MANDATORY — agents default to writing output unless the task is clearly trivial.

**Open items:** None. Convention is ready for use by all agents.

**For next agent:** This convention is now active. After completing any non-trivial task, append your output here (Standard tier) or create a file in `Docs/AGENTS/Handoffs/` (Significant tier). See AGENTS.md § Agent Output Convention for the template.

---
### 2026-02-19 | Lead Developer | Codex (GPT-5) | Review — Political_Bias_Mitigation_2026-02-19
**Task:** Review `Docs/WIP/Political_Bias_Mitigation_2026-02-19.md` against the referenced implementation and tests; validate checklist items and identify risks/regressions.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Performed a code-first review on the 6 referenced files plus related config-loading paths.
- Verified test/build claims directly: safe suite and targeted suites pass; web build is green.
- Logged two material correctness issues (imbalance percentage messaging and threshold-disable contract mismatch) plus one run-level config consistency risk.
**Open items:**
- Decide expected behavior for `evidenceBalanceSkewThreshold = 1.0` (true disable vs "flag only 100% one-sided").
- Decide whether to enforce single-run config snapshot consistency across stages (pass config through state/job snapshot).
- If calibration harness proceeds, approve budget and fixture design before implementation.
**Warnings:**
- Current warning text can underreport contradicting-side skew percentage (direction and percentage can disagree).
- Docs/comments/tests currently conflict on the semantics of threshold `1.0`.
**For next agent:**
- Start with `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` around imbalance warning construction and `assessEvidenceBalance`.
- Align contract text in `apps/web/src/lib/config-schemas.ts` and tests in `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts` to the chosen threshold behavior.
- If snapshot consistency is chosen, thread one resolved config object from pipeline entry through Stage 4/5 helpers.
**Learnings:** No new role learnings appended.

---
### 2026-02-19 | Lead Developer | Codex (GPT-5) | Re-Verification — Political Bias Mitigation Post-Review Fixes
**Task:** Verify that all three prior review findings were addressed in code, tests, and WIP documentation.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Confirmed contradicting-side warning now reports majority-side percentage (`majorityPct`).
- Confirmed `evidenceBalanceSkewThreshold=1.0` disable semantics now use strict `>` and tests/docs were updated consistently.
- Confirmed config consistency risk is now documented as a low-severity known issue with a backlog-oriented mitigation approach.
- Re-ran full safe test suite and web build for independent validation.
**Open items:**
- Optional future refactor: single per-job config snapshot threading across all pipeline stages.
**Warnings:**
- Strict `>` changes boundary semantics: exactly 80% majority no longer triggers at threshold `0.8` (documented and intentional).
**For next agent:**
- If product wants inclusive threshold behavior at 80% while preserving `1.0` disable, add an explicit disable flag instead of overloading threshold semantics.
**Learnings:** No new role learnings appended.

---
### 2026-02-19 | Lead Developer | Codex (GPT-5) | Quick Recheck — Mitigations + UCM Additions
**Task:** Quick verification that requested mitigations were implemented, including UCM config additions.
**Files touched:** `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Confirmed mitigation #1 (`all_same_debate_tier`) is implemented and wired into pipeline warnings.
- Confirmed mitigation #2 sample-size messaging + `evidenceBalanceMinDirectional` UCM config is implemented.
- Confirmed mitigation #3 logging is implemented for initial config loads and Stage 4 (`generateVerdicts`) loads.
- Identified one small gap: Stage 5 (`aggregateAssessment`) still loads config without equivalent fallback warning logging.
**Open items:**
- Optional consistency improvement: add the same fallback warning logging around Stage 5 config load.
**Warnings:**
- No functional regressions found in targeted tests.
**For next agent:**
- If completing mitigation #3 fully, add `contentHash === "__ERROR_FALLBACK__"` warning checks near `aggregateAssessment` config load in `claimboundary-pipeline.ts`.
**Learnings:** No new role learnings appended.
