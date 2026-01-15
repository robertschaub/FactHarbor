# FactHarbor Bias / Partisanship Smell Audit (2026-01-12)

This document inventories **source-code** and **documentation** (including the xWiki export, locally extracted to `Docs/xwiki-extract/`) that could reasonably be perceived as **biased** or **partisan**, even when the intent is explanatory or illustrative.

**Note on xWiki extraction**: `Docs/xwiki-extract/` is **generated locally** from the committed `.xar` file (`Docs/FactHarbor Spec and Impl 1.Jan.26.xar`) and is **gitignored** (not committed). See `Docs/Readme.txt` for extraction steps.

It is **not** a claim that the repository is politically biased overall—many hits are clearly test fixtures, examples, or archived material—but these are still “smells” that can undermine trust, violate “Generic by Design”, or unintentionally anchor model outputs.

---

## Methodology (what I scanned)

- **Repo-wide keyword scan**: names of political figures/parties, ideological labels (left/right, far-right, liberal/conservative), and charged framing terms (“witch hunt”, “propaganda”, etc.)
- **Targeted review** of high-impact areas:
  - `apps/web/src/lib/analyzer.ts` (LLM prompts, heuristics, examples)
  - `apps/web/src/lib/mbfc-loader.ts` + `Docs/ARCHITECTURE/Source_Reliability.md` (source “bias” scoring)
  - `Docs/xwiki-extract/FactHarbor/FH Analysis Reports/*` (human-readable analysis reports)
  - Developer docs that explicitly discuss “no partisan keywords”

---

## Findings (grouped by impact)

### A) Production-facing prompt/template content (highest leverage)

#### A1) Prompt examples include a real political figure (risk: anchoring + “Generic by Design” optics)

- **File**: `apps/web/src/lib/analyzer.ts`
- **Where**: KeyFactors examples inside the LLM prompt text.
- **Excerpt** (examples in the prompt):

```text
For "The Bolsonaro trial was fair."
...
For "This vaccine causes autism."
```

- **Why it smells**:
  - A named contemporary political figure can be read as partisan “default subject matter”.
  - Examples inside system prompts can **anchor** model behavior and retrieval choices.
  - Even if used as a negative/positive example, it increases the chance of “politics-by-default” associations.
- **Recommended change**:
  - Replace named-entity examples with topic-neutral placeholders, e.g.:
    - “A high-profile political trial was fair.”
    - “A medical intervention causes condition X.” (or a purely non-politicized scientific claim)
  - Prefer synthetic entities (`PERSON_A`, `COUNTRY_X`) when examples must reference real-world structure.

#### A2) “Conservative safeguard” comment can be misread as political

- **File**: `apps/web/src/lib/analyzer.ts`
- **Where**: `extractFacts` filtering.
- **Excerpt**:

```text
// Conservative safeguard: avoid treating high-impact outcomes ...
```

- **Why it smells**:
  - In codebases that emphasize neutrality, “conservative” can be misconstrued as ideological.
- **Recommended change**:
  - Rename wording to “cautious safeguard”, “strict safeguard”, or “risk-reducing safeguard”.

#### A3) “You MUST use your background knowledge as evidence” increases bias surface (even if optional)

- **File**: `apps/web/src/lib/analyzer.ts`
- **Where**: `getKnowledgeInstruction()` when `FH_ALLOW_MODEL_KNOWLEDGE=true`.
- **Why it smells**:
  - LLM prior knowledge can encode social/political bias; instructing it to be used as “evidence” (and to avoid “unknown”) can amplify that.
  - This is **not partisan** per se, but it’s a *bias risk* vector.
- **Recommended change**:
  - Keep this feature gated (it is), but add stronger guardrails in the prompt:
    - Require corroboration for contentious political claims.
    - Treat “widely reported” as insufficient without sources for sensitive/contested topics.

---

### B) Source reliability / “bias” labeling (risk: perceived editorial stance)

