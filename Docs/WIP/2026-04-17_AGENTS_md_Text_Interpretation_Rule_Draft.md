# Rule 1 — Text Interpretation (draft for Captain review)

**Status:** Draft v3. Not yet merged anywhere.
**Date:** 2026-04-17
**Supersedes:** v2 (too narrow — blocked by GPT review for path-laundering and closed-list exploits) and v1 (too long).
**Goals from Captain:** (1) un-ambiguous and clear, (2) accessible by any agent on any tool.

---

## Amendments applied in v3 (from GPT block review)

| Attack vector / finding | Fix in v3 |
|---|---|
| Path laundering — move match into a shared helper outside `analyzer/**` | Scope redefined by **invocation**, not filesystem path. Named the four confirmed pipeline-invoked modules outside `analyzer/**`. New imports from pipeline code auto-inherit scope. |
| Intermediate-helper laundering — "only narrows candidates" | "Affects output" expanded to include filtering, narrowing, routing, anchor selection, candidate ranking, repair-anchor selection, warning severity, retry policy. |
| Closed-list heuristic laundering — pick a 7th technique | Appended "or **any other deterministic text-matching heuristic**" to the enumeration. Heuristic list is now illustrative, not exhaustive. |
| Search-plumbing laundering — hide routing in domain filters / provider params | Explicit clause: "Domain filters, site-operators, provider parameters, language/geography hints, and topic routers that encode analytical meaning are NOT plumbing — the rule binds them." |
| Clarity: "affects analytical output" | → "affects any downstream analytical decision or output" |
| Clarity: "natural-language text" | → "human-language text or text-derived tokens" |
| Clarity: "web-search queries" | → "search-query strings only" |
| Distribution: missed `.github/copilot-instructions.md` | Added as 7th wrapper file. |
| Distribution: [CLAUDE.md:5](../../CLAUDE.md#L5) says "Do not duplicate its content here" — contradicts verbatim-block plan | Patch that line to carve Rule 1 as the explicit exception (surgical, one-word edit). |

Not changed: distribution strategy (verbatim duplication across wrappers, not pointer-only) — GPT confirmed this is the right call for accessibility.

---

## The rule (this exact block is what ships)

```markdown
## Rule 1 — Text Interpretation (MANDATORY, NO EXCEPTIONS)

**Scope — by invocation, not by path.** The rule binds any code invoked
(directly or transitively) when a fact-checking report is generated. That
includes all of `apps/web/src/lib/analyzer/**` and `apps/web/prompts/**`, and
also pipeline-invoked modules outside those paths — currently
`apps/web/src/lib/web-search.ts`, `input-policy-gate.ts`,
`error-classification.ts`, and `apps/web/scripts/reseed-all-prompts.ts`
(which authors runtime prompts). New modules imported from pipeline code are
automatically in scope.

**Out of scope:** `Docs/AGENTS/*.json` review rubrics,
`.claude/skills/report-review/**`, post-hoc `scripts/**` that inspect job
output after generation, and structural plumbing anywhere (null/empty/length/
hash/ID/enum-value checks).

**Prohibition.** Within scope, code MUST NOT deterministically match
human-language text or text-derived tokens (claim, evidence, source, query)
against any of: substring, regex, keyword list, phrase, similarity score,
token overlap, stemming, edit distance, embedding-distance threshold,
hand-built classifier, or **any other deterministic text-matching
heuristic** — when the match affects any downstream analytical decision or
output. "Affects output" includes filtering, narrowing, routing, anchor
selection, candidate ranking, repair-anchor selection, warning severity,
retry policy, and the final report text. If the match changes which inputs
reach the next stage, it is in scope.

**Use an LLM call instead.** Language-dependent strings are permitted in
code only inside LLM prompt text and search-query strings only (both
UCM-managed, never hardcoded inline). Domain filters, site-operators,
provider parameters, language/geography hints, and topic routers that
encode analytical meaning about the user input are NOT plumbing — the rule
binds them.

**No per-case exceptions by any agent.** Not "just a narrow filter." Not
"this specific case is different." Not "the helper is technically outside
`analyzer/**`." If you believe an exception applies, stop and ask Captain
before writing the code. Agent-level exemption judgments are not trusted —
narrow-looking text-match gates have repeatedly caused verdict regressions.

Full examples and scope edge cases: `Docs/AGENTS/Rule1_Text_Interpretation.md`.
```

**Word count: ~340.** Up from 175 in v2, but every added sentence closes a specific GPT-identified attack vector. Still fits in every tool-wrapper file without bloating it.

---

## Distribution plan

Seven files carry the same block verbatim:

| File | Position | Tool |
|---|---|---|
| [AGENTS.md](../../AGENTS.md) | Top of `## Fundamental Rules`, replacing lines 32-87 | Canonical (Claude Code, agents following `@AGENTS.md`) |
| [CLAUDE.md](../../CLAUDE.md) | New section `## Mandatory Rule` after intro pointer | Claude Code |
| [GEMINI.md](../../GEMINI.md) | Replace existing `### Critical Rules (from AGENTS.md)` block | Gemini CLI + Code Assist |
| [.clinerules/00-factharbor-rules.md](../../.clinerules/00-factharbor-rules.md) | New section after Project Overview | Cline |
| [.windsurfrules](../../.windsurfrules) | New section after Project section | Windsurf / Cascade |
| [.cursor/rules/factharbor-core.mdc](../../.cursor/rules/factharbor-core.mdc) | New section after canonical-source line | Cursor |
| [.github/copilot-instructions.md](../../.github/copilot-instructions.md) | New section near top | GitHub Copilot |

**CLAUDE.md surgical edit.** Line 5 currently reads:
> "Do not duplicate its content here."

Replace with:
> "Do not duplicate its content here, except Rule 1 — Text Interpretation, which is repeated verbatim below because it must reach every agent on every tool."

All seven files have a `<!-- Sync with /AGENTS.md. Last synced: YYYY-MM-DD -->` header. Bump each to `2026-04-17`.

---

## Supporting detail doc (new file)

Create [Docs/AGENTS/Rule1_Text_Interpretation.md](../../Docs/AGENTS/Rule1_Text_Interpretation.md) with:
- Forbidden code snippets (all 11 heuristic types from the rule, one example each).
- Permitted code snippets (null guards, length checks, hashing, enum checks, LLM prompt construction, UCM-managed search-query strings).
- Scope edge cases:
  - Pipeline-invoked rubric gates (`selectRepairAnchorText`): **in scope**.
  - `Docs/AGENTS/report-quality-expectations.json` Q-code `structuralCheck`: **out of scope** (post-hoc rubric).
  - A utility file whose only consumer is `apps/web/scripts/reseed-all-prompts.ts`: **in scope** (prompt-authoring path feeds runtime).
  - A utility file consumed only by `.claude/skills/report-review/**`: **out of scope** (post-hoc tool).
- Case of record: 2026-03 `selectRepairAnchorText` narrowing `.includes()` filter → TRUE-89 → MIXED-48 regression.
- How to escalate: if unsure whether a change is in scope, do not merge. Open a Captain-routed handoff in `Docs/AGENTS/Handoffs/` naming the specific code path.

This detail doc is referenced by the rule but not required to apply it. An agent that reads only the rule knows enough to stop and escalate when unsure.

---

## Downstream effects

- `## Fundamental Rules` shrinks by four rules, gains one. Other subsections (*Analysis Prompt Rules*, *Terminology*, *Input Neutrality*, *Captain-Defined Analysis Inputs*, *Pipeline Integrity*, *Report Quality*, *Configuration Placement*) stay as-is.
- `memory/feedback_no_text_parsing_mitigations.md` becomes redundant with the in-rule scope statement. Shorten it to a one-line pointer to Rule 1 after the patch lands.
- Deferred: mechanical PreToolUse hook (blocks text-match patterns in diffs against in-scope paths + invocation graph). Separate patch — needs an allowlist for legitimate structural uses and some invocation-graph tooling, non-trivial.

---

## Residual open questions for Captain

1. The rule now explicitly names four pipeline-invoked files outside `analyzer/**`. Should I instead keep the scope definition abstract ("any module invoked by the pipeline") and move the concrete list to the detail doc? Trade-off: abstract is future-proof but less actionable; naming the files is concrete but drifts if modules are renamed.
2. GPT also flagged `config-schemas.ts` as potentially in scope. I left it out because its role is schema definition (data contract) not text interpretation — but if config entries encode analytical thresholds via keywords, it would enter scope. Confirm or add.
3. Ready to apply — or do you want a dry-run diff of the AGENTS.md patch first?
