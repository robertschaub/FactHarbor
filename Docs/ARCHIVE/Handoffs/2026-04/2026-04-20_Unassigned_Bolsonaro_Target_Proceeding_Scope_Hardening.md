### 2026-04-20 | Unassigned | Codex (GPT-5) | Bolsonaro Target-Proceeding Scope Hardening

**Task:** Investigate why the clean-commit English Bolsonaro rerun still finished `UNVERIFIED`, identify the remaining contamination path, and harden the generic prompt rules without reverting the earlier foreign-assessment fix.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`

**Done:**
- Confirmed the still-bad clean rerun was job `dcf03371b29249abae8111a8049cfabc`, executed on committed runtime `003d218a022c4a9231a310c09cd8aebb31aa786f` with prompt hash `75919c382c3ed142ac7dc1e3ddf084d28edc91c9c48725506c6505e6956d211b`, so this was not a stale-runtime artifact.
- Verified the remaining regression was not primarily a foreign-government leak. The dominant failure mode was same-system / same-actor scope bleed: earlier or collateral STF investigations and broader institutional controversies were still shaping the fair-trial claims as if they directly documented the target coup-trial proceeding.
- Extracted the concrete bad path from the stored job payload:
  - `understanding.distinctEvents` still included the August 4, 2021 fake-news/electoral-system inquiry alongside the September 11, 2025 trial and post-verdict appeal path.
  - AC_02 and AC_03 were still citing off-scope or weakly bridged items such as the IACHR/SRFE report on confidential STF investigations (`EV_1776703466563`, `EV_1776703466564`), broader post-January-8 criticisms of Moraes (`EV_003`), and an unrelated January 8 riot sentencing example (`EV_1776703553124`) as if they were direct fair-trial contradiction for the target proceeding.
- Hardened Stage 1 `distinctEvents` guidance to require the narrowest same-matter / same-proceeding-path interpretation when the input only says "the proceedings", "the case", or "the verdict", and to avoid absorbing every earlier inquiry, sanction, or institutional dispute involving the same parties, authorities, adjudicators, institutions, or officeholders.
- Hardened Stage 2 query generation so legality / procedural-compliance / fair-trial claims must keep at least one query anchored to a target-case artifact (case file, charge, hearing/ruling record, judgment, appeal/remedy path, official court publication) instead of collapsing entirely into criticism, controversy, sanctions, or broad institutional commentary.
- Hardened Stage 2 relevance classification, evidence extraction, and applicability assessment so earlier or parallel proceedings, collateral inquiries, sanction episodes, impeachment efforts, and broader institutional controversies involving the same defendant, judge, court, prosecutor, or institution remain comparator/contextual unless the source explicitly documents the target case path or explicitly states that the criticized/supportive mechanism governed that target proceeding itself.
- Hardened `VERDICT_ADVOCATE` weighting so contextual material from other proceedings or broader institutional controversies can limit confidence but cannot by itself outweigh target-specific evidence unless the source explicitly bridges the mechanism into the target proceeding. Grounded external documentation about the target proceeding remains allowed; unsupported commentary, sanctions politics, and off-scope institutional disputes remain contextual background.
- Added prompt-contract coverage locking the new same-case-path, target-artifact query anchoring, same-actor comparator discipline, and off-scope-contextual verdict-weighting rules.
- Verified:
  - `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
  - `npx tsc -p apps/web/tsconfig.json --noEmit`
  - `npm -w apps/web run build`

**Key decisions:**
- Did not revert the earlier foreign-assessment fix. The current failure mode was narrower: off-scope same-system material was still entering as direct contradiction even after foreign-jurisdiction items were filtered more aggressively.
- Kept the fix generic-by-design. The new rules talk about target proceedings, case paths, target artifacts, and explicit mechanism bridging rather than Bolsonaro-, STF-, or Brazil-specific entities.
- Preserved room for grounded external or foreign documentation to matter when it actually documents the target proceeding with sourced findings. The fix blocks baseless commentary and off-scope controversy bleed, not all external assessment.

**Open items:**
- Commit the prompt/test fix set before any fresh live rerun.
- Reseed prompts on the committed revision and submit a fresh rerun for the approved English Bolsonaro input.
- Verify that the new rerun no longer includes the 2021 fake-news inquiry in `distinctEvents`, that AC_02/AC_03 are more tightly anchored to target-case artifacts, and that the report escapes `UNVERIFIED`.

**Warnings:**
- Some contradicting evidence on the failing run is legitimately target-case-specific, especially Justice Fux's dissent and concerns about the Mauro Cid collaboration agreement. The goal is not to force a positive verdict; it is to stop off-scope and weakly bridged material from counting as direct contradiction.
- The current prompt fix should demote unsupported same-system controversy, but if a fresh rerun still goes `UNVERIFIED`, the next diagnostic step is to inspect whether the remaining contradiction is now genuinely target-case-specific rather than a scope-classification error.

**For next agent:**
- Check the first fresh rerun after this commit. Focus on:
  - `resultJson.meta.executedWebGitCommitHash`
  - `resultJson.meta.promptContentHash`
  - `resultJson.understanding.distinctEvents`
  - AC_02 / AC_03 cited evidence IDs and whether off-scope investigation or riot-prosecution material still appears as direct contradiction
- If the rerun still fails, compare the remaining contradiction set against `dcf03371b29249abae8111a8049cfabc`. If the off-scope material is gone and the remaining contradiction is target-case-specific, treat it as a genuine evidentiary disagreement rather than another prompt leak.

**Learnings:**
- A clean execution commit does not mean the regression is gone. For report-review work, inspect `distinctEvents`, query mix, and claim-local cited evidence on the fresh job before assuming the previous prompt hardening solved the whole leak.
- In legal/fair-trial analyses, same actor or same institution overlap is not a sufficient scope bridge. Earlier inquiries, sanctions, or institutional conflicts can be highly salient yet still remain comparator/contextual unless the source explicitly ties the mechanism to the target proceeding.
