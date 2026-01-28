# Terminology Addendum: Evidence Entity (Field Proposal + Probative Rule)

**Date**: 2026-01-28  
**Status**: Proposal only (no implementation in this document)  
**Companion**: `Docs/REVIEWS/Terminology_Audit_Fact_Entity.md`  

---

## 1. Scope and non-goals

### In scope
- Document the **current ground truth** of evidence-related types in code (what already exists).
- Propose a clear **Evidence entity definition** with fields (conceptual + mapping to current TS interfaces).
- Define the rule: **non-probative (“0 evidence”) items must not be used** by the system, and propose where to enforce this (prompt + deterministic post-process).

### Out of scope (explicitly)
- No renames, no schema changes, no runtime changes, no xWiki edits in this task.
- No attempt to fully normalize the data model (e.g., storing claim↔evidence edges as first-class DB entities).

---

## 2. Current ground truth (what we already have)

### 2.1 `EvidenceScope` already exists

In `apps/web/src/lib/analyzer/types.ts`, the system already defines a per-item **EvidenceScope**:
- `EvidenceScope.name` (short label)
- Optional: `methodology`, `boundaries`, `geographic`, `temporal`

This is already attached as `ExtractedFact.evidenceScope?: EvidenceScope`.

**Important**: `EvidenceScope` is **not** the same concept as **AnalysisContext**.
- **EvidenceScope**: metadata about a *source document’s* boundaries/methodology/time/geography.
- **AnalysisContext**: a top-level bounded analytical frame that should be analyzed separately.

### 2.1.1 Code anchors (for reviewers)

- `apps/web/src/lib/analyzer/types.ts`
  - `export interface EvidenceScope { ... }`
  - `export interface ExtractedFact { ... evidenceScope?: EvidenceScope; ... }`
  - `export interface ClaimVerdict { ... supportingFactIds: string[]; ... }`

### 2.2 `ExtractedFact` is the current “evidence item” entity (despite the name)

In `apps/web/src/lib/analyzer/types.ts`, `ExtractedFact` is the atomic extracted item type with (among others):
- `id`
- `fact` (string statement text)
- `category`, `specificity`
- provenance fields: `sourceId`, `sourceUrl`, `sourceTitle`, `sourceExcerpt`
- optional routing/meta: `contextId?`, `claimDirection?`, `fromOppositeClaimSearch?`
- optional `evidenceScope?`

The type name and some field names are legacy (“Fact”), but the data is already **extracted evidence items**.

### 2.3 Claim↔evidence linkage exists only as “supporting evidence IDs”

The primary existing claim-to-evidence linkage is:
- `ClaimVerdict.supportingFactIds: string[]` (legacy name, but these point into the analysis `facts[]` array).

This is a **partial edge**:
- it typically captures only “supporting evidence”, and
- it does not encode direction/strength/contestation per-claim.

---

## 3. Findings (terminology + quality impact)

### 3.1 Why “Fact” harms both model behavior and UI interpretation

Using “fact” as the dominant word creates a subtle but persistent bias:
- It implies the system already has truth, rather than *evidence to be evaluated*.
- It makes it easier for the pipeline (and the reader) to treat extracted items as authoritative.
- It increases the chance that “weak or non-probative items” are treated as “some evidence exists”, even when the correct behavior is “no usable evidence”.

### 3.2 “Unverified evidence statement” is directionally correct but still incomplete

The phrase “unverified evidence statement” is a good improvement over “fact”, but it can still mislead because it frames the item as “evidence” regardless of its probative value.

**Key requirement clarified by the user**:
- Evidence items can vary from **very strong** to **very weak**.
- At the extreme low end (**probative value ~0**), the item should **not be used** by the system (it is “non-evidence” for decision-making purposes).

This suggests the system needs an explicit concept of:
- **probative value / usability** (even if only as an internal filter).

---

## 4. Proposed Evidence entity model (with all fields)

### 4.1 Naming recommendation (non-breaking)

Keep JSON field names stable for now, but introduce better **TypeScript-facing names**:

- **`EvidenceItem`**: the atomic extracted item (maps 1:1 to today’s `ExtractedFact`)
- **`EvidenceClaimLink`**: a claim-specific relationship edge (optional; maps beyond today’s `supportingFactIds`)

