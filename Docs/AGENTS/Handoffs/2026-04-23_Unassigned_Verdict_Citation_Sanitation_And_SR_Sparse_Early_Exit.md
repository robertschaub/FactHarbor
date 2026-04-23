### 2026-04-23 | Unassigned | Codex (GPT-5) | Verdict Citation Sanitation And SR Sparse Early Exit

**Task:** Implement the two previously deferred “low-hanging fruit” follow-ups from the Grander runtime discussion if they could be landed narrowly and safely: (1) verdict citation sanitation, and (4) SR sparse-domain early exit.

**What changed**

1. **Verdict citation sanitation tightened in Stage 4/5 handoff**
   - File: [apps/web/src/lib/analyzer/verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts)
   - `stripPhantomEvidenceIds(...)` now accepts the optional advocate verdict set and performs one extra structural safeguard:
     - if phantom-ID cleanup collapses the decisive citation side of a **challenge-adjusted** verdict, the verdict is reverted to the pre-challenge advocate state instead of carrying a partially grounded adjusted outcome into validation/persistence.
   - This is intentionally structural only:
     - no semantic reinterpretation
     - no new text heuristics
     - revert only when cleanup removes the decisive evidence side for an already challenge-adjusted verdict

2. **SR sparse insufficient-data early exit**
   - File: [apps/web/src/lib/source-reliability/sr-eval-engine.ts](/c:/DEV/FactHarbor/apps/web/src/lib/source-reliability/sr-eval-engine.ts)
   - Added `shouldSkipRefinementForSparseEvidence(...)`.
   - Sequential refinement is now skipped when the primary SR pass already returns `insufficient_data` / `score = null` **and** the evidence is still effectively sparse:
     - empty evidence pack, or
     - single-item evidence pack, or
     - zero grounded evidence citations in the primary result
   - This keeps the optimization narrow and avoids changing SR semantics on grounded multi-item cases.

3. **Focused regression coverage**
   - Added [apps/web/test/unit/lib/analyzer/verdict-citation-sanitization.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/verdict-citation-sanitization.test.ts)
   - Added [apps/web/test/unit/lib/source-reliability/sr-eval-engine.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/source-reliability/sr-eval-engine.test.ts)

**Verification**

- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-citation-sanitization.test.ts test/unit/lib/source-reliability/sr-eval-engine.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-stage.test.ts -t "stripPhantomEvidenceIds"`
- `npm -w apps/web run build`

**Warnings**

- Only the **early-exit** half of the SR idea was implemented. The proposed caching for “unknown due sparse evidence” was explicitly left out because it is not low-hanging and would need a broader cache-contract decision.
- The verdict sanitation is stronger than before, but still deliberately narrow. It does **not** attempt to rewrite reasoning or infer missing citations; it only reverts a challenge-adjusted verdict when phantom-ID cleanup empties the decisive evidence side.

**Open items**

- If `verdict_grounding_issue` still persists on live runs after this slice, the next likely seam is not top-level citation arrays anymore, but validator/reasoning alignment in [verdict-stage.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/verdict-stage.ts), especially challenge-context vs cited-evidence-registry diagnostics.
- If SR runtime remains a material issue, the next bounded follow-up would be the deferred cache layer for sparse-domain unknowns, but only with explicit cache semantics and observability.

**Learnings**

- The verdict stage already had a phantom-ID cleanup hook, but it stopped short of protecting adjusted verdicts from losing their decisive citations after cleanup. Extending that existing hook was cleaner than inventing a new sanitation pass.
- On the SR side, the actual low-hanging part was not “caching”; it was narrowing when refinement should never have been attempted in the first place.
