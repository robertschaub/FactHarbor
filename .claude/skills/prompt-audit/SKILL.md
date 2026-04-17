---
name: prompt-audit
description: Static quality audit of LLM prompts in apps/web/prompts/. Scores each prompt against a 9-criterion rubric (rule compliance, efficiency, effectiveness, un-ambiguity, generic hygiene, multilingual robustness, bias/neutrality, output schema alignment, failure-mode coverage) and proposes AGENTS.md-compliant fixes. Static linter-style analysis — no runtime data, no job runs, no file writes. Complements /audit (broader prompt+code) and /prompt-diagnosis (runtime provenance).
allowed-tools: Read Glob Grep Bash
---

Audit prompts for: $ARGUMENTS
(Leave blank for all prompts under `apps/web/prompts/`.)

`$ARGUMENTS` may be:
- empty → all `apps/web/prompts/**/*.prompt.md`
- one or more filenames (comma-separated) → those files only
- a subdirectory path → all `.prompt.md` under that path

---

## Non-negotiable constraints (bind every proposed fix)

A proposed prompt edit that trips any of these is rejected with its rule number — no exceptions, no reasoning-past-the-rule.

1. **Generic by Design** — no proposed edit may introduce domain-specific keywords, named entities, regions, or date-periods.
2. **No deterministic text analysis** — no regex, keyword-list, or rule-based classifier recommendations.
3. **No string-match tests as mitigations** — no recommendations that grep specific words in prompt or output.
4. **Strings that influence analysis live in prompts or web-search queries only** — never hardcoded elsewhere.
5. **UCM is the home of tunables** — threshold/weight/limit changes go through `apps/web/configs/*.default.json` + UCM.
6. **Multilingual robustness** — a fix that only works for one language is not a fix.
7. **No teaching-to-the-test** — no examples using vocabulary from `AGENTS.md §Captain-Defined Analysis Inputs`.

**Anti-rationalization note:** framings like *"this isn't really a keyword, it's a semantic cue"*, *"in this specific case the qualifier is necessary"*, or *"technically it's not X, it's Y"* DO NOT exempt a fix. If your justification starts with *"in this specific case"* or *"but this one is different"*, treat that as a compliance signal — not permission.

---

## Phase 0 — Orient

Capture provenance:

```bash
git rev-parse --short HEAD
```

Load once, reused by every criterion check:
- `AGENTS.md` §Fundamental Rules + §Analysis Prompt Rules + §Terminology + §Captain-Defined Analysis Inputs
- `apps/web/src/lib/analyzer/types.ts` (needed for R8 schema alignment)

Resolve scope from `$ARGUMENTS`. Record:
- `HEAD-SHA` (7-char short hash from above, for provenance in output header)
- `SCOPE` (list of in-scope prompt files)

---

## Phase 1 — Per-prompt rubric (9 criteria)

For each in-scope prompt, evaluate each criterion. Record one of `PASS` / `CONCERN` / `FAIL` with line evidence when not PASS.

**R1. Rule compliance** (AGENTS.md Fundamental + Analysis Prompt Rules)
- No hardcoded keywords, named entities, regions, or dates in instructions or examples
- Abstract examples only ("Entity A did X", not "Country built industry")
- No string-match assertion logic embedded in instructions
- No deterministic decision trees about text meaning

**R2. Efficiency** (token budget and cache hygiene)
- Estimate tokens (char count ÷ 4). For this static skill only, use > 8000 as `CONCERN` and > 12000 as `FAIL` as audit bands, not analyzer-runtime tunables
- Flag redundant "remember to..." / "don't forget..." repetitions
- Flag unused context sections not referenced by any instruction
- Stable prefix (rules, schema, examples first; dynamic content last) to maximize cache hits
- Bounded output specification (character limit, field count, or strict schema)

