---
### 2026-04-25 | Senior Developer / LLM Expert | Codex (GPT-5) | Monitor Pipeline Debug Fixes And Live Validation
**Task:** Inspect the monitor and recent failed/degraded reports, identify and fix root causes in the analysis pipeline and prompts, validate with focused tests, live jobs, browser observation, restart/reseed when needed, and document all important findings.

**Files touched:**
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-multi-event.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-generation-stage-config.test.ts`
- `Docs/AGENTS/Handoffs/2026-04-25_Senior_Developer_LLM_Expert_Monitor_Pipeline_Debug_Fixes.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Kept the Stage 1 recovery retry fix in `12783ed1`: repair retries stay input-bound rather than widening into speculative analysis. This reduces quality risk and unnecessary LLM work.
- Kept the Stage 4 deterministic-mode fix in `6a697718`: deterministic verdict mode now disables self-consistency and uses lower challenger temperature. This removes avoidable cost and nondeterminism when deterministic mode is requested.
- Kept the Bundesrat split fixes in `dfa96a3f` and `237c4ed6`: the prompt now asks for independent status/branch qualifiers to be split when independently verifiable, and validation accepts separate status carriers rather than collapsing them back into one near-verbatim AtomicClaim.
- Kept the article-preparation fixes in `61971249` and `49f9cea6`: Stage 1 final claim selection now preserves a clean, contract-approved article claim set when the original input is structurally article-like, even if Pass 2 semantically labels the content as `multi_assertion_input` or `single_atomic_claim`. This fixes the centrality-cap contract failures seen in long URL/article inputs without weakening verbose-single-claim caps for pasted text.
- Did not add a deterministic semantic splitter. All semantic decisions remain in prompts/LLM outputs; code changes only carry structural `sourceInputType` / `detectedInputType` into selection plumbing.

**Evidence and root causes:**
- Jobs `d1689df...` and `466c86...` used the Captain input `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` and produced only one AtomicClaim. Root cause: Stage 1 prompt/validation allowed a near-verbatim combined claim even when the extracted event/status inventory implied separable assertions. Fixed by `dfa96a3f` and `237c4ed6`; later runs produced 2-3 candidate claims instead of one.
- Draft `5b76a16a2ffa43e291774b5ac00721d3` for the Grander URL failed preparation with `preservesContract=false`. Root cause: fetched URL content was structurally article-like, but Pass 2 classified it as `multi_assertion_input`; the final selector then capped a clean contract-approved set and omitted central product claims. Fixed by `61971249`. Retrying the same draft after restart reached `AWAITING_CLAIM_SELECTION` with 5 candidate claims and contract approval.
- Final Grander job `2783e52c690247d4983b380f84dfe970` completed after the retry: `FALSE`, truth 14, confidence 71, runtime `61971249...+42339db6`. The report used 4 selected claims, 71 evidence items, and 23 sources. The PDF parse failures in warnings are real source-acquisition limitations, currently surfaced as `info`, not a contract failure.
- Jobs `3328ed...` / `00aa98...` for the SVP PDF URL were `UNVERIFIED`/damaged. Root cause is the same article-preservation class but with Pass 2 classifying URL-fetched article text as `single_atomic_claim`. Fixed by `49f9cea6` with tests for URL-sourced structurally article input while preserving caps for pasted text single-claim cases. This fix was committed and services were restarted afterward, but not live-validated with another expensive SVP run.
- Draft `9fca...` for the French government URL failed because the external source returned/fetched as unavailable (403-style acquisition failure). No pipeline fix was justified from available evidence; classify as source/access reality unless repeated across accessible URLs.
- The `235000 Flüchtlinge...` comparison failure remains a separate open Stage 1 comparison-preservation issue. Earlier evidence suggested the LLM distorted an approximate comparison into an exact comparator-side figure. This was not fixed in this slice because the current evidence did not justify stacking another broad prompt change on top of the validated article-preservation fixes.
- Slow live-job progress was observed, especially long Stage 1/Stage 4 waits, but the Grander job kept emitting events and completed. No deadlock was found. Performance opportunities remain in OCR/PDF fallback, long-stage heartbeat reporting, and safe reuse; no new concurrency change was made in this slice.
- `restart-clean.ps1` successfully reloaded port-bound FactHarbor services and reseeded config/prompt state. Many `fh-knowledge-mcp` Node processes remained, but they appear tied to MCP/client sessions rather than FactHarbor web/API runtime. Treat as operational noise unless resource pressure is confirmed.

