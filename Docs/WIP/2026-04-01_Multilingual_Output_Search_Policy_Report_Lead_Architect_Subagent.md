# Multilingual Output and Search Policy — Report: Lead Architect (Codex/GPT-5.4)

**Date:** 2026-04-01
**Hub Document:** `Docs/WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md`
**Status:** DONE

**Note:** The requested hub brief file was not present at the referenced path during this investigation. Scope and framing were therefore taken from the Captain's task statement and corroborated against current repo docs and code.

---

## Files Analyzed
- `Docs/AGENTS/Roles/Lead_Architect.md` — role scope and decision authority
- `Docs/AGENTS/Role_Learnings.md` — prior cross-linguistic and architecture lessons
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/System Design/WebHome.xwiki` — system-level AKEL boundaries
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome.xwiki` — pipeline invariants and shared primitives
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline/WebHome.xwiki` — 5-stage workflow boundaries
- `Docs/STATUS/Current_Status.md` — active cross-linguistic neutrality status and current policy constraints
- `Docs/WIP/2026-03-30_Report_Quality_Evolution_Deep_Analysis.md` — current multilingual neutrality findings
- `Docs/AGENTS/Handoffs/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md` — failed supplementary-language experiment
- `apps/web/prompts/claimboundary.prompt.md` — current multilingual prompt contracts
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts` — current language preservation at Stage 1
- `apps/web/src/lib/analyzer/verdict-stage.ts` — Stage 4 verdict architecture and missing language threading
- `apps/web/src/lib/analyzer/aggregation-stage.ts` — Stage 5 narrative generation and English fallback path
- `apps/web/src/lib/analyzer/research-orchestrator.ts` — Stage 2 language/geography handoff to query generation
- `apps/web/src/lib/analyzer/research-query-stage.ts` — query generation entry point
- `apps/web/src/lib/web-search.ts` — provider abstraction and current lack of dynamic language-lane support
- `apps/web/src/app/jobs/[id]/components/VerdictNarrative.tsx` — English UI/report chrome labels

## Findings
### 1. “All output in input language” is not one problem; it is four separate output classes
Current behavior mixes at least four classes of text:

1. **Report-authored analytical text**  
   Examples: verdict narrative, claim reasoning, misleadingness explanations, challenge responses, boundary summaries.

2. **Source-authored text**  
   Examples: source titles, source excerpts, evidence statements derived from source text.

3. **Operational / diagnostic text**  
   Examples: warnings, fallback messages, grounding-check messages, search-provider messages.

4. **UI chrome**  
   Examples: “Evidence Base”, “Limitations”, “Cross-Boundary Tensions”.

These should not be forced into a single policy. The clean architecture is:
- **Report-authored text** should follow the chosen report language.
- **Source-authored text** should preserve original source language for auditability.
- **Operational / diagnostic text** should remain a separate product decision, not silently bundled into report-language work.
- **UI chrome** is a UI i18n problem, not a pipeline-language problem.

### 2. The pipeline currently has input-language detection, but not report-language ownership
Stage 1 already detects and partially preserves input language (`detectedLanguage`, explicit non-English directive in Pass 2). Stage 2 query generation also consumes a language hint.  
But Stage 4 and Stage 5 do **not** have a first-class architecture concept like `reportLanguage` or `languageIntent`.

The current pattern is therefore:
- Stage 1: input-language aware
- Stage 2: query-language aware
- Stage 4/5: largely language-agnostic
- UI/fallbacks: English-by-default

That is the architectural root cause of mixed-language output.

### 3. Stage 4 is the main consistency gap, not Stage 1
The strongest current evidence is the German artifact already observed in repo history: German narrative fields can coexist with English claim-level reasoning and misleadingness text.  
That is consistent with Stage 4 prompts using rules like “analyze in the original language of the evidence” or “reason in the language of the evidence”, which is not the same as “write the report in the input language”.

Architecturally, Stage 4 is currently allowed to follow the evidence language mix. That is suitable for source interpretation, but unsuitable for report presentation.

### 4. Stage 5 fallback and report chrome guarantee mixed-language output even when LLM behavior is fixed
Even if prompts are improved, mixed-language output will still occur because:
- `aggregation-stage.ts` has a hardcoded English narrative fallback
- report components use English block labels
- many warning and failure strings are English

So a “prompt-only” solution can improve the common path, but it cannot satisfy the stronger requirement “any output would be in the input language”.

### 5. Retrieval should not reuse the prior “supplementary language” experiment shape
The March 22 experiment established a negative architectural lesson:
- supplementary language was coupled to evidential direction
- the mechanism fired late
- the one attributable firing moved the verdict in the wrong direction

The correct takeaway is not “never use English supplementary retrieval”.  
The correct takeaway is:
- **language selection**
- **evidential direction**
- **claim targeting**

must remain independent controls.

Therefore, “original language plus English where meaningful” is viable only if it is framed as a **coverage expansion policy**, not a contrarian-balancing policy.

### 6. Provider-level language filtering should not be the first architectural lever
Today the search architecture mainly expresses language through query text, not provider parameters. That is a good default.

Reasons:
- provider support is inconsistent across engines
- provider-level language filters can overconstrain retrieval and silently remove high-quality results
- repo learnings already warn against letting inferred geography/language drive deterministic API bias too aggressively

Architecture recommendation: first-class **query-language lanes** first; provider-language params only as a later optional optimization.

## Proposals
### A. Introduce a first-class `LanguageIntent` model
The pipeline needs a dedicated object rather than scattered fields. Recommended shape:

