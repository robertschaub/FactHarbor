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
- Look into `apps\web\debug-analyzer.log`.
- If you are clearly missing information you can also use Swagger to investigate, 
- Analyze the reports, investigate if the current step is done respectively fixed.
- And check if earlier issues are not re-introduced.
- Search for other issues, flaws and inconsistencies.
- Report to .md file and fix found issues automatically if you can.

---

## Tasks Pending:
---
Article Confidence:
- Article verdict and Article confidence belong together, confidence is about how confident we are that the verdict is correct (thats the same principle at every level: Claim/Context/Article). Please check if this is implemented correctly.
---

## Tasks Reoccurring
---
Cleanup and reorganize documentation:
- Update HISTORY.md consolidating all important historical information found in other documents
- Update STATUS documents with important information found anywhere and that still apply to current implementation 
- Reorganize Docs/ structure and update cross-references
- Update README.md to reflect accurate current state
- Delete obsolete documentation files
---

## Tasks in Progress:
---
Make sure :
-Prompts and search terms are up to date, misleading terms are now correct
-The Admin editatble configurations (prompts, search, calculation) are in sync with the now changed source code and terms. Also the files at FactHarbor\apps\web\prompts
-calculation configuration is extended for the newly introduced types where it maks sense to let admin do tuning. Also for search configuration.
-Any related existin test is updated, test coverage is reasonably good.
-Comments in code are correct.
-Hints and rules for Agents are up to date and correct and cover all important current main entities.
-All related documantation is up to date, also history, status and architecture docs. Docs that are only needed to look back are in archive. And all documentation is consistant and also cross-links exists where meaningful and are up to date.

---
You are a 1st class reviewer and analyzer! 
Now there's something really important that I need an exceptionally deep analysis from you:
Report quality (Orchestrated pipeline) is still not as desired

We see these issues in reports:
a) Contexts that should be detected are not detected.
b) Contexts that should be tangential are used.
c) Counter Claims and Counter evidence is still sometimes not correctly detected and take into account (directionality is wrong)
d) At claims we sometimes see "contested" where it should only be doubted, or even not be mentioned at all because completely baselss (particularily US Government makes baseless claims and baseless contradictions - seen in multiple reports)