**R3. Effectiveness** (coverage of the caller's needs)
- All required inputs documented (name + purpose + format)
- All expected outputs specified with schema AND one abstract example
- Every critical decision point has explicit guidance, not "use your judgment"
- Edge cases named (empty input, insufficient evidence, malformed data)

**R4. Un-ambiguity**
- No contradictions between sections (e.g., one section says MUST, another says MAY, for same thing)
- Priority ordering when multiple rules apply (MUST > SHOULD > MAY, or explicit numbered precedence)
- Tie-breakers for edge cases ("if A and B both apply, prefer A because …")
- Unambiguous field names (no overloading — `context` vs `evidenceScope` etc., see AGENTS.md §Terminology)

**R5. Generic hygiene** (AGENTS.md Analysis Prompt Rules — the teaching-to-the-test trap)
- No named persons, companies, organizations (e.g., no "Bolsonaro", "Trump", "Scholz", etc.)
- No specific countries, regions, or jurisdictions as examples
- No specific dates or date-periods
- No benchmark vocabulary — cross-check every noun/entity against `AGENTS.md §Captain-Defined Analysis Inputs`
- Examples use abstract placeholders ("Entity A", "Region X", "Topic T")

**R6. Multilingual robustness** (MANDATORY per AGENTS.md)
- No English-specific word-order assumptions ("look for subject-verb-object pattern")
- No English-specific semantic cues ("look for the word 'not' near the claim")
- No Latin-script assumptions
- Instructions don't reference language-specific tokens or morphology
- If the prompt lists language-specific rules, they must cover every language the pipeline supports — not just English

**R7. Bias / neutrality** (core to fact-checking integrity)
- No leading framing toward specific verdict polarities ("you must carefully scrutinize…" vs "evaluate…")
- Symmetric treatment of supporting vs opposing evidence (same word count, same structural weight, same verbs)
- Neutral instruction tone — no implicit assumption about which answer is "correct"
- No framing that presumes the claim's truth direction before evidence is weighed

**R8. Output schema alignment** (against `types.ts`)
- JSON structure in the prompt matches the corresponding TypeScript type exactly
- All required fields present in the prompt spec
- Field names are EXACT matches — no paraphrasing (e.g., `statement` not `sentence`, `probativeValue` not `quality`)
- Data types correct (string/number/enum/array alignment)
- Enum values match the type definition

**R9. Failure-mode coverage**
- Empty-input handling specified ("if input is empty, return …")
- Insufficient-evidence handling specified ("if evidence is too sparse to decide, emit …")
- Malformed-input handling specified
- Graceful degradation paths — the prompt should never silently fail; always specify a fallback output

---

## Phase 2 — Output

### 2a. Header

```
HEAD:     <sha-short>
Scope:    <N prompts audited> — <list>
```

### 2b. Rubric summary table

```
| Prompt | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | Score |
|--------|----|----|----|----|----|----|----|----|----|-------|
```

Codes — use `P` (PASS), `W` (CONCERN/warn), `F` (FAIL). `Score` = count of `P` out of 9.

### 2c. Findings (CONCERN + FAIL only, grouped by file, ordered F→W)

```
[F##] <prompt-file> | R# <CriterionName> | <CONCERN|FAIL>
  Evidence:      <line# or quoted text, <=2 lines>
  Issue:         <what's wrong, <=20 words>
  Fix proposal:  <generic, language-neutral edit, <=30 words>
  Mechanism:     prompt-edit
```

### 2d. Rejected-mechanisms self-audit (MANDATORY — emit BEFORE fix proposals are considered accepted)

Before emitting the findings list as accepted, audit every proposed fix against the 7 constraints. One row per fix.

```
| F## | Change (<=15w) | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|-----|----------------|----|----|----|----|----|----|----|
| F01 | ...            | N  | N  | N  | N  | N  | N  | Y  |
```

Marking convention — R1–R6: `Y` = VIOLATES (reject), `N` = compliant. R7: `Y` = multilingual, `N` = single-language (reject). Any `Y` in R1–R6 OR any `N` in R7 forces move to Rejected fixes.

**Mandatory certification line after the table (exact string):**
```
AUDIT-CERT: every accepted fix is N for R1-R6 and Y for R7. Violators listed in 2e.
```

If you cannot certify truthfully, note as compliance deadlock in 2e and escalate to Captain — do NOT soften the audit or reclassify violations.

### 2e. Rejected fixes

```
Rejected fixes (policy violations):
  <fix headline + rule number violated, or "none">
```

### 2f. Quick-scan recommendations (optional, max 5 bullets)

Pattern-level observations across prompts — recurring weaknesses, cross-prompt inconsistencies, or systemic gaps worth addressing structurally rather than per-prompt.

---

## Scope boundaries (what this skill does NOT do)

- **Static only.** No job runs, no real LLM calls, no `/validate`.
- **Read-only.** No file writes. All proposals live in chat output; Captain applies.
- **Prompts only.** For code-level issues, use `/audit`. For runtime prompt provenance, use `/prompt-diagnosis`. For job-output regression analysis, use `/report-review`.
- **No severity gating.** Every in-scope prompt is evaluated; there is no rollback, no regression bisection, no multi-agent debate. This is a linter, not a forensic tool.

If during the audit you uncover evidence pointing to a code or runtime defect, note it in 2f with a pointer to the appropriate skill — do not diagnose it here.
