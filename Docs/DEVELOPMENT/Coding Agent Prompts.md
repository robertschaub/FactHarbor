# Coding Agent Prompts

## Phase 2.4 — SR Cache TTL + Remaining Phase 2 Items

**Context:** Phase 2.3 complete (commit `5120b864`). Verdict stage now uses `maxTokens: 16384`. Iran validation baseline updated: 60–87% across 3 runs (2-claim runs at lower end, 3-claim at upper end — expected variance). Full plan: `Docs/WIP/Report_Quality_Analysis_2026-03-08.md`.

---

### Open items carried forward

| Item | Priority | Status |
|------|----------|--------|
| D2: Classification instability (`question` vs `ambiguous_single_claim`) | LOW | Deferred — verdict stage stable, reassess after Phase 2.4/2.5 |
| D4: Gate 1 `passedSpecificity` cleanup | LOW | Deferred — tackle after scope normalization |
| `maxTokens: 16384` UCM-configurable | LOW | Hardcoded for now — acceptable ceiling, note for future tidy-up |

---

### Phase 2.4 — SR Cache TTL

**Goal:** Adjust source reliability (SR) cache temporal windows so that SR scores for time-sensitive domains (news sources, government agencies) expire faster than for stable domains (academic publishers, established institutions).

**Starting point:** Read `apps/web/src/lib/analyzer/source-reliability.ts` to understand the current SR cache implementation (TTL, lookup, write paths). Also check UCM for any existing SR TTL config in `config-schemas.ts`.

**Expected deliverables:**
1. Identify current TTL value(s) and whether they're UCM-configurable
2. If not UCM-configurable: move TTL into UCM as `srCacheTtlDays` (or per-domain-class TTLs if the source-reliability schema supports domain classification)
3. Propose TTL values differentiated by source type if feasible — present for Captain approval before implementing
4. Run `npm test` — confirm all tests pass

**Captain approval required** for any TTL value changes (these affect analysis quality — a stale SR score for a recently-discredited source is an analytical error, not just a cache miss).

---

### Phase 2.5 — Scope Normalization

**Goal:** Detect and merge EvidenceScope instances that represent the same temporal/methodological scope but were created as separate entries (e.g., "2000-2010 peer review" and "Early 2000s academic studies" describing the same window).

**Starting point:** Read `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — find where EvidenceScope objects are created and how `constituentScopes` is populated. Read `apps/web/src/lib/analyzer/types.ts` for the `EvidenceScope` type definition.

**Design constraint:** Scope equivalence detection MUST use LLM intelligence (not string similarity heuristics) — per AGENTS.md LLM Intelligence mandate. Propose the implementation approach for Captain review before writing any code.

---

### Validation baseline (current)

| Input | Path | Expected truth% | Expected conf% |
|-------|------|----------------|---------------|
| "Was Iran making nukes?" | question/claim path | 60–87% | 70–85% |
| "Was the Bolsonaro judgment fair?" | question | 68–85% | 70–85% |
| "Hydrogen more efficient than electricity for cars" | claim | 25–45% | — |