#### B1) Hardcoded “bias” labels in MBFC loader test bundle (left/right/extreme)

- **File**: `apps/web/src/lib/mbfc-loader.ts`
- **Where**: `createTestBundle()` sample domains.
- **Examples**:
  - `bias: "left-center"`, `bias: "right"`, `bias: "extreme right"`, `bias: "least biased"`, `bias: "pro-science"`

- **Why it smells**:
  - Political-spectrum labels are inherently contested; hardcoding them (even as test data) can be perceived as endorsing a particular taxonomy.
  - “pro-science” is value-laden terminology in politicized contexts.
- **Recommended change**:
  - If test data is needed, prefer:
    - using **only** factual-reporting tiers (very high/high/mixed/low), or
    - clearly label as “illustrative sample” and avoid ideological axis labels.

#### B2) Documentation asserts MBFC is “scientifically validated” and centers “media bias” as a database

- **File**: `Docs/ARCHITECTURE/Source_Reliability.md`
- **Why it smells**:
  - Presents a potentially controversial vendor as authoritative; could be read as “FactHarbor picks a side”.
  - Even if the feature is currently marked **DISABLED**, the doc is part of the repository’s public face.
- **Recommended change**:
  - Tone down claims (“scientifically validated”) unless directly cited with specific studies.
  - Emphasize configurability and “metadata only unless user opts in”.

---

### C) Developer docs & examples (medium risk: optics + accidental reuse)

These are mostly *acceptable in intent* (often explicitly warning against hardcoding), but they still contain partisan names/examples that could be copy-pasted.

#### C1) “Bad example” includes real politicians by name

- **File**: `Docs/DEVELOPMENT/Coding_Guidelines.md`
- **Excerpt**:

```text
const keywords = ['trial', 'judgment', 'bolsonaro', 'putin', 'trump'];
```

- **Why it smells**:
  - Even in a “BAD” example, real politician names are present and can be reused.
- **Recommended change**:
  - Replace with placeholders: `['trial', 'judgment', 'PERSON_A', 'PERSON_B']`.

#### C2) KeyFactors design example uses partisan contestedBy strings

- **File**: `Docs/ARCHITECTURE/KeyFactors_Design.md`
- **Excerpt**:

```text
contestedBy: string; // "Bolsonaro supporters", "Trump administration"
```

- **Why it smells**:
  - “Trump administration” is a real political entity; it’s unnecessary for demonstrating the field semantics.
- **Recommended change**:
  - Use generic examples: “affected stakeholders”, “opposition party”, “advocacy group”, “industry association”.

#### C3) Compliance audit references a “Bolsonaro regression”

- **File**: `Docs/DEVELOPMENT/Compliance_Audit.md`
- **Why it smells**:
  - Ties the neutrality story to a specific polarizing real-world case; can be misread as “we optimize for this case”.
- **Recommended change**:
  - Use generic labels (“legal fairness regression”, “high-sensitivity political case regression”) and store the named test case separately.

---

### D) xWiki extract: analysis reports and schema examples (highest “partisan tone” concentration)

The `Docs/xwiki-extract/FactHarbor/FH Analysis Reports/` pages include real-world political subjects and **value-judgment phrasing** that reads partisan even when attempting balance.

#### D1) Bolsonaro trial fairness report contains evaluative framing and comparative political judgments

- **File**: `Docs/xwiki-extract/FactHarbor/FH Analysis Reports/FactHarbor_Analysis_Bolsonaro_Trial_Fairness/WebHome.xml`
- **Notable partisan-smelling elements**:
  - Labels like “Liberal Brazilian newspaper”
  - “history of impunity”, “Breaking impunity pattern”
  - “Brazil demonstrates accountability that US failed to achieve with Trump”
  - Inclusion of charged political quotes (“witch hunt”) is fine as attributed speech, but surrounding framing can tip into advocacy.

