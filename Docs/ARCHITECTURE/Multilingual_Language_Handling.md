# Multilingual & Cross-Language Neutrality

**Version**: 1.0.0
**Date**: 2026-08-09
**Status**: Mitigation layers implemented and live; EN supplementary lane shipped **default-off** pending live A/B validation (Backlog **NEUTRALITY-1**, state VALIDATION)
**Verified against**: commit `c0333ad38` (all file/line references below checked at this commit; line numbers drift — grep the named functions/fields)
**Related**: [Backlog NEUTRALITY-1](../STATUS/Backlog.md), [2026-04-01 Validation Status handoff](../ARCHIVE/Handoffs/2026-04/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md), [2026-04-01 Investigation (proposal-stage)](../WIP/2026-04-01_Multilingual_Output_Search_Policy_Investigation.md)

---

## 1. Problem and honest status

Same input submitted in different languages can produce different verdicts. This is a **measured, open gap**, not a solved problem: NEUTRALITY-1 records a **58pp max spread** on the Plastik-recycling input (DE 33% / EN 72% / FR 13%).

What the codebase does today:

- **Prevents language-conditional processing** — every stage treats every language identically (§3).
- **Prevents mid-pipeline language drift** — explicit detection + anti-drift directives (§3.1, §3.2).
- **Makes language flow auditable** — the `LanguageIntent` contract is persisted per job (§3.5).
- **Does NOT yet equalize the evidence base across languages** — the mechanism built for that (EN supplementary lane, §3.6) is implemented, hardened, and **default-off** until the promotion gate (§5) is passed.

Residual divergence is dominated by **per-language evidence pools**: research queries are generated primarily in the input language, so a German input and its English translation research largely disjoint sources (§4).

## 2. Design stance: preserve original language, never canonicalize

FactHarbor deliberately does **not** translate input, evidence, or claims into a canonical language. `apps/web/prompts/claimboundary.prompt.md` repeats two rules in every stage section:

> "Preserve the original language of the input. Do not translate."
> "Do not assume any particular language. Instructions apply regardless of input language."

Claims, queries, evidence, and verdict prose stay in the input language end to end (`sourceLanguagePolicy: "preserve_original"`). Divergence prevention therefore rests on *uniform treatment*, not on merging languages.

## 3. Mechanism inventory (code-verified)

### 3.1 Language detection, decoupled from geography (Stage 1)

- Pass 1 detects `detectedLanguage` (BCP-47) from the surrounding text, explicitly **not** from entity names — `claimboundary.prompt.md` §"Language detection" (~line 107).
- Geography inference must **not** derive from input language (`"Do NOT infer geography from input language"`, ~line 108); sub-national named entities beat language cues.
- The input policy gate accepts "Questions or claims in any language or script" (`input-policy-gate.prompt.md`), so no language is rejected upstream.

### 3.2 Anti-drift directive (Fix 0-A)

`claim-extraction-stage.ts` (grep `languageDirective`, ~line 3095): for non-English input, Pass 2 gets *"Output ALL fields … in ${detectedLanguage}. Do not switch to English."* Rationale in the code comment: budget models drift to English because the surrounding scaffolding (~160 English words) is English. Validated 2026-03-15 (commit `28d42d8f`): zero foreign boundaries, German boundaries preserved.

### 3.3 Language-neutral code paths (i18n hardening, 2026-02-22)

All English-keyword regex was replaced with Unicode-aware structural patterns (commits `efd12c2`→`62e7e37`; `\p{L}` patterns in `aggregation-stage.ts`); the English `stopwords.ts` was deleted. Deterministic code does not branch on the input being non-English or non-Latin.

### 3.4 Search-side neutrality

- **No `lr`/`hl`/`gl` parameters are ever sent to main search providers** (design decision 2026-03-05; verified: zero occurrences in `web-search.ts`).
- `detectedLanguage` in `WebSearchOptions` is threaded **only** to language-aware supplementary providers — Wikipedia selects its language edition from it (`search-wikipedia.ts`, grep `Language priority`).
- Language influences retrieval solely via **LLM query generation**: `research-query-stage.ts` passes `detectedLanguage` into the `GENERATE_QUERIES` prompt, which instructs: *"Generate queries primarily in `${detectedLanguage}`. Include 1-2 English queries only if the topic has significant English-language academic or international coverage. Do NOT default to English."* (`claimboundary.prompt.md` ~line 901).
- UCM overrides exist for testing: `searchLanguageOverride` / `searchGeographyOverride` (`config-schemas.ts`).

