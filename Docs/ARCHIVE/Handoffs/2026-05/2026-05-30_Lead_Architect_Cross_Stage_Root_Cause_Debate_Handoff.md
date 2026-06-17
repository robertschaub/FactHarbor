---
### 2026-05-30 | Lead Architect + LLM Expert | Codex (GPT-5) | Cross-Stage Root-Cause Debate Handoff

**Task:** Preserve the full working context from the long stabilization/regression thread so a successor can continue without reconstructing the entire chat.

**Files touched:**
- `Docs/AGENTS/Handoffs/2026-05-30_Lead_Architect_Cross_Stage_Root_Cause_Debate_Handoff.md` (this handoff)
- `Docs/AGENTS/Agent_Outputs.md` (earlier appended re-grounded consolidation; needs final index row for this handoff)
- `test-output/agent-review-packets/2026-05-30_post_stage4_root_cause_external_review.md` (review packet created for external Claude/Gemini analysis)

**Current repo state warning:**
- At last check: `main...origin/main [ahead 30]`
- Dirty/untracked files were present before this handoff was written:
  - Modified: `.gitignore`, `Docs/AGENTS/Agent_Outputs.md`
  - Untracked: `job_184f0bba8eb8480ea7f658969f663800.json`, `job_4ba5e6e52e8f4930a6140adabbb5c956.json`, `job_a8b32cb6531b4ec5aa5b30392c2dbdad.json`, `jobs_dump.json`, `jobs_dump.txt`
- Do not revert/delete these without Captain approval. Some may have been created by external Gemini/manual inspection, not by this agent.

## Key Decisions So Far

### 1. Do not stack fixes without a proven root cause

The Captain pushed back repeatedly that the team may be piling failed attempts on top of each other. This is now the governing constraint. The next agent should not implement another prompt/code change until it has proven the mechanism from actual job traces and source references.

Current safest next move is **diagnostic**, not implementation:
1. Reconstruct exact upstream/downstream contracts for Hydrogen, EN Bolsonaro, PT Bolsonaro.
2. Identify whether they share a deeper contract-mismatch pattern or only superficially similar symptoms.
3. Only then propose one narrow fix with rollback/quarantine criteria.

### 2. `ac3b33da` is classified as KEEP, but not a general solution

Commit:
- `ac3b33da fix(analyzer): enforce plausible repaired verdict citations`
- Files: `apps/web/src/lib/analyzer/verdict-stage.ts`, `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`

Consensus across Codex, Claude Opus 4.6, and Gemini 3.1 Pro Preview:
- Keep it.
- It tightened real citation hygiene and prevented non-direct/contextual/sibling evidence from being published as normal directional citations.
- It did not solve all report-quality problems.
- Reverting it would likely re-open unauditable verdicts.

Open caution:
- `direction_rescue_plausible` can still accept normalized verdicts after a direction validator complaint if structural plausibility passes.
- Later debate concluded the PT Bolsonaro instance appears healthy because final citations were direct and claim-local, so do not fix this without a concrete bad rescue case.

### 3. EN Bolsonaro AC_02 is no longer confidently diagnosed as a Stage 2 bug

Job:
- `4ba5e6e52e8f4930a6140adabbb5c956`
- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Executed source: `8061954edfc98807494b5aaef14a9baf1d8c2532`
- Overall: `UNVERIFIED`, truth about `54.7`, confidence `24`
- AC_02: `UNVERIFIED`, `verdictReason=verdict_integrity_failure`, zero final support/contradict citations

Earlier Codex/Claude hypothesis:
- OAS/IACHR report evidence was found but got stuck as AC_01/contextual, implying Stage 2 cross-claim attribution/publication-readiness caused the failure.

Later corrected debate finding:
- The OAS/IACHR evidence in that job (`EV_006`/`EV_007`, `relebrazilreport.pdf`) appears to discuss ADPF 572 / Fake News inquiry confidentiality and defense access, not a direct AP 2668 fair-trial evaluation.
- Re-attributing those items to AC_02 would probably still leave them contextual under `APPLICABILITY_ASSESSMENT` rules.
- Stage 4 likely did the right thing by refusing to publish direct fair-trial compliance without direct evidence.

Important unresolved question:
- This does not prove Stage 2 is healthy. It only weakens the claim that EN AC_02 proves Stage 2 caused a wrong report.
- There remains a latent structural risk:
  - `research-extraction-stage.ts` seeds evidence with `relevantClaimIds: [targetClaim.id]`.
  - `research-orchestrator.ts::evaluateEvidenceSufficiency` counts directional evidence without direct applicability.
  - Applicability runs late and can leave Stage 4 with no publishable citations.