Then keep backward compatibility via type aliases:
- `type ExtractedFact = EvidenceItem` (deprecated)

This matches the “alias now” strategy without forcing a breaking rename.

### 4.2 `EvidenceItem` (atomic extracted evidence)

**Definition**: an evidence-candidate snippet extracted from a source, with provenance and optional scope metadata. It is *not* assumed true.

Fields:
- **Identity**
  - `id: string` (stable within a job; ideally deterministic)
- **Core content**
  - `statement: string` (the extracted text snippet; legacy name is `fact`)
- **Classification**
  - `category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism"`
  - `specificity: "high" | "medium" | "low"` *(note: today it’s `"high" | "medium"` only)*
- **Provenance (mandatory for probative use)**
  - `source: { id: string; url: string; title: string; excerpt: string }`
- **EvidenceScope (per-item, from the source)**
  - `evidenceScope?: EvidenceScope`
- **Analysis routing**
  - `contextId?: string` (assignment to an AnalysisContext)
- **Thesis-level direction hint (optional; relative to the user’s thesis, not per sub-claim)**
  - `thesisDirection?: "supports" | "contradicts" | "neutral"` *(today: `claimDirection`)*  
  - `fromOppositeClaimSearch?: boolean`
- **Contestation metadata (optional; used cautiously)**
  - `isContestedClaim?: boolean`
  - `claimSource?: string`
- **Probative value (required concept; can be implicit or explicit)**
  - `probative: { score: number; reason?: string }`
    - `score ∈ [0, 1]`
    - `score = 0` ⇒ item must be dropped from downstream reasoning/weighting

### 4.3 `EvidenceClaimLink` (claim-specific relation)

**Definition**: links an `EvidenceItem` to a particular claim, with direction and strength.

Fields:
- **References**
  - `claimId: string` *(your ClaimReference)*
  - `evidenceId: string`
- **Directional support (per claim)**
  - `supportsClaim: number` in \([-1, +1]\)
    - -1: strongly contradicts claim
    -  0: neutral / irrelevant to claim
    - +1: strongly supports claim
- **Strength**
  - `strength: number` in \([0, 1]\)
    - interpret as “probative strength for this claim”, combining relevance + credibility
- **Contestation / conflict structure**
  - `contestingEvidenceIds?: string[]` *(your ContestingEvidenceList)*
  - `rationale?: string` (brief)

### 4.4 Mapping to current implementation (explicit)

| Proposed | Current (TypeScript / JSON) | Notes |
|---|---|---|
| `EvidenceItem.id` | `ExtractedFact.id` | Already present |
| `EvidenceItem.statement` | `ExtractedFact.fact` | Legacy field name |
| `EvidenceItem.category` | `ExtractedFact.category` | Already present |
| `EvidenceItem.specificity` | `ExtractedFact.specificity` | Consider adding `"low"` later |
| `EvidenceItem.source.id` | `ExtractedFact.sourceId` | Already present |
| `EvidenceItem.source.url` | `ExtractedFact.sourceUrl` | Already present |
| `EvidenceItem.source.title` | `ExtractedFact.sourceTitle` | Already present |
| `EvidenceItem.source.excerpt` | `ExtractedFact.sourceExcerpt` | Already present |
| `EvidenceItem.contextId` | `ExtractedFact.contextId?` | Already present |
| `EvidenceItem.thesisDirection` | `ExtractedFact.claimDirection?` | Thesis-level hint only |
| `EvidenceItem.fromOppositeClaimSearch` | `ExtractedFact.fromOppositeClaimSearch?` | Already present |
| `EvidenceItem.evidenceScope` | `ExtractedFact.evidenceScope?` | Already present |
| `EvidenceItem.probative` | (not explicit today) | Must be enforced by prompt + filter |
| `EvidenceClaimLink` | (not explicit today) | Closest existing is `supportingFactIds` |

---

## 5. Probative-value rule (“0 evidence must not be used”)

### 5.1 Definition (generic)

An extracted item is **probative** if it provides information that can reasonably change an assessment of one or more claims, *given its provenance and specificity*.

