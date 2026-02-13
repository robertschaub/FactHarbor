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

_(No entries yet)_

## Lead Developer

_(No entries yet)_

## Senior Developer

_(No entries yet)_

## Technical Writer

_(No entries yet)_

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

_(No entries yet)_

---

## Captain Review Log

When the Captain reviews and promotes learnings, record it here:

| Date | Entries Reviewed | Promoted to Registry | Discarded | Notes |
|------|-----------------|---------------------|-----------|-------|
| _(none yet)_ | | | | |
