# Agent Indexing System — Design Spec

**Status**: Approved for implementation  
**Date**: 2026-04-16  
**Reviewed by**: Architecture agent, Devil's advocate agent, Implementation agent (debate 2026-04-16)

---

## Problem

Agents waste 3,000–7,000 tokens per session on discovery:
- Listing 193+ handoff filenames and guessing which are relevant
- Grepping 44 pipeline modules to find which file owns a behavior
- Re-deriving model tier mappings that are already expressed in source

The index solves discovery so agents can spend tokens on reasoning.

---

## Architecture

### Tier 0 — Active window (no change)
`Docs/AGENTS/Agent_Outputs.md` — human-maintained, covers the live 7-day session window. Not automated. Remains the authoritative recent-window index.

### Tier 1a — `Docs/AGENTS/index/stage-manifest.json`
**What**: Maps LLM task key → model tier → resolved model ID.  
**Source of truth**: `apps/web/src/lib/analyzer/model-tiering.ts` (`taskTierMapping`, `ANTHROPIC_VERSIONS`)  
**Generation**: Regex scan of those two exports — no AST needed  
**Staleness risk**: Low — model tier changes are deliberate and rare

### Tier 1b — `Docs/AGENTS/index/stage-map.json`
**What**: Maps pipeline stage name → file path → exported function names.  
**Source**: Grep `export (async )?function \w+` across `src/lib/analyzer/*-stage.ts` + orchestration call sites in `claimboundary-pipeline.ts`  
**Staleness risk**: Medium — PostToolUse hook covers in-session changes; full rebuild on `npm run index`

### Tier 2 — `Docs/AGENTS/index/handoff-index.json`
**What**: Searchable record of all handoffs.  
**Fields per entry**:
```ts
{
  file: string,           // filename only
  date: string,           // "YYYY-MM-DD"
  roles: string[],        // normalized lowercase — array, not scalar (multi-role handoffs exist)
  topics: string[],       // tokens from filename slug
  paths: string[],        // file paths mentioned in "Files touched:" section (if present)
  summary: string         // H1 title + "For next agent:" line (regex extracted)
}
```
**Schema note (GPT review 2026-04-16)**: `role` was initially a scalar string. Changed to
`roles[]` because the corpus already contains multi-role handoffs. `paths[]` added for cheap
extraction from the "Files touched:" field — gives agents a code-location signal without
indexing source code.
**Source**: Filename parse (date/role/slug) + shallow body scan  
**Note**: No full-body extraction — avoids noise from free-form content

### Phase 2 — MCP query layer (priority: AHEAD of BM25)
**What**: A lightweight stdio MCP server exposing 3 tools backed directly by the committed JSON files.  
**Why before BM25**: Adoption is the bottleneck, not ranking quality. Making the index the *easiest path* for agents matters more than improving search precision. MCP forces adoption structurally; instruction-based adoption has an estimated 30–50% bypass rate (GPT review, 2026-04-16).  
**Tools**:
```
search_handoffs(query, role?, after?, limit?)  →  top-N entries (token-overlap scoring first)
lookup_stage(nameOrKeyword)                    →  file + functions + model tier
lookup_model_task(taskKey)                     →  model tier + resolved model ID
```
**Implementation**: `scripts/mcp-index-server.mjs`, ~150 lines, `@modelcontextprotocol/sdk`.  
**Config**: `.claude/settings.json` → `mcpServers.fh-index`. Claude Code starts it automatically.  
**When to build**: After JSON indexes are seeded and working. No embeddings, no database.

### Tier 3 — BM25 corpus (deferred, after MCP layer)
**What**: Serialized BM25 term vectors over handoff summaries for ranked keyword search.  
**Tech**: `wink-bm25-text-search` (zero-cost, offline, no API dependency)  
**When to build**: When keyword filtering on Tier 2 demonstrably fails to surface relevant prior work. Expected trigger point: ~500 handoffs.  
**Rejected alternative**: Anthropic embeddings API — overkill for keyword-rich domain at this scale.

---

## File layout

```
Docs/AGENTS/
└── index/                         ← NEW (generated, committed)
    ├── stage-manifest.json        ← Tier 1a
    ├── stage-map.json             ← Tier 1b
    └── handoff-index.json         ← Tier 2

scripts/
└── build-index.mjs                ← NEW (single script, all tiers)
```

**Artifacts are committed to git.** Rationale: agents consume them mid-session without running a build; they are deterministic from source, small (<500 KB combined), and cheaply diffable. Each file includes a `"generatedAt"` ISO timestamp.

---

## Automation

### Primary: on-demand rebuild
```
npm run index          ← root package.json alias
  → node scripts/build-index.mjs
  → node scripts/build-index.mjs --tier=1   (stage only)
  → node scripts/build-index.mjs --tier=2   (handoffs only)
```

### Secondary: PostToolUse hooks (`.claude/settings.json`)
| Matcher | Triggers |
|---|---|
| `Write(Docs/AGENTS/Handoffs/**)` | `build-index.mjs --tier=2` |
| `Edit(apps/web/src/lib/analyzer/**)` | `build-index.mjs --tier=1` |
| `Write(apps/web/src/lib/analyzer/**)` | `build-index.mjs --tier=1` |

Hooks keep indexes current within a session without agent intervention.

---

## Integration with existing workflows

The index rebuild is wired into every process that changes the handoff corpus or pipeline code:

| Trigger | What happens | Files changed |
|---|---|---|
| Agent writes a handoff (`Write` tool on `Docs/AGENTS/Handoffs/**`) | PostToolUse hook fires `rebuild-index-on-change.cjs` → `--tier=2` | `.claude/settings.json` |
| Agent edits pipeline code (`Edit`/`Write` on `apps/web/src/lib/analyzer/**`) | PostToolUse hook fires `rebuild-index-on-change.cjs` → `--tier=1` | `.claude/settings.json` |
| `/wip-update` skill runs | Step 5b instructs agent to run `build-index.mjs --tier=2` after archiving | `.claude/skills/wip-update/SKILL.md` |
| `/docs-update` skill runs | Step 4b instructs agent to run `build-index.mjs --tier=2` (and `--tier=1` if analyzer files changed) | `.claude/skills/docs-update/SKILL.md` |
| `monthly-prune-handoffs.mjs` runs | Script calls `execSync('node scripts/build-index.mjs --tier=2')` before exit | `scripts/monthly-prune-handoffs.mjs` |
| Manual / first-time seed | `npm run index` at repo root | `package.json` |

**Hook implementation**: `scripts/hooks/rebuild-index-on-change.cjs` — reads tool input from stdin, checks file path, runs the appropriate tier. Never blocks on errors.

---

## Agent adoption

Add to AGENTS.md (auto-loaded every session):

```markdown
## Generated indexes (do not edit manually — see `npm run index`)
| Index | File | Use for |
|-------|------|---------|
| Pipeline stages → file → function | `Docs/AGENTS/index/stage-map.json` | Finding which file implements a stage |
| LLM task → model tier | `Docs/AGENTS/index/stage-manifest.json` | Model tier lookups without grepping code |
| All handoffs (searchable) | `Docs/AGENTS/index/handoff-index.json` | Finding relevant prior work by role/topic/date |
```

This single table is the adoption mechanism — agents read AGENTS.md on every session start.

---

## Token impact

| Operation | Before | After | Saving |
|---|---|---|---|
| Handoff discovery | ~3,500–5,000 tokens | ~600–900 tokens | ~3,000 tokens |
| Stage lookup | ~1,200 tokens | ~200 tokens | ~1,000 tokens |
| Per-session overhead | ~5,000–8,000 tokens | ~1,000 tokens | ~4,000–7,000 tokens |

Compounds across every sub-agent spawn in skills (pipeline, prompt-diagnosis, debug, report-review each spawn 2–4 sub-agents).

---

## Implementation checklist

- [ ] `scripts/build-index.mjs` — all three tiers, `--tier=N` flag, `generatedAt` timestamp
- [ ] `npm run index` alias in root `package.json`
- [ ] PostToolUse hooks in `.claude/settings.json`
- [ ] Index pointer table in `AGENTS.md`
- [ ] Initial seed: run `npm run index` once after merge
- [ ] Verify `Docs/AGENTS/index/` artifacts are committed

---

## External review findings

### GPT review (2026-04-16) — applied
- `role → roles[]`, add `paths[]` (now `files_touched[]` via frontmatter — more reliable)
- 7 s debounce on PostToolUse hook
- MCP layer before BM25
- Top risk: false confidence from stale/lossy index

### Gemini coverage audit (2026-04-16) — applied

| Gap | Severity | Fix applied |
|---|---|---|
| Shell ops (Bash mv/rm/git) bypass PostToolUse hooks | High | git post-commit + post-merge hooks in `scripts/git-hooks/`; `AGENTS.md` note to run `npm run index` after bulk Bash ops |
| External editor (VS Code) bypasses all hooks | Medium | post-commit git hook covers committed changes; file watcher explicitly not added (operational overhead for solo dev) |
| Sub-agents don't inherit AGENTS.md | High | Added constraint #9 to `report-review` non-negotiable list (verbatim to all Phase 4 sub-agents); other skills don't spawn sub-agents |
| Fragile H1 + "For next agent:" regex | High | YAML frontmatter now mandatory in `handoff/SKILL.md` template — primary extraction; regex is fallback for old handoffs |
| Agents query handoff-index for source code | Low | Added explicit "ONLY for task history — NEVER for source code" to AGENTS.md index table |

---

## Known risks

**Top risk (GPT review, 2026-04-16): false confidence from a stale or lossy index.**  
If agents trust the index and stop grepping, a bad hit narrows them onto the wrong prior work —
worse than no index. Mitigations:
- Every artifact includes `generatedAt` timestamp
- Agents instructed: "verify with grep if match seems off"
- Hook debounce is 7 s (not 0) — slight staleness is acceptable; silent corruption is not
- `build-index.mjs` must be atomic (write to temp file, rename) — never leave partial artifacts

**Instruction-based adoption bypass rate: ~30–50%** (GPT estimate).  
Sub-agents spawned inline by skills are most at risk. MCP layer (Phase 2) is the structural fix.

---

## Decisions log

| Decision | Rationale |
|---|---|
| `roles[]` not `role` | Corpus has multi-role handoffs; scalar loses data (GPT review 2026-04-16) |
| `paths[]` field added | Cheaply extracted from "Files touched:" — gives code-location signal without code indexing |
| 7 s debounce on hook | Burst of analyzer edits triggers one rebuild, not N; tolerable staleness window |
| MCP layer before BM25 | Adoption is the bottleneck, not ranking; MCP forces correct path structurally |
| BM25 over embeddings | Corpus is keyword-rich; BM25 sufficient; zero API cost |
| Commit artifacts | Agents need them mid-session; deterministic; cheap to diff |
| PostToolUse over pre-commit | Agent-native; already used in project; no git hook fragility |
| Shallow body parse only | Full-body extraction adds noise without meaningfully improving retrieval |
| Tier 3 deferred (after MCP) | Justified at ~500 handoffs; current scale doesn't require it |
| No hosted vector DB | Solo-dev; no infra budget; SQLite + local embeddings when Tier 3 is built |
| No source code index | Grep is already the code index; 45 files is navigable; stage-map covers the high-value case |