- **Why it smells**:
  - Cross-country “accountability” comparisons are normative and can be interpreted as taking sides.
  - “US failed … with Trump” is a political conclusion, not purely descriptive fact-checking language.
- **Recommended change**:
  - Rewrite to neutral phrasing:
    - “Some commentators argue Brazil shows stronger institutional accountability than the US response to Jan 6; others dispute this comparison.”
  - Ensure every evaluative claim is clearly attributed to a source, and separate “FactHarbor assessment” from “quoted perspective”.

#### D2) Bolsonaro report summary repeats ideological labels

- **File**: `Docs/xwiki-extract/FactHarbor/FH Analysis Reports/FactHarbor_Analysis_Bolsonaro_Trial_Fairness/Analysis Summary/WebHome.xml`
- **Notable**:
  - “Folha de S. Paulo (Brazilian liberal paper)”
  - “Trump Administration: Called it ‘witch hunt’”

- **Recommended change**:
  - Replace “liberal paper” with a neutral descriptor or omit ideology unless it is essential and sourced.

#### D3) “UN Agenda power grab” report heavily uses ideology labels and loaded framing

- **File**: `Docs/xwiki-extract/FactHarbor/FH Analysis Reports/FHA F35 Kill Switch/WebHome.xml`
- **Notable**:
  - “ultra-conservative”, “far-right”, “radical gender ideology”
  - “conspiracy-theory-laden framing”, “repeatedly debunked by fact-checkers”

- **Why it smells**:
  - Even if accurate, this style reads as editorialized; it can alienate audiences with different priors.
- **Recommended change**:
  - Use a “claim vs evidence” tone; avoid adjectives unless directly attributed with citations.

#### D4) POC schema example uses US election claim with named candidates

- **File**: `Docs/xwiki-extract/FactHarbor/Specification/POC/API-and-Schemas/WebHome.xml`
- **Excerpt**:

```text
"claim_text": "Biden won the 2020 election"
...
"explanation": "Joe Biden won 306 electoral votes vs Trump's 232"
```

- **Why it smells**:
  - Not necessary for demonstrating schema shape; can be perceived as political messaging.
- **Recommended change**:
  - Replace with neutral claim examples (science, geography, sports) or synthetic candidates (“Candidate A/B”).

---

### E) Sample artifacts / output bundles that include political figures (medium risk)

#### E1) `Docs/Job.json` includes Trump/Musk/DOGE and political manipulation claims

- **File**: `Docs/Job.json`
- **Why it smells**:
  - If used as a demo artifact or regression fixture, it can look like the project is centered on contemporary US politics.
- **Recommended change**:
  - Rename and label clearly as a *synthetic example*; or replace with a non-partisan domain (medicine, engineering, climate, etc.).

---

## Recommendations Summary (actionable)

### High priority (trust/optics)

- Remove real politician names from **production prompts** (`apps/web/src/lib/analyzer.ts` examples).
- Rewrite xWiki “analysis reports” to avoid:
  - unsupported ideological labels (“liberal paper”, “far-right”) unless essential and sourced
  - normative comparative conclusions (“US failed…”) unless presented as attributed viewpoints.

### Medium priority (reduce accidental reuse)

- Replace politician names in developer docs (`Coding_Guidelines.md`, `KeyFactors_Design.md`) with placeholders.
- Replace politicized schema/demo examples in xWiki POC docs with neutral claims.

### Ongoing guardrails

- If source reliability is re-enabled:
  - treat “bias labels” as **metadata only** by default
  - allow multiple providers / user-supplied bundles
  - avoid language that implies “bias rating = truth”.

---

## Appendix: “Smell” heuristic checklist (for future PR review)

- Any **real political figure / party / ideology label** in prompts, templates, default configs, or demo fixtures.
- Any **value-judgment adjectives** not explicitly attributed (“unprecedented accountability”, “debunked”, “far-right”) in reports/docs.
- Any reliance on a third-party “bias” taxonomy without clear opt-in, transparency, and configurability.