- `inputLanguage`: detected from input text
- `reportLanguage`: final chosen output language for report-authored text
- `retrievalLanguages`: ordered list of language lanes for Stage 2
- `sourceLanguagePolicy`: preserve-original
- `reportLanguagePolicy`: input-language or override

This should live in pipeline state, not as ad hoc function parameters.  
Architecturally, it belongs near `CBClaimUnderstanding` / `CBResearchState`, because it is cross-stage state.

### B. Define the report-language boundary explicitly
Recommended target policy:

- **Translate / generate in report language**
  - verdict narrative
  - claim reasoning
  - misleadingness explanations
  - challenge responses
  - boundary names/descriptions generated by the system
  - narrative fallbacks

- **Preserve source language**
  - source titles
  - source excerpts
  - evidence statements that are source-derived
  - URLs and citations

This gives a coherent report while preserving transparency.

### C. Treat UI localization as a separate phase
If the user request is interpreted strictly as “every visible string on the report page”, this becomes a broader UI i18n project.  
That should be decided explicitly, not hidden inside a pipeline change.

My recommendation:
- Phase 1: report-content language only
- Phase 2 or later: UI chrome and warning-display localization

### D. Make bilingual retrieval an explicit lane policy, not a fallback hack
Recommended Stage 2 target architecture:
- For each claim, the query generator may return queries tagged with a language lane:
  - `primary`
  - `supplementary_en`
- English supplementary queries are allowed only when the LLM judges English coverage as materially useful for that claim/topic.
- Direction (`supporting`, `refuting`, `contrarian`) remains independent from language lane.

This avoids reviving the failed assumption that English retrieval is inherently corrective.

### E. Use “input language” as the report anchor, but not as the only retrieval language
This is the policy I would recommend if the Captain wants consistency and better multilingual neutrality:
- **Report language**: input language
- **Primary retrieval**: input language
- **Supplementary retrieval**: English only when LLM judges it meaningful

That is the cleanest alignment with the user’s request and the repo’s multilingual findings.

## Risks / Concerns
### 1. “Any output” is ambiguous unless the Captain chooses scope
There are three materially different scopes:
- **Narrow**: only analytical narrative/reasoning fields
- **Medium**: all user-facing report content, including fallbacks and warnings
- **Broad**: all visible UI strings and diagnostics

These are different projects with different effort and regression surfaces.

### 2. Forcing source-derived text into the input language would damage transparency
If evidence statements or excerpts are translated to match report language, the system becomes less auditable and more prone to translation drift.  
That would also conflict with the repo’s established “preserve original language of evidence” direction in prompts.

This should be explicitly avoided.

### 3. English supplementary retrieval can worsen neutrality on some topics
The failed Phase 2 v2 experiment already proved that English retrieval can amplify the dominant narrative rather than balance it.  
So English must be treated as a conditional coverage lane, not a correctness lane.

### 4. A prompt-only fix may create a false sense of completion
Prompt changes will improve common-path language consistency, but they will not fix:
- English fallbacks
- English warnings
- English UI labels
- missing state/telemetry for language lanes

Architecturally, prompt-only is a partial remedy, not the finished design.

### 5. Validation policy must expand to cover cross-linguistic presentation consistency
Existing multilingual quality work mostly measures verdict divergence.  
If report-language consistency becomes a product requirement, validation must also check:
- language purity of report-authored text
- preservation of source-language fields
- stable bilingual retrieval firing behavior

Without that, regressions will be invisible.

## Recommended Architecture and Rollout
### Recommendation
Adopt the policy, but in a scoped form:

**Recommended target**
- Make **report-authored analytical output** follow the input language.
- Keep **source-authored evidence text** in original language.
- Add **original-language retrieval + optional English supplementary retrieval** as an explicit Stage 2 lane policy.
- Keep UI chrome and warnings out of scope unless the Captain explicitly wants full report-page localization.

### Phased rollout
**Phase 0 — Decision and scope lock**
- Choose which output classes are in scope.
- Approve prompt/config work as a Level 4 decision.

**Phase 1 — Report-language consistency**
- Introduce `LanguageIntent` / `reportLanguage`.
- Thread it through Stage 4 and Stage 5.
- Localize narrative and reasoning fallbacks.
- Do not yet touch UI chrome.

**Phase 2 — Bilingual retrieval lanes**
- Extend Stage 2 query generation/output model to express language lanes.
- Keep direction independent from language.
- Add observability for which lanes fired and what they contributed.

**Phase 3 — Validation and thresholds**
- Add cross-linguistic presentation checks and retrieval-lane diagnostics.
- Extend neutrality policy beyond within-language EVD-1.

**Phase 4 — Optional UI localization**
- Only if desired: localize report labels and warning text.

## Open Questions for Captain Approval
1. **Scope lock:** Does "any output" mean only report-authored analytical text, or also warnings, report chrome, export chrome, and operational diagnostics?
2. **Source-text policy:** Should source-authored excerpts and evidence statements always remain in original language, with no presentation-layer translation?
3. **State model:** Should `LanguageIntent` become a first-class pipeline-state concept now, or is a prompt-only pilot acceptable before state/schema work?
4. **Retrieval policy ceiling:** Is English supplementation allowed only as an LLM-judged optional lane, or does the Captain want a stronger default-on bilingual policy despite the known March 22 failure mode?
5. **Validation bar:** What success criteria are required before rollout: lower mixed-language output only, or also improved cross-linguistic neutrality and no verdict-direction regressions?
6. **UI localization:** Is full report-page localization a product goal for this track, or should it be explicitly deferred into a separate i18n effort?

## Out of Scope
- Actual prompt wording changes
- Actual UCM/config schema changes
- UI implementation details
- provider-specific API parameter rollout
- production-policy decision on whether admin diagnostics should localize

---
