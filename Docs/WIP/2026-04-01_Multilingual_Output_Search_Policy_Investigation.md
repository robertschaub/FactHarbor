# Multilingual Output/Search Policy Investigation

**Date:** 2026-04-01
**Lead Role:** LLM Expert
**Participants:** LLM Expert, Lead Architect, Senior Developer, Code Reviewer
**Status:** ARCHITECTURAL_REVIEW_APPROVED

## Question
Assess the effort, effects, pros, and cons of changing the system so that:

1. report output follows the input language for non-English inputs
2. web search runs in the original language plus English where meaningful

## Executive Summary
- This should be reviewed as **two linked but separate policies**: report-language policy and retrieval-language policy.
- The recommended path is **not** full localization in one step.
- The recommended path is a **phased medium-scope rollout**:
  1. make report-authored analytical text follow input language
  2. preserve source-authored evidence text in original language
  3. add original-language-first retrieval with optional English coverage lanes
  4. defer full UI/export/warning localization unless explicitly approved as a separate i18n project
- This is the strongest balance of user benefit, auditability, architectural cleanliness, and regression risk.

## Architectural Review Outcome
- **Review result:** `Proposal 2 APPROVED for implementation`
- **Review artifact:** `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md`
- **Locked architecture:** Separate the report-language presentation layer from the original-language evidence log.

### Approved Constraints
- `LanguageIntent` is approved and should become explicit pipeline state rather than remaining implicit prompt behavior.
- `reportLanguage` must become a strongly typed cross-stage contract in `apps/web/src/lib/analyzer/types.ts`.
- Stage 4 and Stage 5 prompt paths must take `reportLanguage` as an explicit input.
- Source-authored evidence text must remain in its original language. Dynamic translation of source-derived evidence content is not allowed.
- English retrieval supplementation is approved only as a coverage-expansion lane.
- English retrieval must not be used as a proxy for contrarian, opposing, or balancing evidence.
- Full UI/chrome/export localization is deferred and out of scope for this implementation track.
- Stage 5 fallback narrative paths should respect `reportLanguage` where feasible, or be explicitly documented if they remain English-only.

## Scope Clarification
The investigation found that this is not one change. It splits into two separate policy tracks:

1. **Report-language policy**
Report-authored analytical text follows a chosen report language, likely the input language.

2. **Retrieval-language policy**
Stage 2 query generation and search retrieval use one or more language lanes, likely original-language-first with optional English supplementation.

These should not be bundled into a single switch.

## Consolidated Analysis

### Current behavior
- Stage 1 already detects and partially preserves input language.
- Stage 2 query generation already prefers detected language and allows limited English when useful.
- Stage 4 and Stage 5 do not own a first-class `reportLanguage` concept, so claim reasoning and narrative-adjacent text can drift into English.
- Fallback narratives, warnings, report chrome, and export chrome still contain hardcoded English text.
- Search execution does not currently send first-class runtime language lanes or locale controls through the provider abstraction.

### Why mixed-language output happens
- The pipeline has `detectedLanguage`, but not an explicit cross-stage `reportLanguage` contract.
- Verdict prompts often say to reason in the language of the evidence, which is correct for source interpretation but insufficient for report presentation.
- Even if prompt behavior is improved, English fallback text and UI chrome still guarantee mixed-language reports.

### Why bilingual retrieval must be treated separately
- The repo already contains a failed supplementary-language experiment from 2026-03-22.
- The failure mode was not simply threshold tuning. Language selection and evidential direction were entangled, and the supplementary pass could move the verdict the wrong way.
- Therefore, English supplementation is only defensible as a **coverage lane**, not as a contrarian-balancing mechanism.

## Review Proposals

### Proposal 1: Report-Authored Output Consistency Only
**Intent**
- Eliminate most mixed-language analytical output without broadening scope into a full retrieval or UI localization project.

**In scope**
- Verdict narrative
- Claim reasoning
- Misleadingness explanations
- Challenge responses
- Stage 5 fallback narrative text

**Out of scope**
- Full search-lane redesign
- Full report chrome localization
- Full warning/export localization
- Translating source-authored evidence text

**Implementation shape**
- Add explicit report-language ownership in Stage 4 and Stage 5.
- Ensure fallback narratives follow report language.
- Preserve source excerpts/titles in original language.

