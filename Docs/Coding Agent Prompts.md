## Build Initial knowledge

Read docs:

- AGENTS.md
- KeyFactors-Design-Decision.md
- FactHarbor_Code_Spec_Review.md
- StatusAndNext.md
- Coding Agent Prompts.md
- and other recently changed `.md` files

And analyze the current source code.

---

## General rule for any changes:

- After each bigger step, run automated test without my participation.
- Re-test the recent analyses inputs (Especially the two Bolsonaro inputs, the Hydrogen vs Electric Cars input, the one with the .pdf article and the Venezuela article).
- Use Swagger to investigate, and look into `apps\web\debug-analyzer.log`.
- Analyze the reports, investigate if the current step is done respectively fixed.
- And check if earlier issues are not re-introduced.
- Search for other issues, flaws and inconsistencies.
- Report to .md file and fix found issues automatically if you can.

---

## Tasks Pending:
---
- Improve url detection: e.g. this input is not an url:  https://www.gazetadopovo.com.br/ is a reliable news source that provides news based on facts and evidence
---
- Some claims talk about methodologies used and if these are valid to be used to verify the claims from the input - such claims are clearly not central and not even worth mentioning.
--
- Make sure that verdicts and key factors correctly influence (positive or negatively) the overall verdict, because sometimes lower-level key factors and claims have inverted logic vs the original article as it is (was?) the case with the article "hydrogen for cars is more efficient than using electricity", e.g. the lower-level claim "Hydrogen fuel cell vehicles have higher well-to-wheel energy efficiency than battery electric vehicles" inverts the comparison. The inversion logic shall be done when overall article verdict values are calculated.
---
- Make sure titles, and labels really match with underlying content! (e.g. “Article Summary" shall really contain Article Summary etc.)
---
- Too many claims are often marked as central.
---
Article Confidence:
- Article verdict and Article confidence belong together! Confidence is about how confident we are that the verdict is correct (thats the same principle at every level: Claim/Context/Article)! Both the article verdict and the article confidence must relate to the original article input (no matter if it was a question or not)! 
---

## Tasks in Progress:
---
ArticleSummary data:
 - Make sure we have ArticleSummary data
 - if the input is an url, the article at the url page shall be summarized into ArticleSummary.
 - If the Input is text and text length is shorter than 300 characters, the ArticleSummary shall be a copy of the input.
 - Else: ArticleSummary shall be a summarize the article input.
---
Layout improvements in the "Summary" page:
 - Article box shall contain all properties of an article: Summary, Verdict, Key Factors, Assesment
 - Allways show "Article Summary", containig the ArticleSummary data (as described earlier).
 - Never show "Implied Claim"
 - Never show "Question asked"
 - At any verdict (also at Article Verdict): Confidence should allways be after verdict value like e.g. ✓ Mostly True 82% (80% confidence)
 - Please make sure styles of item titles and item labels and content are unified
 - Make sure displayed labels are aligned with the underlying data and are formatted for readybility (e.g. show label "Context" for ArticleContext data).
 - Rename "ArticleContext-by-ArticleContext Analysis" to "Contexts"
 - Further unify layout variants. E.g. at article it sometimes it sais "Overall Verdict", and sometimes it sais "Article verdict", instead it should just show "Verdict"

## Tasks done
---
Input neutrality (v2.6.27): Question vs. statement handling fixed
- When input is a question, it's normalized to an equivalent statement at entry point
- The normalized statement is used for ALL analysis (not the question)
- Original question is preserved only for UI display
- Renamed all "Question" types/fields to neutral terms (VerdictSummary, analysisIntent, etc.)
- Test result: 1% verdict difference (within LLM tolerance)
---
LLM sometimes not aware about current time and recent information:
- LLM is sometimes not aware about the current date. Resulting in information like "Temporal error". 
Please detect when a verdict or claim comment statement does not recognize the current date and makes false comments like "temporal error" and "in the future from the current date" or "date discrepancy".
- LLM often did not find very recent information e.g. that Blosonaro trial sentenca was 27 years. Make sure this problem is covered well.
---
- We had renamed in code the article related terms previously used: Scope and Proceeding to ArticleContext. Important note: do not confuse with the EvidenceScope. Make sure tis is cconsistantly done. 
---
- Analyze the current source-code to find  me where it does not follow the "Coding Agent Rules.md, then please fix where it does not.
- With single scope report, the layout is different than with multi scope report. Please generalize the layout, so that for single scope report, the same layout is used as with multi scope, but in the single scope case, omit the layout elements that are not needed for single scope.
---
- At page "FactHarbor Jobs" pagination prev/next does nothing. Please make sure that at the jobs page we can really page back - currently it seem that noch all data from the database is available.
---
- Now, with your latest change, jobs with non question article "The Bolsonaro judgment (trial) was fair and based on Brazil's law" give bad results, especially no multi preceeding is detected. And both ways formulated as qustion or not (with "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?" and with "The Bolsonaro judgment (trial) was fair and based on Brazil's law") the 27 year sentence is not found. Again, I am sure a web search would find this, but it seems LLM call's often don't (I gues becauise not yet trained with recent data).
---
- in the past we had shown confidence number at the right of verdict, please re-add.
---
- Avoid such very specifc code and promts, make it more generic:
```
'trial', 'judgment', 'sentence', 'conviction', 'case', 'proceeding', 'coup', 'election', 'court', 'judge', 'ruling', 'verdict', 'bolsonaro', 'putin', 'trump' // Known recent political figures with ongoing cases
specific outcome was fair, proportionate, or appropriate. Example: If "27-year prison sentence" is mentioned, generate a claim like "The 27-year prison sentence was proportionate to the crimes committed and consistent with similar cases."
specific outcomes, penalties, or consequences are mentioned (e.g., "27-year sentence", "fined $X", "banned for Y years"), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate.`;
const isHighImpactOutcome =
    hay.includes("sentenced") ||
    hay.includes("convicted") ||
    hay.includes("years in prison") ||
    hay.includes("year prison") ||
    hay.includes("months in prison") ||
    (hay.includes("prison") && hay.includes("year"));
```
---
- Make sure such debugging code is only active used in local environment and it matches the specific execution: fetch('http://127.0.0.1:7242
---
- With recent changes responsiveness somtimes is slow. Especiall with job queing, there should not be such long waits. When there are about 3 or 4 jobs already running, the analyze button is disabled for a while =>fix
- Regarding multi proceedings (a.k.a. multi-events): There could be more then two, therefore:
  - Make it possible that more than two could be found.
  - Change the layout for multi proceedings that they are not anymore side-by-side (in columns), but in rows instead.
- Please document in a new  docs\Calculations.md file, and maybe we still need to improve?:
  - Check if counter-evidence is distinguished from evidence and correctly influences verdict calculation (positive vs. negative).
  - article-keyfactor-claim verdict calculation: how is a verdict determined respectively calculated from lower level verdicts?
  - how is confidence considered in calculations?
  - how is this solved: if there are claims that are extremely close, like "The Venezuelan takeover of oil assets constituted theft of American property" and "The Venezuelan oil asset seizure was one of the largest thefts of American property in US history" =>verdict calculation sould not be fully influenced mutiple times
---
- Change verdict (ClaimVerdict.verdict) and truth values to be a number 0-100% everywhere, only map to the 7-scale name for the UI. Do not anymore use the 4-scale verdict: WELL-SUPPORTED,PARTIALLY-SUPPORTED,UNCERTAIN,REFUTED. But in the UI use the 7-scale verdict:
  - TRUE (86-100%, Score +3)
  - MOSTLY-TRUE (72-85%, Score +2)
  - LEANING-TRUE (58-71%, Score +1)
  - UNVERIFIED (43-57%, Score 0)
  - LEANING-FALSE (29-42%, Score -1)
  - MOSTLY-FALSE (15-28%, Score -2)
  - FALSE (0-14%, Score -3))
---
- make multi-proceeding detection (prompt and display etc.) generic not only for legal cases and questions
---
- The "Report" page contains only redundant information - except the "Implied claim" but that's just the same as the article summary, just a bit rephrased - right? If so we can remove the "Report" page. What makes more sense to make visible - the Article Summary, or the "Implied claim"? If both are important, then have both at the Summary page inside one box.
---
- Move the Article box above Article Verdict, rename the "Article" box to "Article Summary", inside remove the "Title" (label and content), and remove the "Summary" label - so that the text in the boy is only the Article summary.
---
- The summary page is intended as the main page for the end-user.
---
