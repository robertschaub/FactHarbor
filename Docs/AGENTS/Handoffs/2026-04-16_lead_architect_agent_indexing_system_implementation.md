---
roles: [Lead Architect]
topics: [indexing, agents, handoff_index, stage_map, mcp, automation, adoption]
files_touched:
  - scripts/build-index.mjs
  - scripts/hooks/rebuild-index-on-change.cjs
  - scripts/git-hooks/post-commit
  - scripts/git-hooks/post-merge
  - .claude/settings.json
  - .claude/skills/handoff/SKILL.md
  - .claude/skills/wip-update/SKILL.md
  - .claude/skills/docs-update/SKILL.md
  - .claude/skills/report-review/SKILL.md
  - AGENTS.md
  - Docs/AGENTS/Policies/Handoff_Protocol.md
  - Docs/AGENTS/Multi_Agent_Meta_Prompt.md
  - Docs/AGENTS/index/stage-manifest.json
  - Docs/AGENTS/index/stage-map.json
  - Docs/AGENTS/index/handoff-index.json
  - Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md
  - package.json
  - scripts/monthly-prune-handoffs.mjs
---

# Agent Indexing System — Implementation Complete

## Task

Design and implement a fully-automated indexing system so agents can find relevant prior
work and pipeline code without burning 3,000–7,000 tokens on discovery per session.

## Done

### Artifacts (live, seeded)
- `Docs/AGENTS/index/stage-manifest.json` — 6 LLM task keys → tier → model IDs (3 providers)
- `Docs/AGENTS/index/stage-map.json` — 8 pipeline stages → file → **exported functions only** (67 total). For types/consts/classes use grep on the relevant file (types typically in `types.ts`).
- `Docs/AGENTS/index/handoff-index.json` — 193 handoffs, 190/193 real summaries, 32 multi-role entries correctly parsed as arrays

### Automation wiring (all triggers connected)
| Trigger | What runs |
|---|---|
| Agent Write to `Docs/AGENTS/Handoffs/**` | PostToolUse hook → `--tier=2` |
| Agent Edit/Write to `apps/web/src/lib/analyzer/**` | PostToolUse hook → `--tier=1` |
| `git commit` touching handoffs or analyzer | `scripts/git-hooks/post-commit` |
| `git pull` / `git merge` | `scripts/git-hooks/post-merge` (full rebuild) |
| `/wip-update` skill | Step 5b — explicit `build-index.mjs --tier=2` |
| `/docs-update` skill | Step 4b — same |
| `monthly-prune-handoffs.mjs` | `execSync` at script exit |
| Manual / first-time | `npm run index` |

Hook debounce: 7 s per tier (stamp files, gitignored).

### Adoption wiring (every agent entry point covered)
- `AGENTS.md` step 1 — auto-loaded every session; says to query index before scanning
- `Docs/AGENTS/Policies/Handoff_Protocol.md` incoming checklist step 2
- `Docs/AGENTS/Multi_Agent_Meta_Prompt.md` self-serve table — all complexity tiers
- `report-review/SKILL.md` constraint #9 — passed verbatim to all Phase 4 sub-agents

### Handoff template hardened
`handoff/SKILL.md` now requires YAML frontmatter (`roles[]`, `topics[]`, `files_touched[]`).
Primary extraction uses frontmatter; regex is fallback for 193 existing handoffs.

### npm commands
```
npm run index          # full rebuild
npm run index:tier1    # stage indexes only
npm run index:tier2    # handoff index only
npm run install-hooks  # install git hooks (already done locally)
```

## Decisions

| Decision | Rationale |
|---|---|
| `roles[]` not scalar | Corpus has 32 multi-role handoffs — scalar loses data |
| YAML frontmatter in template | Eliminates fragile regex for all future handoffs |
| git hooks as tracked templates | `.git/hooks/` isn't committed; `scripts/git-hooks/` is |
| MCP layer in roadmap before BM25 | Adoption gap ~30–50%; MCP forces correct path structurally |
| Atomic write (temp → rename) | Never leave partial JSON that agents would silently trust |
| 7 s debounce | Prevents N rebuilds per burst of sequential analyzer edits |

## Warnings

- **Pre-existing `.claude/settings.json` PreToolUse safety hook reads `/dev/stdin`** — the
  same Windows-portability bug as the rebuild-index hook originally had. On this Windows
  setup `/dev/stdin` returns ENOENT, so the safety hook's `process.exit(2)` never fires.
  Bash-command safety checks (git reset --hard, force push, etc.) may be silently
  bypassed. Fix: change `readFileSync('/dev/stdin','utf8')` to `readFileSync(0,'utf8')`
  in the PreToolUse command string. NOT fixed in this handoff — it's a pre-existing
  safety-surface change outside the indexing-system scope; needs explicit approval.
- **Old handoffs have no YAML frontmatter** — extraction falls back to header parsing + filename.
  Quality is good (190/194 real summaries) but `files_touched` coverage is ~167/194. New
  handoffs using the updated template will be 100% reliable.
- **Sub-agent isolation gap partially open** — only `report-review` passes the index instruction
  to sub-agents verbatim. Other skills (pipeline, prompt-diagnosis, debug, audit) don't spawn
  sub-agents. MCP layer (Phase 2) is the full structural fix.
- **`.index-rebuild-stamp-tier*` files** are gitignored — they are debounce state, not artifacts.

## For next agent

Phase 2 is the MCP query layer — `scripts/mcp-index-server.mjs`, ~150 lines, 3 tools:
`search_handoffs(query, role?, after?, limit?)`, `lookup_stage(name)`, `lookup_model_task(key)`.
Backed directly by the committed JSON files. Configure in `.claude/settings.json →
mcpServers.fh-index`. This is the structural fix for the 30–50% instruction-bypass rate.
Design spec: `Docs/WIP/2026-04-16_Agent_Indexing_System_Design.md`.
