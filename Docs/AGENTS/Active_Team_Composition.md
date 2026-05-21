# Active Team Composition

Captain-maintained single source of truth for model-to-role assignments.
Skill bodies use capability-tier language (Leader, independent model-family
Member) and resolve concrete models from this file.

Change this file only with Captain authorization. Update the **Effective**
date on every change.

**Effective:** 2026-05-21

## Steer-Co / Captain Deputy

| Role | Model | Model family | Selection criterion |
|---|---|---|---|
| Leader | Claude Opus 4.6 | Anthropic Claude | Strongest synthesis + governance discipline; direct repo-local code visibility via Claude Code |
| Member A | GPT-5.5 | OpenAI GPT | Adversarial reviewer, governance consistency, independent cross-model verification |
| Member B | Gemini 3.1 Pro Preview | Google Gemini | Independent systems review, implementation practicality, cross-tool portability |

## Delivery Lane

| Role | Default model | Notes |
|---|---|---|
| Lead Developer / executor | Claude Opus 4.6 | Same model family as Leader for code-visibility continuity; Captain may assign a different executor |
| Code Reviewer | GPT-5.5 or Gemini | Different family from implementer |

## Selection Criteria (steady-state)

- **Leader:** Highest-capability available model with strong synthesis and
  governance discipline. When the Leader also serves as Captain Deputy, prefer
  a model with direct code visibility in the repo-local tool surface.
- **Member A:** Different model family from Leader. Strong reasoning for
  adversarial review and governance checking.
- **Member B:** Different model family from both Leader and Member A. Broad
  tool and systems knowledge for practicality and portability review.
- **Executor:** The Captain may pin any model. Default: same family as Leader
  for code-visibility continuity.

## Mechanisms That Don't Auto-Switch

Changing the composition above updates skill behavior for agents that read
this file. The following mechanisms reference specific models or APIs through
code or config and must be updated separately when the active team changes:

| Mechanism | Location | What to update |
|---|---|---|
| `invoke-claude.cjs` | `scripts/agents/invoke-claude.cjs` | Non-Claude agents call Claude via this wrapper. Update if Leader is no longer Claude. |
| `invoke-gpt.cjs` | `scripts/agents/invoke-gpt.cjs` | Claude Code calls GPT via OpenAI API. Requires `OPENAI_API_KEY`. Default model: `gpt-5.5`. |
| `invoke-gemini.cjs` | `scripts/agents/invoke-gemini.cjs` | Claude Code calls Gemini via Google API. Requires `GOOGLE_GENERATIVE_AI_API_KEY`. Default model: `gemini-3.1-pro-preview`. |
| Claude Code MCP config | `.claude/settings.json` | Tool permissions and MCP server config are Claude Code-specific. |
| Codex/GPT tool sessions | External (OpenAI Codex) | If GPT-5.5 was executor and a different model takes over, stop/redirect active Codex sessions. |

## Change Log

| Date | Change | Captain authorization |
|---|---|---|
| 2026-05-21 | Initial: Claude Opus 4.6 as Leader/executor, GPT-5.5 and Gemini as Members. Replaces prior GPT-5.5-as-Leader default. | Captain-authorized for W6-F1 → W6-C completion cycle |