### 3.5 `LanguageIntent` cross-stage contract (Proposal 2, shipped 2026-04-01)

`types.ts` (grep `LanguageIntent`):

```ts
interface LanguageIntent {
  inputLanguage: string;
  reportLanguage: string;
  retrievalLanguages: RetrievalLanguageLane[]; // lanes: primary | supplementary_en | source_native
  sourceLanguagePolicy: "preserve_original";
}
```

- Seeded immediately after claim extraction with `reportLanguage = inputLanguage` (`claimboundary-pipeline.ts`, grep `state.languageIntent =`).
- `reportLanguage` is threaded into Stage 4/5 prompts: report-authored analytical prose follows `${reportLanguage}`; **source-authored evidence text is never translated** (`claimboundary.prompt.md` "Report language" rules).
- Persisted verbatim in the result JSON (`buildClaimBoundaryResultJson`), and every `SearchQuery` records `language`, `languageLane`, `laneReason` — per-job language behavior is auditable after the fact.

### 3.6 EN supplementary retrieval lane — the divergence-closing lever, default-off

`maybeRunSupplementaryEnglishLane` (`research-orchestrator.ts`): fires only when **all** hold —

1. `supplementaryEnglishLane.enabled` (UCM; **code default `false`**, `config-schemas.ts` `DEFAULT_SEARCH_CONFIG`),
2. input language ≠ English,
3. iteration type allowed (default `["main"]`),
4. primary-lane **evidence yield** below `minPrimaryEvidenceItems` (default 2) — gate is on evidence items, not raw result counts,
5. claim query budget available.

Then it adds **max 1** forced-English query through the standard relevance/budget/warning path. Semantics: **coverage expansion only — "NEVER used as a contrarian-balancing proxy"** (code comment). Language lane is independent of evidential direction by design.

**Why not "always add English":** a 2026-03-22 supplementary-language experiment failed — language selection and evidential direction became entangled and the supplementary pass could move verdicts the wrong way (see Investigation doc §"Why bilingual retrieval must be treated separately"; results handoff: `Docs/ARCHIVE/Handoffs/2026-03/2026-03-22_Senior_Developer_Phase2v2_CrossLinguistic_v2_Results.md`). The scarcity gate is the accepted alternative, ratified in Proposal 2 with the acceptance criterion "English supplementary retrieval is not always-on."

### 3.7 Source-native lane — scaffold only

`maybeRunSourceNativeSupplementaryLane` (`research-orchestrator.ts`): retrieval in the *claim subject's* native language. **No planner exists**; if enabled it records an explicit no-op telemetry entry so the flag cannot masquerade as active. Default off.

## 4. Where divergence still enters

- Queries in the input language → per-language evidence pools → different verdict inputs. This is the NEUTRALITY-1 root cause and exactly what §3.6/§3.7 target.
- General same-input verdict variance is already evidence-pool-drift dominated (see `scripts/diag/compare-evidence-pools.cjs`); cross-language runs are a structurally larger version of the same effect.
- `reportLanguage` currently always equals `inputLanguage` (no user-facing report-language selection); aggregation falls back to `"en"` if `languageIntent` is missing.

## 5. Validation state and promotion gate

- **Shipped & review-clean** (2026-04-01, commits `e9002e9c`, `06fab2e5`, `8f9d4fae`, `ac51975c`): contract, threading, EN lane hardening.
- **Open gate**: live A/B (lane OFF vs ON) on Plastik-DE, Plastik-FR, Bolsonaro-PT + DE/EN controls; metrics and promotion criteria in the [validation-status handoff](../ARCHIVE/Handoffs/2026-04/2026-04-01_LLM_Expert_Multilingual_Output_Search_Review_Validation_Status.md). Do not promote past default-off without it.
- **Test-coverage caveat**: `test/unit/lib/input-neutrality.test.ts` tests **question-vs-statement** equivalence only — despite the name, there is **no automated cross-language divergence test**. Cross-language evidence so far: C10 calibration baseline (10 pairs, 3 languages) and the NEUTRALITY-1 measurements. C17 (multi-language adversarial benchmark) is open backlog, as is full ES/DE/FR/PT support.

## 6. Operational caveats for agents

- **Code default ≠ effective runtime value.** UCM config lives in the config DB; code defaults only seed fresh DBs. Verify the effective `supplementaryEnglishLane.enabled` via the admin config endpoint (`/api/admin/config/search/default`) before reasoning about a job's language behavior.
- Per-job ground truth: read `languageIntent` and `searchQueries[].languageLane` from the result JSON instead of inferring from the report text.
