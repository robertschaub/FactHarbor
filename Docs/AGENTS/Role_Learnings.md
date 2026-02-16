# Role Learnings Log

**Purpose:** Agents append learnings here during or after task completion. The Captain periodically reviews and promotes valuable entries into the Role Registry (`Multi_Agent_Collaboration_Rules.md` §2).

**Format:** Append new entries at the bottom of the relevant role section. Do NOT edit or delete existing entries — only the Captain curates this file.

---

## How to Contribute

After completing a task, if you discovered something that would help future agents in your role, append an entry:

```markdown
### {Date} — {Brief Title}
**Role:** {your role}  **Agent/Tool:** {e.g., Claude Code, Cursor, Cline}
**Category:** {tip | gotcha | missing-doc | wrong-assumption | useful-pattern | new-file}
**Learning:** {1-3 sentences: what you learned, why it matters, what to do differently}
**Files:** {relevant file paths, if any}
```

**Categories explained:**
- **tip**: Useful technique or shortcut for this role
- **gotcha**: Something that tripped you up or wasted time
- **missing-doc**: Documentation gap you had to work around
- **wrong-assumption**: An assumption from the role guidance that turned out to be incorrect
- **useful-pattern**: A code or workflow pattern worth reusing
- **new-file**: A new file was created that future agents should know about

---

## Lead Architect

### 2026-02-16 — Two-pass claim extraction is worth the extra LLM cost
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When claims are the sole research driver (no AnalysisContext framing), claim quality becomes the single most important pipeline input. A two-pass extraction (quick scan → preliminary search → evidence-grounded re-extraction) costs 3–5 extra Haiku calls but produces significantly more specific, research-ready claims. The preliminary evidence also seeds the main research loop, avoiding redundant re-fetching. This pattern applies whenever an LLM extraction task benefits from real-world grounding rather than relying on parametric knowledge alone.
**Files:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.1

### 2026-02-16 — Make EvidenceScope mandatory at prompt level, not schema level
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** When a downstream architecture depends on metadata quality (e.g., ClaimBoundary clustering depends on EvidenceScope), making fields required in the TypeScript schema is necessary but not sufficient — the LLM must be prompted with source-type-specific examples showing what meaningful scope data looks like even for non-scientific sources. A news article has methodology="journalistic reporting, single-source attribution" and temporal="2025-09 (publication date)". Without these examples, the LLM defaults to empty strings regardless of schema requirements. Combine prompt examples + Zod validation + retry for best results.
**Files:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.2

### 2026-02-16 — Multi-reviewer brainstorming produces better architecture than solo design
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** The LLM debate pattern, triangulation scoring, and self-consistency check were all proposed during a brainstorming round and refined by 3 reviewers (Lead Architect, Lead Developer, Senior Architect). Key improvements came from the Lead Developer (Sonnet over Haiku for self-consistency, scope reduction for per-boundary verdicts, verdict-stage.ts module extraction) and Senior Architect (claim quality gate retry, structural consistency check, derivative validation). The brainstorming → per-idea assessment → convergence workflow produced a richer design than any single reviewer would have achieved. Document brainstorming ideas in a separate file from the main architecture doc to keep the review process clean.
**Files:** `Docs/WIP/ClaimBoundary_Brainstorming_Ideas_2026-02-16.md`, `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §22

### 2026-02-16 — Categorical vs continuous field design rule saves LLM consistency debates
**Role:** Lead Architect  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** The D5 field granularity discussion revealed a clean design rule: "Categorical for LLM classification outputs, continuous for LLM assessment outputs." LLMs produce categorical outputs (high/medium/low) more reliably than numeric ones (0.73). Fields used as gate thresholds or formula multipliers should be categorical (the LLM picks a bucket); fields used as direct numeric inputs in formulas (truth%, confidence, specificityScore) should be continuous. Applying this rule upfront — rather than debating each field individually — resolved 6 field granularity decisions in a single pass. Future type design should apply this rule before asking "how many levels."
**Files:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.1, §9.1

## Lead Developer

### 2026-02-16 — Cross-check codebase before assessing brainstorming ideas
**Role:** Lead Developer  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** When reviewing architecture proposals with brainstorming ideas, always cross-check the current codebase for integration points BEFORE writing the assessment. For the ClaimBoundary brainstorming review, discovering that (a) verdict temperature is hardcoded at 0.3 (not configurable), (b) aggregation uses a pluggable multiplicative weight chain, and (c) the current pipeline has 3 verdict paths (which the new pipeline collapses to 1) changed my recommendations materially. Without the cross-check, I would have underestimated Idea E's deterministic-mode conflict and overestimated Idea C's integration effort.
**Files:** `apps/web/src/lib/analyzer/aggregation.ts`, `apps/web/src/lib/analyzer/config.ts` (getDeterministicTemperature), `apps/web/src/lib/analyzer/orchestrated.ts` (verdict generation lines 7948-10710)

## Senior Developer

_(No entries yet)_

## Technical Writer

### 2026-02-15 — External link syntax for the xWiki viewer
**Role:** Technical Writer / xWiki Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** The xwiki-viewer.html detects external links by checking if the href starts with `https://`. Use `[[label>>https://url]]` syntax. Do NOT use xWiki's `url:` prefix (`[[label>>url:https://...]]`) or `||target="_blank"` parameter — the viewer doesn't parse those. The viewer automatically adds `target="_blank" rel="noopener"` to all https:// links. Bold wrapping works: `**[[label>>https://url]]**`.
**Files:** `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` (line ~721, `inl()` method)

