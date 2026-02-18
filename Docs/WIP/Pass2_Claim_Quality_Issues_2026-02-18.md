# Pass 2 Claim Quality Issues: impliedClaim Overexpansion & Evidence-as-Claims

**Date**: 2026-02-18
**Role**: LLM Expert
**Status**: Analysis Complete — Proposals Ready
**Report**: `6317f52b158646ee80263bd28e682340` (German input, ClaimBoundary pipeline)
**Input**: "Die Medien des SRF berichten politisch ausgewogen." (approx.)

---

## Problem A: impliedClaim Overexpansion

### What Happened

| Field | Value |
|-------|-------|
| **articleThesis** | "Die Medien des SRF berichten politisch ausgewogen." |
| **impliedClaim** | "Die Medien des Schweizer Radio und Fernsehens (SRF) berichten politisch ausgewogen **und neutral** über Volksabstimmungen **und politische Themen**, positionieren sich **nahe am Durchschnitt des politischen Spektrums** und **erfüllen die Anforderungen an unparteiliche öffentliche Berichterstattung**." |

The LLM expanded a short, open claim into a very specific interpretation that:
1. Added "neutral" (the input only said "ausgewogen"/balanced)
2. Narrowed to "Volksabstimmungen und politische Themen" (the input didn't specify topic areas)
3. Added specific positioning claim ("nahe am Durchschnitt des politischen Spektrums") that came from the **preliminary evidence**, not the input
4. Added "erfüllt die Anforderungen an unparteiliche Berichterstattung" — a normative/evaluative judgment not present in the input

### Why This Is Dangerous

The `impliedClaim` is used downstream as the **thesis** against which all evidence is evaluated. By locking in one specific interpretation (the fög study's framing), the pipeline:

- **Precludes alternative interpretations**: "Ausgewogen" could mean balanced topic selection, equal airtime, diversity of guests, etc. The pipeline chose "political positioning on a left-right axis" because that's what the preliminary evidence happened to contain.
- **Creates confirmation bias**: Evidence that supports this specific framing scores high; evidence about other dimensions of "Ausgewogenheit" gets classified as merely "contextual."
- **Violates input neutrality**: The same input might get a different impliedClaim depending on which preliminary search results come back first — the thesis should be stable regardless of evidence.

### Root Cause: Prompt Design

The CLAIM_EXTRACTION_PASS2 prompt says:

> `"impliedClaim": "string — refined overall thesis (informed by evidence)"`

The word **"refined"** and **"informed by evidence"** are the problem. The LLM interprets this as an instruction to elaborate and narrow the thesis using what it found in the preliminary evidence. This is exactly backwards: **the thesis should stay close to the original input; only the atomic claims should be evidence-informed.**

### Severity: HIGH

This affects every analysis. Short inputs are most vulnerable because the LLM has more "room" to expand. The expansion always reflects the preliminary evidence, creating a feedback loop where early search results determine the analytical frame.

---

## Problem B: Atomic Claims Are Evidence Reports, Not Claims

### What Happened

**AC_01** (the primary claim):
> "Das Forschungszentrum Öffentlichkeit und Gesellschaft (fög) der Universität Zürich stellte in einer Analyse der Berichterstattung über 44 Volksabstimmungen zwischen 2018 und 2023 in 23 Schweizer Medien fest, dass SRF mit einem Wert von -1 auf einer Links-rechts-Achse von -100 bis +100 eine politisch neutrale Positionierung aufweist und sich relativ nahe am Durchschnitt des politischen Spektrums positioniert."

This is **not a claim from the user's input**. This is a **summary of a research finding discovered during the preliminary search**. It's an evidence report packaged as a claim.

**AC_04** has the same problem:
> "In der Berichterstattung über Volksabstimmungen zwischen 2018 und 2023 in 23 Schweizer Medien wurden Vorlagen von Mitte-links wie die 'Ehe für alle' oder die Pflegeinitiative in den meisten Medien positiver beurteilt..."

Again: this is a **finding from a study**, not a claim the user made. The user said "SRF berichtet ausgewogen." The pipeline turned that into specific research findings and then searched for evidence to verify those findings — essentially asking "did this study find what this study found?"

### Why This Is Wrong

1. **Circular reasoning**: The claim was derived from the evidence, then the same evidence is used to verify it. Of course it "supports" the claim — the claim was extracted from it.

2. **The user's actual claim is lost**: The user asked whether SRF reports in a balanced way. Instead of searching broadly for evidence about SRF's balance, the pipeline searched for one specific study's findings. Other dimensions of "Ausgewogenheit" (guest diversity, topic selection, framing) were never investigated.

3. **Meta-claim violation**: The prompt explicitly says:
   > "Do NOT extract meta-claims: Claims about the existence, publication, or authorship of studies/reports are NOT verifiable assertions."

   AC_01 is exactly this pattern: "Study X found Y." The prompt rule exists but the LLM ignored it because the preliminary evidence was so rich with specific findings that the LLM couldn't resist incorporating them into the claim statements.

### Root Cause: Preliminary Evidence Contamination

The design of Pass 2 is:
1. Pass 1 → rough claims → preliminary search → fetch pages → extract evidence
2. Pass 2 receives: original input + preliminary evidence → extracts refined atomic claims

The problem is that the preliminary evidence is **too detailed and too dominant**. When the LLM receives the original short input ("SRF berichtet ausgewogen") alongside 10+ detailed evidence items with specific metrics, study names, and scores, the evidence overwhelms the input. The LLM constructs claims that describe the evidence rather than decomposing the user's assertion.

This is compounded by the Pass 2 prompt instruction:
> "Use the preliminary evidence to inform claim precision — reference specific methodologies, metrics, and scope boundaries where the evidence reveals them."

The LLM is literally told to incorporate evidence details into the claims. For a short input, this means the evidence **becomes** the claim.

### Severity: HIGH

This affects any analysis where the preliminary evidence is specific and the user input is general. The more general the input, the worse the contamination.

---

## Proposals

### Proposal 1: Anchor the impliedClaim to the Input (Quick Fix)

**Change the Pass 2 prompt** to make `impliedClaim` and `articleThesis` functionally identical to the user's input, not an evidence-informed expansion:

**Current prompt:**
```
"impliedClaim": "string — refined overall thesis (informed by evidence)",
"articleThesis": "string — the thesis being evaluated",
```

**Proposed:**
```
"impliedClaim": "string — the user's central assertion, restated precisely. Do NOT expand, narrow, or add specifics from the evidence. Stay faithful to what the user actually stated.",
"articleThesis": "string — identical to impliedClaim in most cases. This is the thesis all evidence is evaluated against.",
```

Add an explicit rule:
> **The impliedClaim must be derivable from the input text alone.** Do not add information from the preliminary evidence. If the input is "X is Y", the impliedClaim should be "X is Y" (with minimal rephrasing for clarity), NOT "X is Y because study Z found W."

**Effort**: 15 minutes (prompt text change only)
**Risk**: Low — only changes descriptive text in the prompt
**Impact**: High — prevents thesis drift on every analysis

### Proposal 2: Separate Claim Extraction from Evidence Details (Medium Fix)

**Add a validation rule** to the Pass 2 prompt that makes the LLM self-check:

> **Self-check before finalizing each atomic claim**: Could this claim have been written WITHOUT reading the preliminary evidence? If not, you are writing an evidence report, not extracting a claim from the input. Rewrite it as the underlying verifiable assertion.

Example transformation:
- BAD: "Das fög stellte in einer Analyse... fest, dass SRF mit einem Wert von -1... eine neutrale Positionierung aufweist"
- GOOD: "SRF positioniert sich auf einer politischen Links-rechts-Achse nahe dem Durchschnitt"

The good version is still precise (references the left-right axis), but it's a **claim to be verified**, not a **citation of a finding**.

**Effort**: 30 minutes (prompt enhancement + testing)
**Risk**: Low-medium — the LLM might over-correct and produce vague claims
**Impact**: High — directly addresses the circular reasoning problem

### Proposal 3: Restructure Pass 2 Input to Reduce Evidence Dominance (Deeper Fix)

Instead of passing full preliminary evidence items to Pass 2, pass only a **compressed summary**:

```typescript
// Current: full evidence items
preliminaryEvidence: JSON.stringify(
  preliminaryEvidence.map((pe) => ({
    statement: pe.statement,
    sourceUrl: pe.sourceUrl,
    sourceTitle: pe.sourceTitle,
    evidenceScope: pe.evidenceScope,
  })),
  null, 2,
),

// Proposed: compressed topic signals only
preliminaryEvidenceTopics: JSON.stringify({
  topicsFound: [...new Set(preliminaryEvidence.map(pe => pe.evidenceScope?.methodology))],
  temporalRange: "derived min-max",
  sourceCount: preliminaryEvidence.length,
  // NO specific findings, NO metrics, NO study names
})
```

This gives Pass 2 enough information to know **what dimensions of evidence exist** without providing the specific findings that contaminate claim extraction.

**Effort**: 1-2 hours (code change + prompt update + testing)
**Risk**: Medium — may reduce claim precision for complex inputs where evidence-informed claims are actually useful
**Impact**: High — structurally prevents evidence contamination

### Proposal 4: Add a Claim-Input Fidelity Check (Gate Enhancement)

Add a post-Pass-2 validation step that checks: **can each atomic claim be traced back to the user's input?**

This could be:
- A lightweight LLM call (Haiku) that scores each claim's fidelity to the original input (0-1)
- Claims scoring below 0.5 are flagged for rewriting
- Or: add it as a criterion in Gate 1 (which currently only checks opinion + specificity)

**Effort**: 2-4 hours (new LLM call or Gate 1 enhancement)
**Risk**: Low — additive, doesn't change existing logic
**Impact**: Medium — catches the problem but doesn't prevent it

---

## Recommendation

**Implement Proposals 1 + 2 immediately** (same session, ~45 min total). They are prompt-only changes with no code risk and directly address both problems.

**Evaluate Proposal 3** as a follow-up if Proposals 1+2 don't sufficiently reduce evidence contamination in practice. Proposal 3 requires code changes and careful testing.

**Defer Proposal 4** — it adds an LLM call and complexity. Better to prevent the problem at the source (Proposals 1-3) than to detect it after the fact.

---

## Related Issues

- The `groundingQuality` field was designed to track how much each claim was informed by evidence vs. pure extraction. Both AC_01 and AC_04 correctly have `"groundingQuality": "strong"` — but this currently means "good" when it should be a **warning** for claims that are too evidence-derived.
- The preliminary search is currently searching based on Pass 1 rough claims, which are already reasonably close to the user's input. The contamination happens in Pass 2, not in Pass 1.

---

## Files Referenced

| File | Relevance |
|------|-----------|
| `apps/web/prompts/claimboundary.prompt.md` | CLAIM_EXTRACTION_PASS2 section — prompt text to modify |
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | `runPass2()` function — evidence input structure |
| `Docs/TESTREPORTS/6317f52b158646ee80263bd28e682340.json` | Example report showing both problems |