I see these potential areas why the reports are not as good as earlier:
1. We removed specific wording in prompts (but wee needed to)
2. We have too complicated prompting now
3. We had cleaned up code to get rid of confusions on terms: Frame, Scope, Context , and with this introduced unintended changes
4. The now clear differentiation between Scope and Context is counter-productive
5. There simply is a conceptual flaw (please provide diagrams that help to better understand. Especially show how the main Entities (Article, ArticleFrame, Claim, EvidenceScope, AnalysisContext) are used and relate at Analysis, Prompt input, Prompt Output and Display.

---
Tangential claim handling:
- make sure that tangential source value is retreived in a meaningful way (from LLM i guess).
- make sure tangential claims verdicts are not calculated into upper level verdicts.
- make sure tangential claims are marked as such in the GUI

---
Verdict direction:
For Claims where the verdict at the core is a denyal of the claim, 
and for Claims that are counter-claims (from counter-evidence);
Make sure that the rating is correct, in the right direction. 
And make sure that the influence into the upper-level verdict is in the right direction.
---
- Check if  verdicts and key factors correctly influence (positive or negatively) the overall verdict, because sometimes lower-level key factors and claims have inverted logic vs the original article as it is (was?) the case with the article "hydrogen for cars is more efficient than using electricity", e.g. the lower-level claim "Hydrogen fuel cell vehicles have higher well-to-wheel energy efficiency than battery electric vehicles" inverts the comparison. The inversion logic shall be done when overall article verdict values are calculated.
---
- Check if all titles, and labels really match with underlying content! (e.g. “Article Summary" shall really contain Article Summary etc.)
---
- Some claims talk about methodologies used and if these are valid to be used to verify the claims from the input - such claims are clearly not central and not even worth mentioning.
---
- Job progress is often slow. Find solutions.
---
- Analyze the current source-code to find where it does not follow the "Coding Agent Rules.md
---


## Tasks done
---
Input url detection:
- Improve url detection: e.g. this input is not an url:  https://www.gazetadopovo.com.br/ is a reliable news source that provides news based on facts and evidence
---
Layout improvements in the "Summary" page:
 - Article box shall contain all properties of an article: Summary, Verdict, Key Factors, Assesment
 - Allways show "Article Summary", containig the ArticleSummary data (as described earlier).
 - Never show "Implied Claim"
 - Never show "Question asked"
 - At any verdict (also at Article Verdict): Confidence should allways be after verdict value like e.g. ✓ Mostly True 82% (80% confidence)
 - Please make sure styles of item titles and item labels and content are unified
 - Make sure displayed labels are aligned with the underlying data and are formatted for readability (e.g. show label "Frame" for ArticleFrame data).
 - Rename "ArticleFrame-by-ArticleFrame Analysis" to "Contexts"
 - Further unify layout variants. E.g. at article it sometimes it sais "Overall Verdict", and sometimes it sais "Article verdict", instead it should just show "Verdict"
---
ArticleSummary data:
 - Make sure we have ArticleSummary data
 - if the input is an url, the article at the url page shall be summarized into ArticleSummary.
 - If the Input is text and text length is shorter than 300 characters, the ArticleSummary shall be a copy of the input.
 - Else: ArticleSummary shall be a summarize the article input.
---
Reports of question vs. equal statement differ. Fix:
- There are still differences between the two "Bolsonaro Judgement" reports for input as question vs. equal statement.
- See "Handling when input is a question" - I assume then this is fixed, there should not anymore be a difference.
---
Handling when input is a question: 
 - When an Input is a question, a statement with exactly the same meaning shall be derived from the question. 
 - The statement shall be used for analysis, not the question, the question shall not be used further on for anything else than for display!
---
- Too many claims are often marked as central.
---
LLM sometimes not aware about current time and recent information:
- LLM is sometimes not aware about the current date. Resulting in information like "Temporal error". 
Please detect when a verdict or claim comment statement does not recognize the current date and makes false comments like "temporal error" and "in the future from the current date" or "date discrepancy".
- LLM often did not find very recent information e.g. that Blosonaro trial sentenca was 27 years. Make sure this problem is covered well.
---
- We use ArticleFrame for article narrative/background framing. Important note: do not confuse ArticleFrame with EvidenceScope (per-fact source scope). Make sure this is consistently done.
---
- With single scope report, the layout is different than with multi scope report. Please generalize the layout, so that for single scope report, the same layout is used as with multi scope, but in the single scope case, omit the layout elements that are not needed for single scope.
---
- At page "FactHarbor Jobs" pagination prev/next does nothing. Please make sure that at the jobs page we can really page back - currently it seem that noch all data from the database is available.
---
- Now, with your latest change, jobs with non question article "The Bolsonaro judgment (trial) was fair and based on Brazil's law" give bad results, especially no multi preceeding is detected. And both ways formulated as qustion or not (with "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?" and with "The Bolsonaro judgment (trial) was fair and based on Brazil's law") the 27 year sentence is not found. Again, I am sure a web search would find this, but it seems LLM call's often don't (I gues becauise not yet trained with recent data).
---
- Avoid such very specifc code and promts, make it more generic:
words like: 'trial', 'judgment', 'sentence', 'prison', 'conviction', 'case', 'proceeding', 'coup', 'election', 'court', 'judge', 'ruling', 'verdict', 'bolsonaro', 'putin', 'trump'
specific outcomes, penalties, or consequences: e.g. "27-year sentence", "fined $X", "banned for Y years"
---
- **CRITICAL**: Prompt examples must NOT include terms, phrases, or patterns from known test cases or verification inputs. Use abstract placeholders only (e.g., "Entity A did X", "Event E occurred") to avoid teaching to the test.
---
- Make sure such debugging code is only active used in local environment and it matches the specific execution: fetch('http://127.0.0.1:7242
---
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
- The summary page is intended as the main page for the end-user.
---