## LLM Expert

### 2026-02-13 — Context ID similarity threshold rationale (0.65)
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** tip
**Learning:** The 0.65 threshold for `oldToNewSimilarityThreshold` is intentionally looser than dedup (0.85) because context refinement often reframes names significantly while preserving analytical scope. Since this is mapping (not merging), a false positive is recoverable — `ensureContextsCoverAssignments` restores original contexts for anything the LLM similarity layer misses. When tuning, tighten toward 0.75 if you see incorrect cross-context remaps in logs; loosen toward 0.55 only if refinement is aggressively rewriting context names.
**Files:** `apps/web/src/lib/analyzer/orchestrated.ts` (buildOldToNewContextRemap), `apps/web/configs/calculation.default.json`

### 2026-02-13 — One-to-many context splits not covered by Phase 4b
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** When refinement splits one old context into two new ones (e.g., "EU economic policy" → "EU fiscal" + "EU trade"), claims from the old context can only map to one new context (best-match wins). The unmapped claims fall through to `ensureContextsCoverAssignments` which restores the original context — acceptable but suboptimal. A future improvement could detect 1:N splits and distribute claims by sub-topic relevance via an additional LLM call.
**Files:** `apps/web/src/lib/analyzer/orchestrated.ts` (lines 2152-2167)

### 2026-02-13 — assessTextSimilarityBatch is the shared workhorse for all semantic similarity
**Role:** LLM Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** useful-pattern
**Learning:** `assessTextSimilarityBatch()` is reused across context dedup, evidence dedup, frame signal detection, anchor recovery, and now Phase 4b context remap — 14+ call sites. Any prompt or behavioral change to `TEXT_SIMILARITY_BATCH_USER` affects all of these. Always regression-test broadly when modifying this function or its prompt. The 200-char truncation per text is safe for context descriptions (typically <150 chars) but could clip long evidence statements in other call sites.
**Files:** `apps/web/src/lib/analyzer/orchestrated.ts` (assessTextSimilarityBatch, line 1995), `apps/web/prompts/orchestrated.prompt.md` (TEXT_SIMILARITY_BATCH_USER)

## Product Strategist

_(No entries yet)_

## Code Reviewer

_(No entries yet)_

## Security Expert

_(No entries yet)_

## DevOps Expert

### 2026-02-15 — Viewer is shared between FactHarbor and BestWorkplace
**Role:** DevOps Expert / xWiki Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** `xwiki-viewer.html` is identical in both FactHarbor and BestWorkplace repos (`C:\DEV\BestWorkplace`). Any change to the viewer must be copied to both repos, then both must be pushed to trigger their respective GitHub Actions gh-pages deployments. The `build_ghpages.py` scripts differ between repos (BestWorkplace has extra image/attachment patches), so only the viewer HTML is shared — the build scripts are independent.
**Files:** `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html` (both repos)

### 2026-02-15 — build_ghpages.py uses exact string patches on the viewer
**Role:** DevOps Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** `build_ghpages.py` applies changes to the viewer HTML via Python `str.replace()` with exact string matching. If you modify lines in the viewer that are also patch targets, the patches will silently fail (no error, just no replacement). After modifying the viewer, always verify that all `html.replace(...)` calls in both repos' `build_ghpages.py` still find their target strings. BestWorkplace's build script has 2 additional patches (#12, #13 for image rendering) not in FactHarbor's.
**Files:** `Docs/xwiki-pages/scripts/build_ghpages.py` (both repos), `Docs/xwiki-pages/viewer-impl/xwiki-viewer.html`

### 2026-02-15 — GitHub OAuth token needs `workflow` scope for pushing workflow files
**Role:** DevOps Expert  **Agent/Tool:** Claude Code (Opus 4.6)
**Category:** gotcha
**Learning:** When creating a new repo and pushing `.github/workflows/` files, the `gh` CLI token may lack the `workflow` scope, causing a push rejection. Workaround: commit and push everything except the workflow file first, then add the workflow in a subsequent commit. Alternatively, re-authenticate with `gh auth login` and grant the `workflow` scope.
**Files:** `.github/workflows/deploy-docs.yml`

---

## Captain Review Log

When the Captain reviews and promotes learnings, record it here:

| Date | Entries Reviewed | Promoted to Registry | Discarded | Notes |
|------|-----------------|---------------------|-----------|-------|
| _(none yet)_ | | | | |