- The successor should decide whether this is a monitored latent defect or a concrete bug by finding a case where the mismatch caused a wrong published verdict, not just a conservative downgrade.

### 4. PT Bolsonaro is healthier, but not release-proof

Job:
- `a8b32cb6531b4ec5aa5b30392c2dbdad`
- Input: `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
- Executed source: `8061954edfc98807494b5aaef14a9baf1d8c2532`
- Overall: `LEANING-TRUE`, truth about `59.7`, confidence `58`
- Three claims, 109 evidence, 6 boundaries.
- AC_02 published after `direction_rescue_plausible`.

Important nuance:
- PT AC_02 is not equivalent to EN AC_02. PT asks Brazilian procedural/constitutional compliance and just verdicts; EN includes international fair-trial standards.
- Debate consensus: do not treat PT success as proving EN should also publish.

### 5. Hydrogen is the strongest concrete regression, but still requires root-cause proof before fixing

Job:
- `184f0bba8eb8480ea7f658969f663800`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Executed source: `8061954edfc98807494b5aaef14a9baf1d8c2532`
- Overall: `UNVERIFIED`, truth `50`, confidence `0`
- Evidence/boundaries: zero
- Failure: pre-research `report_damaged`

Observed extraction:
- AC_01: hydrogen cars more efficient than electric cars in well-to-wheel terms
- AC_02: hydrogen cars more efficient than electric cars in tank-to-wheel terms
- AC_03: hydrogen cars more efficient in terms of energy density

Debate hypothesis:
- `CLAIM_CONTRACT_VALIDATION` may contain a Rule 2 / Rule 3 interaction problem:
  - One rule allows neutral dimension qualifiers for broad evaluative/comparative predicates.
  - Another rule treats technical dimensions as proxy drift.
- The validator may have both cited AC_01/AC_02 as anchor-preserving and rejected them as material proxy drift.

Captain's latest correction:
- Do not just "fix Hydrogen" based on this plausible story.
- First prove the root cause from exact job fields and exact prompt/code lines.
- Also consider whether Hydrogen, EN Bolsonaro, and PT Bolsonaro share a deeper pattern: upstream validity/sufficiency contracts disagreeing with downstream publishability/citability contracts.

## External Agent Work Already Done

### Claude

Initial direct call used direct CLI before discovering repo wrapper:
- Direct CLI model looked like `opus`; result saved at:
  - `C:\Users\rober\.claude\plans\read-test-output-agent-review-packets-20-tender-manatee.md`

Then rerun correctly through wrapper:
- `node scripts/agents/invoke-claude.cjs`
- Wrapper default model: `claude-opus-4-6`
- Debate output saved at:
  - `C:\Users\rober\.claude\plans\debate-round-1-wondrous-cosmos.md`
  - `C:\Users\rober\.claude\plans\debate-round-2-cheeky-lake.md`

Claude final Round 2 position:
- Hydrogen is the concrete regression to investigate first.
- EN Bolsonaro AC_02 likely reflects evidence scarcity/directness gap, not a proven Stage 2 bug.
- Stage 2 publication-readiness and cross-claim attribution are real latent risks, but defer until concrete harm is proven.
- Stage 4 rescue hardening is deferred.

### Gemini

Initial Codex attempt mistakenly used Gemini CLI `gemini-2.5-pro`; lower-weight result.

Captain called Gemini manually with:
- `gemini-3.1-pro-preview`
- Result pasted in:
  - `C:\Users\rober\.codex\attachments\37eb1375-7549-4ad6-a75e-13b1ba80179d\pasted-text.txt`

Then Codex reran correctly through wrapper:
- `node scripts/agents/invoke-gemini.cjs`
- Wrapper default model: `gemini-3.1-pro-preview`

Gemini final Round 2 position:
- Hydrogen is first.
- Stage 2 publication-readiness is also a real bug because the system may stop searching before proving direct evidence is unavailable.
- It recommends a fast-follow Stage 2 gate after Hydrogen: after applicability assessment, if a claim has directional evidence but no direct evidence, trigger targeted re-research instead of sending it to Stage 4.

Unresolved debate:
- Claude says Stage 2 gate is latent/diagnostic and could add complexity without changing outcomes.
- Gemini says failing to perform direct-evidence-targeted re-research is premature capitulation and a real research-quality bug.
- Captain's latest point reframes this: maybe all these are examples of contract mismatch. The successor should audit this pattern before selecting a fix.

## Important Source Files And Sections

Read these before proposing changes:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
  - contract validation flow
  - anchor/provenance override logic
  - completion repair behavior
- `apps/web/prompts/claimboundary.prompt.md`
  - `CLAIM_CONTRACT_VALIDATION`
  - `CLAIM_CONTRACT_COMPLETION`
  - broad comparative efficiency / dimension qualification rules
  - `APPLICABILITY_ASSESSMENT`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
  - `evaluateEvidenceSufficiency`
  - claim targeting/research budget behavior
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
  - `extractResearchEvidence`
  - `assessEvidenceApplicability`
  - forced `relevantClaimIds: [targetClaim.id]`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
  - `validateVerdicts`
  - `normalizeVerdictCitationDirections`
  - `isVerdictDirectionPlausible`
  - `safeDowngradeVerdict`
- Benchmark docs:
  - `Docs/AGENTS/Captain_Quality_Expectations.md`
  - `Docs/AGENTS/benchmark-expectations.json`
  - `Docs/AGENTS/report-quality-expectations.json`

## Recommended Successor Workflow

Do not start by editing. Start with a cross-stage contract audit:

1. **Hydrogen trace reconstruction**
   - Load `job_184f0bba8eb8480ea7f658969f663800.json` if present, otherwise API/DB.
   - Extract:
     - `understanding.contractValidationSummary`
     - per-claim validation reasons
     - completion diagnostic/result
     - exact terminal `report_damaged` reason
   - Map each validator objection to the exact prompt rule and source code path that enforced it.

2. **EN Bolsonaro contract reconstruction**
   - Load `job_4ba5e6e52e8f4930a6140adabbb5c956.json` if present, otherwise API/DB.
   - For AC_02, list every candidate evidence item used or rejected by Stage 4:
     - source title/url
     - statement
     - `relevantClaimIds`
     - `applicability`
     - `claimDirection`
   - Determine whether the failure is:
     - correct evidence scarcity,
     - insufficient targeted research,
     - applicability/mapping issue,
     - or benchmark expectation mismatch.

3. **PT Bolsonaro rescue reconstruction**
   - Load `job_a8b32cb6531b4ec5aa5b30392c2dbdad.json` if present, otherwise API/DB.
   - For AC_02, compare pre-normalization issue, post-normalization final citations, and whether the rescue published semantically coherent evidence.

4. **Classify shared root**
   - For each case identify:
     - upstream acceptance criterion
     - downstream acceptance criterion
     - whether they disagree
     - whether the disagreement caused wrong output, conservative downgrade, wasted cost, or only warning noise
   - Only then choose a fix.

5. **If a fix is proposed**
   - Make it one narrow slice only.
   - Write expected verifier and rollback/quarantine condition before editing.
   - Do not combine Hydrogen prompt fix with Stage 2/Stage 4 changes.

## Current Best Hypotheses, With Confidence

1. **Hydrogen pre-research failure is a concrete regression.** High confidence.
2. **Hydrogen's root cause is a claim-contract prompt/code interaction around neutral dimension qualifiers vs proxy drift.** Medium-high, but must be proven from exact trace before editing.
3. **EN Bolsonaro AC_02 currently looks like correct conservative refusal to publish non-direct evidence.** Medium-high.
4. **Stage 2 evidence sufficiency/publication-readiness mismatch is real architecture debt.** High.
5. **Stage 2 mismatch is the proven cause of a wrong report in the current three jobs.** Low/contested.
6. **Stage 4 `direction_rescue_plausible` is currently a bug requiring immediate fix.** Low; monitor.

## Warnings

- Prompt changes require explicit Captain approval.
- Do not use concrete test-case terms in prompt edits. If editing prompts, phrase in abstract generic terms.
- No domain-specific hardcoding.
- Do not add deterministic semantic text analysis. Semantic classification/remap/applicability must remain LLM/prompt/UCM-driven.
- Do not run live jobs before committing and refreshing runtime if source/prompt/config changes are made.
- Stop after one failed validation attempt; classify the attempt as keep/quarantine/revert before adding another change.
- Do not treat deployed/local differences as regressions without exact commit/prompt/config provenance.
- Prompt caching must remain off in UCM/defaults.

## Learnings

Not appended to `Role_Learnings.md` yet. Candidate learning for later curation:
- When multiple report failures look related, first compare upstream and downstream contracts across stages before fixing the most obvious symptom. A conservative downgrade can be correct behavior while still exposing architecture debt.

**For next agent:** The Captain's latest request supersedes the earlier "fix Hydrogen first" framing. Continue with a diagnostic cross-stage contract audit. Prove whether Hydrogen, EN Bolsonaro, and PT Bolsonaro share a real contract-mismatch root before proposing any implementation. Keep `ac3b33da`; do not touch Stage 2/Stage 4/Hydrogen prompt until the exact root has been proven from job fields and source references.