**Effort**
- Low to medium.

**Expected effect**
- Most report prose stops switching to English for non-English input.
- Some English still remains in chrome, warnings, and exports.

**Pros**
- Fastest path to visible improvement.
- Lowest regression surface.
- Preserves evidence transparency.

**Cons**
- Not a full answer to “any output”.
- Leaves multilingual retrieval behavior largely implicit.

### Proposal 2: Report Consistency Plus Explicit Retrieval Language Lanes
**Intent**
- Fix mixed-language report output and make retrieval language behavior explicit, controllable, and measurable.

**In scope**
- Everything in Proposal 1
- Explicit language state such as `reportLanguage` and ordered retrieval lanes
- Original-language-first search
- Optional English supplementary search when judged materially useful
- Metrics and cache awareness for language lanes

**Out of scope**
- Full UI/report chrome localization
- Translating source-authored evidence text

**Implementation shape**
- Introduce first-class language state, for example `LanguageIntent`.
- Extend Stage 2 query generation to emit language-lane-aware queries.
- Keep language selection independent from evidential direction.
- Add observability for lane firing, lane contribution, and fallback-language mismatches.

**Effort**
- Medium.

**Expected effect**
- Report output becomes coherent in the input language.
- Retrieval becomes broader and more explicit without defaulting into blanket English bias.
- Operators can explain which lanes fired and why.

**Pros**
- Best balance of product value and engineering quality.
- Cleanest architecture short of full i18n.
- Aligns with the requested search behavior, but safely.

**Cons**
- More work than a prompt-only fix.
- Needs stronger validation and observability.
- Can regress if English supplementation is implemented as generic always-on behavior.

### Proposal 3: Full Visible-Output Localization
**Intent**
- Make every user-visible part of the report experience follow the input language.

**In scope**
- Everything in Proposal 2
- Report chrome
- Export chrome
- User-visible warnings and static labels
- Broader UI localization decisions

**Out of scope**
- Translating source-authored evidence text unless separately approved

**Implementation shape**
- Add a real UI/report localization layer.
- Localize HTML export labels and page chrome.
- Decide which warning/diagnostic surfaces localize and which remain admin/developer-facing.

**Effort**
- High.

**Expected effect**
- Only proposal that fully satisfies the strict reading of “any output”.

**Pros**
- Cleanest user-visible experience.
- No mixed-language page chrome.

**Cons**
- This is now a product-wide i18n project, not just an analysis-pipeline change.
- High regression surface and larger test matrix.
- Risks conflating report localization with source translation unless boundaries are defined carefully.

## Recommended Proposal

### Recommendation For Review
Approve **Proposal 2**.

Reason:
- Proposal 1 is useful, but too narrow. It improves the symptom without making the policy explicit or measurable.
- Proposal 2 addresses the real architectural gap and the requested search direction while still protecting auditability.
- Proposal 3 is only justified if product scope explicitly includes full UI/report localization.

### Scope
Adopt **Proposal 2** in phased form:

1. Make **report-authored analytical output** follow the input language.
2. Keep **source-authored evidence text** in original language.
3. Add **original-language-first retrieval** with **optional English supplementation** only when the model judges it materially useful.
4. Defer **UI/report chrome localization** into a separate explicit i18n decision unless product scope really requires it now.

### Review Status
- `Proposal 2`: approved
- Source-language evidence preservation: approved as a hard requirement
- English supplementation as optional coverage lane only: approved
- UI/chrome localization in this track: deferred / out of scope

### Recommended architecture
Introduce a first-class language-state object in pipeline state, for example:
- `inputLanguage`
- `reportLanguage`
- `retrievalLanguages` or lane descriptors
- `sourceLanguagePolicy`

This avoids scattered prompt-only behavior and makes validation possible.

### Recommended retrieval rule
Use English only as a **coverage-expansion lane**.
Do not use it as:
- a correctness lane
- a balancing lane
- a proxy for contradicting evidence

## Implementation Plan

### Phase 0: Scope Lock
**Goal**
- Lock the product interpretation before implementation starts.

**Decisions required**
- Is scope limited to report-authored analytical text, or does it include all visible report/page/export text?
- Must warnings localize, or only core report content?
- Is English supplementation optional and LLM-judged, or expected as a default-on rule?

