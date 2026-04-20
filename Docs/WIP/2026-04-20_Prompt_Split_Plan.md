# Plan: Reduce Agent Context Consumption for claimboundary.prompt.md

**Date:** 2026-04-20
**Status:** IMPLEMENTED — Option E approved and landed 2026-04-20. Option A deferred.
**Reviewed by:** Independent Opus agent (2026-04-20)
**Related:** [2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md](2026-04-20_Token_Reduction_Chunking_Debate_Consolidated.md)

---

## 1. Problem Statement

`claimboundary.prompt.md` is 212KB / 2,407 lines / ~53K tokens containing 28 sections. When agents debug a pipeline stage, they typically need only 1-3 sections. Reading the full file consumes 13% of Opus 4.6's effective context (~400K) or 21% of GPT-5.4's safe limit (256K).

**Caveat (from review):** Agents don't always read the full file — competent agents already use partial reads when they know what they need. The 53K/read is worst-case, not typical. The real issue is ensuring agents consistently use targeted reads rather than defaulting to full reads.

**Goal:** Establish a reliable pattern for targeted prompt section reads without breaking UCM, provenance, or deployment.

---

## 2. Investigation Findings — Why Physical Splitting Is Hard

The prompt file is deeply integrated:

| System | Dependency | Severity |
|---|---|---|
| **UCM config_blobs** | Single content hash per prompt profile. Jobs record which hash was active. | P0 — breaking this breaks provenance |
| **Frontmatter contract** | `requiredSections` list validated by `prompt-frontmatter-drift.test.ts`. Must match `## HEADING` count exactly. | P0 — test fails = CI blocked |
| **prompt-loader.ts** | `loadAndRenderSection()` loads the ENTIRE file (all 28 sections), caches, returns one section | P1 — load path must change |
| **config-storage.ts** | `seedPromptFromFile()` reads one file, hashes, saves to DB | P1 — reseed must adapt |
| **Admin UI** | Single-file version selector, diff viewer, import/export | P1 — UX must handle split |
| **Deployment** | `reseed-all-prompts.ts` + Dockerfile COPY assume single file | P2 |
| **60+ handoff docs** | Reference `claimboundary.prompt.md` by path and line number | P2 — all go stale |

### Key Constraint

**Job provenance requires a single hash.** Every job stores `configUsage[0].contentHash` — the SHA-256 of the prompt that produced the analysis. The `/prompt-diagnosis` skill uses this to correlate failures to prompt versions.

---

## 3. Options Evaluated

### Option A: Physical Split + Manifest (composite hash)

Split into 5 files by stage. Manifest concatenates and hashes at load time.

**Pros:** Agents read only the relevant stage file. Composite hash preserves provenance.
**Cons:** UCM, tests, admin UI, deploy scripts, reseed all need changes. 15-20 hours. Real complexity but not as risky as initially assessed — composite hash is straightforward.

### Option B: Logical Split (section-aware loader, single file)

Modify agents/tooling to read specific line ranges.

**Pros:** Zero infrastructure changes.
**Cons:** Fragile — line ranges shift on every edit.

### Option C: Section Index + Targeted Reads (manual index)

Comment-based section index at the top. Agents read index, then offset/limit.

**Pros:** Zero code changes.
**Cons:** Index must be manually maintained. Goes stale.

### Option D: Auto-generated section index (hook-maintained)

Hook regenerates index on every Edit/Write.

**Pros:** Index stays current.
**Cons:** Hook adds a moving part. Goes stale if prompt is edited outside Claude Code (VS Code direct, git merge). Hook doesn't solve the real problem — agent behavioral compliance.

### Option E: Grep + targeted Read (no tooling) — **REVIEWER PROPOSED**

Agents use `Grep("## SECTION_NAME", file)` to find line numbers, then `Read(file, offset, limit)`. Zero files, zero hooks, zero maintenance.

**Pros:** Zero engineering effort. Zero maintenance. Same ~35K token savings.
**Cons:** Requires AGENTS.md instruction that agents follow.

---

## 4. Review Findings (Independent Opus Agent)

Five issues raised:

