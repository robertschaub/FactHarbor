# Coding Agent Prompts

## Phase 2.4 — SR Cache TTL + Web-Search Augmented SR Evaluation

**Context:** Phase 2.3 complete (commit `5120b864`). Phase 2.4 TTL option approved (Option B — per-category TTL). A second deliverable has been added: web-search augmented SR evaluation, which is the primary fix for the regime-change / recently-discredited-source problem. Full plan: `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`.

---

### Open items carried forward

| Item | Priority | Status |
|------|----------|--------|
| D2: Classification instability (`question` vs `ambiguous_single_claim`) | LOW | Deferred |
| D4: Gate 1 `passedSpecificity` cleanup | LOW | Deferred |
| `maxTokens: 16384` UCM-configurable | LOW | Noted for future tidy-up |

---

### Phase 2.4 Commit 1 — Per-category SR cache TTL (approved, no Captain approval needed)

TTL decision already made. Implement directly.

**Approved TTL values (Option B — by reliability category):**

| Category | TTL |
|----------|-----|
| `highly_reliable` | 60 days |
| `leaning_reliable` | 45 days |
| `mixed_reliability` / `unknown` | 21 days |
| `leaning_unreliable` | 14 days |
| `unreliable` | 7 days |

**Implementation:**
1. Add `srCacheTtlByCategory` to `SourceReliabilityConfigSchema` in `config-schemas.ts` — object keyed by category string, values are day counts
2. Set the approved values as defaults in `pipeline.default.json`
3. In `source-reliability.ts` at `setCachedScore`: look up TTL by category from config; fall back to flat `cacheTtlDays` for any unrecognised category — **the fallback is mandatory, do not remove `cacheTtlDays`**
4. Unit test: verify per-category TTL is applied correctly + unrecognised category falls back to flat value
5. Run `npm test`

---

### Phase 2.4 Commit 2 — Web-search augmented SR evaluation (prompt change requires Captain approval)

**Why this matters:** Reducing TTL to 60 days and re-evaluating via LLM doesn't solve the regime-change problem. If an LLM's training data shows a government domain as "highly reliable", every re-evaluation produces the same stale answer — the LLM simply doesn't know about recent credibility changes. The fix is to give the LLM *current* information at SR evaluation time via web search.

**Design:**

At the SR cache-miss path in `source-reliability.ts`, before calling the LLM to score a domain:
1. Run a targeted web search for recent credibility signals about the domain
2. Inject search results as context into the SR LLM call
3. The LLM now has current information (fact-checker ratings, recent criticism, editorial-standards coverage) when making its judgment

**Search query:** UCM-configurable template with `{domain}` placeholder. Default:
```
"{domain} credibility reliability bias fact-check"
```
Store as `srCredibilitySearchQueryTemplate` in `SourceReliabilityConfigSchema`. The `{domain}` token is replaced at runtime.

**Constraints:**
- Only fire the search on a **cache miss that proceeds to LLM evaluation** — not on every SR lookup
- Pass up to **5 search result snippets** (title + excerpt) to the LLM as context
- If web search fails or returns zero results: log at `info` level, proceed with LLM-only assessment (existing behaviour). This must be graceful — SR evaluation must never crash due to a search failure
- Uses existing web search infrastructure (`web-search.ts`) — no new dependencies

**Prompt change (Captain approval required before committing):**

The SR evaluation prompt needs a new section to accept web search context. Draft and post the exact prompt diff here before committing. The change should:
- Add a conditional section: "Recent web search results about this source (if available): [snippets]"
- Instruct the LLM to weight recent credibility signals over training-data assumptions when they conflict
- Keep the change minimal — one new section, no restructuring of the existing prompt

**UCM additions:**
- `srCredibilitySearchQueryTemplate` — string, default as above
- Both new fields go in `SourceReliabilityConfigSchema`

**Unit tests:**
- Graceful fallback: when search returns no results, SR evaluation still completes
- Graceful fallback: when search throws, SR evaluation still completes
- Search query is constructed correctly from the template (domain substitution works)

Run `npm test` after both commits.

---

### Phase 2.5 — Scope Normalization

**Goal:** Detect and merge EvidenceScope instances that represent the same temporal/methodological scope but were created as separate entries.

**Design constraint:** Scope equivalence detection MUST use LLM intelligence — per AGENTS.md LLM Intelligence mandate. Propose approach for Captain review before writing any code.

---

### Validation baseline (current)

| Input | Path | Expected truth% | Expected conf% |
|-------|------|----------------|---------------|
| "Was Iran making nukes?" | question/claim path | 60–87% | 70–85% |
| "Was the Bolsonaro judgment fair?" | question | 68–85% | 70–85% |
| "Hydrogen more efficient than electricity for cars" | claim | 25–45% | — |
