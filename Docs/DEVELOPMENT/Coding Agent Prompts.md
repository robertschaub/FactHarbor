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

### Phase 2.4 Commit 1b — Per-sourceType SR cache TTL (schema change — do before Commit 2)

**This extends Commit 1.** Add `source_type` to the SR cache and a per-sourceType TTL map to UCM. This is the actual fix for the regime-change (reliable → unreliable) scenario — `government` sources now expire in 21 days instead of 60.

**Schema change:** Add `source_type TEXT` column to the SR cache table in `source-reliability-cache.ts`. Requires a migration (add column with `ALTER TABLE ... ADD COLUMN source_type TEXT` — SQLite supports this safely with no data loss).

**Store sourceType at write-time:** In `setCachedScore`, accept `sourceType` as a parameter and write it to the new column. The SR LLM output already returns `sourceType` in its JSON — it is available at write-time.

**UCM addition — `srCacheTtlBySourceType`:** Object keyed by sourceType string. Add to `SourceReliabilityConfigSchema` in `config-schemas.ts` with these approved defaults in `pipeline.default.json`:

| Source Type | TTL (days) |
|-------------|-----------|
| `government` | 21 |
| `state_controlled_media` | 21 |
| `unknown` | 21 |
| `state_media` | 30 |
| `advocacy` | 30 |
| `platform_ugc` | 45 |
| `aggregator` | 45 |
| `editorial_publisher` | 60 |
| `wire_service` | 90 |
| `propaganda_outlet` | 90 |
| `known_disinformation` | 90 |

**TTL lookup order at write-time** (first match wins):
1. `srCacheTtlBySourceType[sourceType]` — if sourceType is known and in the map
2. `srCacheTtlByCategory[category]` — per-category fallback (Commit 1)
3. `cacheTtlDays` — flat fallback

All three tiers are UCM-configurable. No hardcoded TTL values anywhere.

**Unit tests:** Per-sourceType TTL correctly applied; unknown sourceType falls back to per-category; missing category falls back to flat value.

Run `npm test`.

---

### Phase 2.4 Commit 2 — Web-search augmented SR evaluation (no prompt change needed — unblocked)

**Why this matters:** Reducing TTL to 60 days and re-evaluating via LLM doesn't solve the regime-change problem. If an LLM's training data shows a government domain as "highly reliable", every re-evaluation produces the same stale answer. The fix is to give the LLM *current* information at SR evaluation time via web search.

**No prompt change required.** The SR prompt already uses an `${evidenceSection}` variable and Rule 1 already instructs the LLM to use *only* evidence items and ignore pretrained knowledge. Web search results slot directly into the existing evidence pack mechanism — formatted as `[E1] title: snippet` items, they go through the same evidence quality hierarchy, recency weighting, and Tier 1/2/3 assessor classification the prompt already defines.

**Implementation:**

In the SR cache-miss path in `source-reliability.ts`, before the LLM call:
1. Run a web search using `srCredibilitySearchQueryTemplate` from UCM (default: `"{domain} credibility reliability bias fact-check"`, with `{domain}` substituted at runtime)
2. Format each result as `[E{n}] {title}: {snippet} ({source}, {date if known})` — up to 5 items
3. Pass formatted results as the `evidenceSection` variable to the SR prompt
4. If search fails or returns zero results: pass empty `evidenceSection` — log at `info` level, proceed with LLM-only assessment. **SR evaluation must never crash due to a search failure.**
5. Only fire the search on a **cache miss that proceeds to LLM evaluation** — not on every SR lookup

**UCM additions:**
- `srCredibilitySearchQueryTemplate` — string, default `"{domain} credibility reliability bias fact-check"`. Add to `SourceReliabilityConfigSchema` in `config-schemas.ts`

**Unit tests:**
- Graceful fallback: when search returns no results, SR evaluation still completes
- Graceful fallback: when search throws, SR evaluation still completes
- Search query is constructed correctly from the template (`{domain}` substitution works)

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
