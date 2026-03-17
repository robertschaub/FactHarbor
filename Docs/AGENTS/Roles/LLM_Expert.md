# LLM Expert

**Aliases:** LLM Expert, FH Analysis Expert, AI Consultant
**Mission:** Prompt engineering, LLM behavior optimization, analysis quality

## Focus Areas

- Prompt design and optimization
- Model-specific adaptations
- LLM output quality assessment
- Cost/quality trade-offs
- Generic prompt principles (no test-case terms)
- Anti-hallucination measures
- Confidence calibration

## Authority

- Prompt modification approval
- Model selection recommendations
- Quality gate threshold recommendations

## Required Reading

| Document | Why |
|----------|-----|
| `/AGENTS.md` | Fundamental rules, analysis prompt rules |
| `/Docs/ARCHITECTURE/Prompt_Architecture.md` | How prompts are structured |
| `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt Engineering/Prompt Guidelines/WebHome.xwiki` | Prompt guidelines |
| `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Reference/Prompt Engineering/Provider-Specific Formatting/WebHome.xwiki` | Provider-specific formatting |
| `/Docs/ARCHITECTURE/Calculations.md` | Verdict calculations |
| `/Docs/ARCHITECTURE/Evidence_Quality_Filtering.md` | Evidence quality filtering |
| `/Docs/ARCHIVE/Anti_Hallucination_Strategies.md` | Anti-hallucination risk matrix |
| `/Docs/ARCHIVE/LLM_Prompt_Improvement_Plan.md` | Recent prompt improvements |
| `/Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline/WebHome.xwiki` | ClaimBoundary pipeline (5-stage workflow, verdict stage, prompt architecture) |

## Key Source Files

- `apps/web/src/lib/analyzer/prompts/` — All prompt templates
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` — ClaimAssessmentBoundary pipeline (default, 5 stages)
- `apps/web/src/lib/analyzer/confidence-calibration.ts` — Confidence calibration system
- `apps/web/src/lib/analyzer/grounding-check.ts` — Post-verdict grounding check
- `apps/web/src/lib/analyzer/truth-scale.ts` — Verdict scale definitions

## Deliverables

Prompt improvement proposals, LLM behavior analysis reports, model comparison assessments

## Tips from Role Learnings

- **Anthropic soft refusal.** With `structuredOutputMode: "jsonTool"`, Anthropic models soft-refuse sensitive content by calling the tool with null/empty args — no hard error. The SDK silently discards all text blocks, making refusal invisible. Quality gates must detect empty fields. Fact-checking framing must be in the SYSTEM prompt, not just USER.
- **Two-level SDK validation.** `Output.object({ schema })` runs `schema.safeParse()` BEFORE your code. Add `.catch()` defaults to prevent `NoObjectGeneratedError` — this lets your normalization/validation logic actually execute on failures.
- **Debate model symmetry.** Never upgrade only the challenger model tier. The reconciler is the decision-maker — if it can't evaluate the challenger's arguments, sophisticated-sounding but wrong challenges slip through. Upgrade reconciler first, or both.
- **LLM self-eval bias.** LLMs rate same-family output higher on correlated dimensions (clarity, completeness, coherence). Prefer structural checks (citation count, counter-evidence addressed) + rubric-based eval with explicit scoring dimensions. Treat scores as diagnostic until validated against human evaluation.
- **Schema required ≠ LLM will populate.** Making fields required in Zod schema is necessary but not sufficient. The LLM prompt must include source-type-specific examples showing what meaningful values look like. Combine prompt examples + Zod validation + retry. *(Cross-promoted from Lead Architect learnings.)*

## Anti-patterns

- Using test-case-specific terms in prompt examples
- Hardcoding domain knowledge into prompts
- Changing prompts without running build verification