**Important nuance**: “probative” is not the same as “true”.
- An evidence item can be **probative even if it is later judged incorrect**, as long as it is concrete, attributable to a source, and relevant to a claim.
- The filter should remove items that are **not usable for reasoning**, not items that are merely “unverified”.

An extracted item is **non-probative** (score = 0) if it is primarily:
- vague, non-falsifiable, or purely rhetorical,
- missing actionable provenance (no meaningful excerpt / unclear what supports the statement),
- duplicative paraphrase without additional detail,
- purely meta commentary about “debate/controversy exists” with no concrete content,
- irrelevant to the user’s thesis and to any extracted claim.

**Minimum “usable evidence” criteria (suggested)**
- Has a non-trivial statement (`statement.length` above a small threshold).
- Has usable provenance:
  - `sourceUrl` present, and
  - `sourceExcerpt` present and not trivially short.
- Is not an obvious duplicate of another item in the same job (exact-match or near-exact paraphrase) unless it adds distinct `EvidenceScope` or other differentiating details.

### 5.2 Enforcement points (no implementation here; design guidance)

**A) Prompt-side enforcement (during extraction)**
- In the extraction instructions, require each item to meet minimum constraints such as:
  - includes a concrete assertion (not just sentiment),
  - includes an excerpt that supports the extracted statement,
  - includes enough specificity to be used for later reasoning.
- Instruct the model to **omit** items that do not meet those constraints (do not emit “filler” items to reach quotas).

**B) Deterministic post-process enforcement (after extraction)**
- Add a conservative filter function conceptually like `filterEvidenceByProbativeValue()` that:
  - removes items failing minimal criteria (e.g., empty excerpt, too vague, obvious duplication),
  - logs why items were dropped (structured) for debugging and transparency.

**Suggested logging shape (for debug only)**
- Total extracted vs kept.
- Per-drop reason counts (e.g., `missing_excerpt`, `too_vague`, `duplicate`, `irrelevant`).
- For each dropped item: `id`, short preview, and primary drop reason.

This two-layer approach is robust because:
- prompt enforcement reduces garbage generation,
- deterministic filtering provides a safety net when the model still emits low-value items.

### 5.3 Interaction with “contested” / baseless contradiction

Non-probative “contradictions” should not be upgraded to “contested”.
- If a contradiction lacks concrete/probative backing, it should be treated as **doubt/opinion** at most, or ignored.
- This is consistent with avoiding “contested overuse” in politically charged or low-quality sources.

---

## 6. Migration path (minimal risk, aligned with the existing audit)

### Recommended path (non-breaking)
- Introduce `EvidenceItem` and alias `ExtractedFact` to it (deprecated) in TypeScript.
- Keep JSON field names (`facts`, `fact`, `supportingFactIds`) for backward compatibility with stored job results.
- Gradually shift UI labels and comments to “Evidence” (already started in some places).

### Deferred (later) improvements
- Add explicit claim↔evidence edges (`EvidenceClaimLink`) when the pipeline is ready to emit/consume them.
- Consider expanding `specificity` to include `"low"` for better filtering and downstream weighting.

---

## 7. Follow-ups / notes for reviewers (no action here)

### 7.1 Diagrams still using “Facts” terminology

`Docs/REVIEWS/Orchestrated_Report_Quality_Regression_Analysis.md` diagrams currently include nodes like:
- `Facts[ExtractedFact_List]`
- `EvidenceScope_PerFactMetadata`
- `Facts_JSON with EvidenceScope per fact`

These should be updated in a later doc pass to consistently use “Evidence” terminology, while preserving legacy field-name notes where needed.

**Concrete references (for the future doc edit)**
- `Docs/REVIEWS/Orchestrated_Report_Quality_Regression_Analysis.md` contains these strings in the Conceptual Model diagrams near:
  - `Sources --> Facts[ExtractedFact_List]`
  - `Facts --> EvidenceScope[EvidenceScope_PerFactMetadata]`
  - `EF --> FO[Facts_JSON with EvidenceScope per fact]`

### 7.2 Open decisions
- Should the public-facing conceptual term be **EvidenceItem** or just **Evidence**?
- Should claim-links be stored explicitly (best long-term), or inferred only from verdict artifacts (lowest change)?
- Should the system standardize a “probative minimum” as a hard gate (recommended), and what the minimum criteria are (keep generic)?