**Deliverable**
- Approved proposal and scope note.

### Phase 1: Report Language Ownership
**Goal**
- Make report-authored analytical output consistently follow the input language.

**Changes**
- Introduce explicit report-language handling in Stage 4 and Stage 5.
- Ensure fallback narrative text follows report language.
- Keep source-authored text unchanged.

**Deliverable**
- Mixed-language analytical prose is materially reduced on non-English inputs.

### Phase 2: Retrieval Language Lanes
**Goal**
- Make retrieval behavior explicit and measurable.

**Changes**
- Add language-lane-aware query generation.
- Use original-language-first retrieval.
- Allow English supplementary queries only when judged meaningful.
- Keep evidential direction independent from language lane.

**Deliverable**
- Search metrics can show which language lanes fired and how much they contributed.

### Phase 3: Validation And Observability
**Goal**
- Prevent silent regressions.

**Changes**
- Add regression coverage for language purity of report-authored text.
- Add checks that source-authored text remains original-language.
- Add lane-firing metrics and fallback-language mismatch diagnostics.
- Validate that bilingual retrieval does not degrade verdict direction or confidence stability.

**Deliverable**
- Reviewable validation evidence for multilingual presentation and retrieval behavior.

### Phase 4: Optional Full Localization
**Goal**
- Localize full visible report/page/export chrome if explicitly approved.

**Changes**
- Add UI/export localization.
- Localize static labels and user-visible warnings as approved.

**Deliverable**
- Fully localized visible report experience.

## Acceptance Criteria
- For non-English inputs, report-authored analytical text follows the input language in the normal success path.
- Source-authored titles, excerpts, and evidence-derived text remain in original language unless a separate translation policy is approved.
- English supplementary retrieval is not always-on; it is invoked only when judged meaningful.
- Language-lane usage is observable in metrics and explainable after a run.
- No known regression reintroduces the March 22 failure mode where language choice acts as a proxy for evidential direction.

## Review Checklist
Please review and approve or reject the following points explicitly:

1. Approve Proposal 2 as the target plan. `APPROVED`
2. Confirm that source-authored evidence text should remain in original language. `APPROVED`
3. Confirm that English supplementation should be optional and claim-aware, not always-on. `APPROVED`
4. Confirm whether warnings and report/export chrome are in scope now or deferred. `DEFERRED / OUT OF SCOPE`
5. Confirm whether a prompt-only pilot is acceptable before first-class language state is introduced. `NOT EXPLICITLY APPROVED`

## Pros and Cons of the Recommended Proposal

### Pros
- Fixes the main user-visible problem without damaging source transparency.
- Preserves multilingual auditability by keeping source text original.
- Improves architecture by making language intent explicit.
- Gives a path to better cross-linguistic coverage without reviving the known-bad supplementary pass design.

### Cons
- More than a prompt tweak; it requires state threading and observability work.
- English supplementation can still skew evidence if the LLM overfires it.
- Does not automatically solve all English chrome unless UI localization is also approved.

## Risks
- Treating bilingual search as generic "always add English" can worsen neutrality.
- Prompt-only work can create a false sense of completion while English fallbacks and UI strings remain.
- Translating source-derived text would reduce auditability and should be avoided.
- Cache and metrics can become misleading if language lanes are introduced without structural tracking.

## Open Questions
1. Does "any output" mean only report-authored analytical text, or also warnings, export chrome, and all UI labels?
2. Should source-authored excerpts and evidence statements always remain in their original language?
3. Is a prompt-only pilot acceptable first, or should first-class language state be introduced immediately?
4. Should English supplementation be optional and claim-aware, or is the requested policy intended to be always-on?
5. Is full report-page localization part of this work, or a separate later i18n effort?

## Evidence Anchors
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/web-search.ts`
- `apps/web/src/lib/search-cache.ts`
- `apps/web/src/app/jobs/[id]/components/VerdictNarrative.tsx`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md`
- `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Architect_Review.md`

## Investigation Reports
- `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Lead_Architect_Subagent.md`
- `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Senior_Developer_Subagent.md`
- `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Report_Code_Reviewer_Subagent.md`

## Notes
- No code was changed.
- No tests were run.