**Verification:**
- Focused Stage 1 pipeline tests passed after the article/multi-claim fix.
- `npm -w apps/web run build` passed after the article/multi-claim fix and again after the URL/article fix; reseed reported `0 changed`.
- Services were restarted after `61971249`; the Grander retry succeeded and produced final job `2783e52c690247d4983b380f84dfe970`.
- Services were restarted again after `49f9cea6`; `http://localhost:3000/jobs` and `http://localhost:5000/swagger/index.html` both returned HTTP 200.
- Full safe `npm test` passed on 2026-04-25. The suite emitted expected fallback/error-path logs but exited cleanly.
- The shared Codex in-app browser was restored through the Browser Use `iab` runtime and left on `http://localhost:3000/jobs` for Captain visibility.

**Open items:**
- Live-validate `49f9cea6` on a URL/article run only when the cost is justified. The fix is covered by focused tests and loaded in runtime, but the direct SVP damaged-report path was not re-run after the final restart.
- Investigate and fix the `235000 Flüchtlinge...` approximate-comparison preservation failure separately. It should focus on generic comparative-claim preservation and must not use hardcoded German terms.
- Improve long-stage progress/heartbeat reporting so Captain can distinguish slow but active jobs from stalled jobs without reading DB events.
- Consider OCR or image-PDF fallback for sources where PDF parsing extracts empty text, especially recurring Grander/University of Vienna PDFs.
- Review whether MCP client lifecycle should be cleaned up outside FactHarbor service restart scripts. Do not kill these processes inside `restart-clean.ps1` unless the owning clients and risk are clearly understood.

**Warnings:**
- Do not rely on `inputClassification` alone for structural claim selection behavior. URL/article source type and fetched-text structure must survive into final selection logic.
- Avoid broad prompt edits until each failed attempt is classified as keep/quarantine/revert. The successful fixes here were kept because focused tests and live retry evidence supported them.
- Historical jobs with `+dirty` runtime hashes are useful for diagnosis but should not be treated as clean baselines for regression attribution.
- `source_fetch_failure` and `source_fetch_degradation` need severity discipline: source-access reality can be `info`/`warning`, but system-level acquisition collapse must still surface prominently.

**For next agent:**
- Start from commits `12783ed1`, `6a697718`, `dfa96a3f`, `237c4ed6`, `61971249`, and `49f9cea6`. The services are on `main` and were restarted after the latest commit.
- If continuing validation, use Captain-approved exact inputs only. Submit through a UTF-8-safe path such as Node for non-ASCII inputs.
- The next highest-value pipeline slice is the still-open approximate-comparison preservation issue, not another article-preservation change.

**Continuation debate (2026-04-25):**
- Proposition debated: prioritize the approximate-comparison preservation issue for `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.` before SVP rerun, heartbeat/progress, OCR/PDF fallback, or broad docs cleanup.
- Advocate argued this is the highest-leverage remaining report-quality issue because Stage 1 can distort the analytical unit before research and verdict.
- Challenger argued for one post-restart SVP live rerun first, because the direct URL/article fix is loaded but not live-confirmed.
- Reconciler verdict: `MODIFY`. Continue with the approximate-comparison slice next, but define that slice as local verification first, then a generic multilingual fix only if verification confirms the defect, then safe focused tests. Defer the SVP live rerun until the comparison slice reaches a verifier-backed stopping point.
- Adopted constraints: use the Captain-approved input exactly; no German/Swiss/refugee/World-War-II/SVP/domain-specific hardcoding; no deterministic semantic comparison logic; do not regress article preservation; preserve unrelated dirty docs/index work.

**Learnings:** Not appended to `Role_Learnings.md` in this slice. Candidate learning: URL-fetched article text may be semantically classified as `single_atomic_claim` or `multi_assertion_input`; structural source type must be threaded separately when code is making non-semantic selection/capping decisions.