| # | Issue | Assessment |
|---|---|---|
| 1 | **Problem is overstated** — agents don't always read full file | Valid. Revised problem statement to acknowledge this. |
| 2 | **Simpler solution missed** — Grep + Read requires zero tooling | Valid and important. Added as Option E. |
| 3 | **Option A risk is overstated** — composite hash is straightforward | Partially valid. Revised risk ratings. |
| 4 | **AGENTS.md "read files fully" contradiction** — adding a carve-out undermines the rule | Valid. Must explicitly amend the rule, not silently contradict it. |
| 5 | **Hook doesn't solve the real problem** — behavioral compliance, not line number staleness | Valid. Hook is unnecessary overhead. |

---

## 5. Revised Recommendation: Option E (Grep + targeted Read)

### Why Option E wins

| Criterion | Option A | Option D | **Option E** |
|---|---|---|---|
| Engineering effort | 15-20 hours | 2-3 hours | **~30 minutes** |
| Infrastructure risk | Medium | None | **None** |
| New files/scripts | Manifest + 5 files | Index file + hook | **None** |
| Maintenance burden | Medium | Low | **None** |
| Agent context savings | ~35K tokens/read | ~35K tokens/read | **~35K tokens/read** |
| Staleness risk | Low | Medium | **None** |

### How it works

Agents already have the tools. Example workflow:

```
1. Grep("## VERDICT_ADVOCATE", "apps/web/prompts/claimboundary.prompt.md")
   → Returns: line 1348

2. Grep("## VERDICT_CHALLENGER", "apps/web/prompts/claimboundary.prompt.md")
   → Returns: line 1456

3. Read("apps/web/prompts/claimboundary.prompt.md", offset=1348, limit=108)
   → Returns only the VERDICT_ADVOCATE section (~108 lines, ~4K tokens)
```

### Implementation

#### Step 1: Amend AGENTS.md (~30 min)

Add a narrow, principled exception to the "Read files fully before editing" rule:

```markdown
### Large File Exception — Prompt Files

AGENTS.md requires "Read files fully before editing." For prompt files over 100KB
(currently: `claimboundary.prompt.md` at 212KB), use targeted reads instead:

1. Grep for the `## SECTION_NAME` header to find the line number
2. Grep for the next `## ` header to find the section end
3. Read only the needed section using offset/limit
4. When editing: read the target section + 20 lines of surrounding context

This exception applies ONLY to prompt files in `apps/web/prompts/` that exceed 100KB.
Full reads remain required for all other files and for prompt files under 100KB.
```

#### Step 2: Done

No scripts. No hooks. No index files. No maintenance.

### Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Agents ignore instruction, read full file anyway | Low | Rule is in AGENTS.md (authoritative). Reinforce if observed. |
| Agent Greps for wrong section name | Very Low | Section names are well-defined in frontmatter contract |
| Agent edits without sufficient surrounding context | Low | Rule requires +20 lines context around target section |
| Non-Claude-Code agents can't use Grep+Read | Low | Those tools have their own context management |

---

## 6. Future: When to Upgrade to Option A (Physical Split)

Option E is the right answer **now**. Upgrade to Option A only if:

1. The prompt file grows past ~300KB (currently 212KB)
2. Multiple developers edit different sections concurrently (currently solo developer)
3. The admin UI needs section-level versioning (currently not requested)
4. Agent context limits shrink further (new model constraints)

Option A effort is real but not as high-risk as initially assessed. The composite hash approach is sound. Defer, don't abandon.

---

## 7. What This Does NOT Solve

- **Runtime token consumption** (LLM calls in the pipeline) — covered by the chunking debate document
- **Test file sizes** (110K-192K) — separate optimization, same Grep+Read pattern helps
- **Pipeline code file sizes** (155K claim-extraction-stage.ts) — separate refactoring decision

This plan addresses only: **agent development session context consumption when debugging prompts.**

---

## 8. Decision Required

**Captain approval needed for:**
1. Adding the "Large File Exception" rule to AGENTS.md — amends existing "read files fully" rule
2. Confirming Option A (physical split) is deferred, not abandoned
