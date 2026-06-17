### 2026-04-19 | Unassigned | Codex (GPT-5) | CH-DE Ecosystem Adjacency Guard Fix
**Task:** Fix the failures behind job `69cbbf4b318e477ca740b63a45f1f5d5` for input `Die Schweiz hat kein systematisches Fact-Checking wie Deutschland`, where the run drifted into FOEG survey / broader desinformation-governance material and finished `UNVERIFIED 48/22`.

**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`, `Docs/AGENTS/Handoffs/2026-04-19_Unassigned_CH_DE_Ecosystem_Adjacency_Guard_Fix.md`, `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** Kept the fix prompt-only. The root issue was not a need for new analyzer heuristics; it was that the comparative-ecosystem prompt path still allowed broader problem-space governance material to masquerade as direct evidence for the named activity ecosystem. I tightened the prompt in five places:

1. `CLAIM_EXTRACTION_PASS1`
   - comparative-ecosystem `searchHint` now explicitly prefers actor/member/certification/roster/recurring-output routes before abstract governance/coordination routes
   - it now blocks steering toward governance of a broader policy problem or harm domain unless that route explicitly inventories/governs the named activity ecosystem

2. `CLAIM_EXTRACTION_PASS2`
   - `expectedEvidenceProfile` now treats broader-problem legal/regulatory/governance material as secondary/contextual by default unless it explicitly inventories/governs/certifies/funds/structurally describes the named activity ecosystem itself

3. `GENERATE_QUERIES`
   - comparative-ecosystem queries can no longer rely mainly on abstractions like governance, coordination, systematization, monitoring, or structure without a concrete activity-specific actor/artifact signal
   - queries about the governance of the broader harm/problem space are blocked as primary routes unless they clearly seek a source about the named activity ecosystem itself

4. `RELEVANCE_CLASSIFICATION`, `EXTRACT_EVIDENCE`, `APPLICABILITY_ASSESSMENT`
   - broader-problem governance/legal-framework material is now explicitly excluded from direct ecosystem evidence unless it directly inventories/governs/certifies/funds/structurally describes the named activity ecosystem

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- Result: passed (`88` tests)

**Live rerun:**
- New job: `48e1dc1c6e2b416584a3539de947f6fc`
- Runtime prompt hash: `939de800abd4ba3150d804b4712cb27516c615a3ae51f99b833113511afa7c76`
- Executed web commit hash: `92143261d302aac98960212e848a44d3a1d2e802+a4ec6f89`
- Result: `LEANING-TRUE 70/40`

The important change is not just the label. The acquisition path materially improved:
- `69cbb...` ended with only `3` evidence items, all neutral, and stalled after one main pass plus a refinement/contradiction loop that found nothing
- `48e1...` reached `22` evidence items, `18` of them on `AC_01`, with `10` supporting and `8` neutral
- the rerun progressed through multiple main iterations and targeted concrete routes such as:
  - `IFCN akkreditierte Faktencheck-Organisationen Schweiz Deutschland Liste`
  - `Faktencheck-Organisationen Schweiz dedizierte Redaktionen Verzeichnis`
  - `Schweizer Medien Faktencheck-Desks institutionelle Strukturen Netzwerke`
  - `Duke Reporters Lab Global Inventory Faktencheck Deutschland Schweiz`

This confirms the fix pushed the research path toward concrete ecosystem evidence rather than letting broader desinformation-governance material dominate.

**Warnings:** The rerun still used a dirty working-tree suffix (`+a4ec6f89`) because the prompt/test changes were not committed in this turn. The result is useful for behavior validation, but if Captain wants clean provenance, commit first and rerun once more.

**For next agent:** Compare `48e1dc1c6e2b416584a3539de947f6fc` directly against `69cbbf4b318e477ca740b63a45f1f5d5` and `63f795860245464fafbf374fc9b01f91`. The key question is no longer “does the run stay stuck on FOEG governance material?” — that part improved. The remaining tuning seam, if any, is whether the newer concrete ecosystem route can be pushed from `LEANING-TRUE 70/40` back toward the stronger `MOSTLY-TRUE` zone without reintroducing adjacent-topic evidence.

**Learnings:** For comparative ecosystem claims, “governance/monitoring framework” is too permissive as a primary evidence example unless it is scoped to the named activity ecosystem itself. Without an explicit broader-problem adjacency guard, the model can satisfy the instruction with legal/governance material about the surrounding harm domain instead of the ecosystem being compared.
