Read Docs:
Coding Agent Handover.md
Coding Agent Rules.md 
KeyFactors-Design-Decision.md
FactHarbor_Code_Spec_Review.md
StatusAndNext.md

And analyze the current source code.
---
OPEN Requests:
---
Almost all claims are marked as central - please investigate
---

DONE Requests (all below):
---
Analyze the current source-code an show me where it does not follow the "Coding Agent Rules.md, 
So then I can decide what to change.
---
in the past we had shown confidence number at the right of verdict, please re-add.
---
Please detect when a verdict or claim comment statement does not recognize the current date and makes false comments like "temporal error" and "in the future from the current date" or "date discrepancy"
---
At page "FactHarbor Jobs" pagination prev/next does nothing
Please make sure that at the jobs page we can really page back - currently it seem that noch all data from the database is available
---
Now, with your latest change, jobs with non question article "The Bolsonaro judgment (trial) was fair and based on Brazil's law" give bad results, especially no multi preceeding is detected.
And both ways formulated as qustion or not (with "Was the Bolsonaro judgment (trial) fair and based on Brazil's law?" and with "The Bolsonaro judgment (trial) was fair and based on Brazil's law") the 27 year sentence is not found.
Again, I am sure a web search would find this, but it seems LLM call's often don't (I gues becauise not yet trained with recent data).
---
Avoid such very specifc code and promts, make it more generic:
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
---
Make sure such debugging code is only active used in local environment and it matches the specific execution:
fetch('http://127.0.0.1:7242 
------
With recent changes responsiveness somtimes is slow. Especiall with job queing, there should not be such long waits.
When there are about 3 or 4 jobs already running, the analyze button is disabled for a while =>fix
---
Regardin multi proceedings (a.k.a. multi-events): There could be more then two, therefore:
-Make it possible that more than two could be found.
-Change the layout for multi proceedings that they are not anymore side-by-side (in columns), but in rows instead.
---
Please document in a new  docs\Calculations.md file, and maybe we still need to improve?:
-Check if counter-evidence is distinguished from evidence and correctly influences verdict calculation (positive vs. negative).
-article-keyfactor-claim verdict calculation: how is a verdict determined respectively calculated from lower level verdicts?
-how is confidence considered in calculations?
-how is this solved: if there are claims that are extremely close, like "The Venezuelan takeover of oil assets constituted theft of American property" and "The Venezuelan oil asset seizure was one of the largest thefts of American property in US history" =>verdict calculation sould not be fully influenced mutiple times
---
Change verdict (ClaimVerdict.verdict) and truth values to be a number 0-100% everywhere, only map to the 7-scale name for the UI.
Do not anymore use the 4-scale verdict: WELL-SUPPORTED,PARTIALLY-SUPPORTED,UNCERTAIN,REFUTED.
But in the UI use the 7-scale verdict:
TRUE (86-100%, Score +3)
MOSTLY-TRUE (72-85%, Score +2)
LEANING-TRUE (58-71%, Score +1)
UNVERIFIED (43-57%, Score 0)
LEANING-FALSE (29-42%, Score -1)
MOSTLY-FALSE (15-28%, Score -2)
FALSE (0-14%, Score -3))

Make sure this is done consistantly and dose not change any behaviour. But be carreful - Claude Code failed on this!
In case you find issues and would wand to fix code beyond just this task, then pease ask me.
---
make multi-proceeding detection (prompt and display etc.) generic not only for legal cases and questions
---
The "Report" page contains only redundant information - except the "Implied claim" but that's just the same as the article summary, just a bit rephrased - right?
If so we can remove the "Report" page.

What makes more sense to make visible - the Article Summary, or the "Implied claim"? If both are important, then have both at the Summary page inside one box.
---
Move the Article box above Article Verdict, rename the "Article" box to "Article Summary", inside remove the "Title" (label and content), and remove the "Summary" label - so that the text in the boy is only the Article summary.
---
The point is that the summary page is now intended as the main page for the end-user.
There, the "fact Harbor Analysis" (blue framed) holds redundand information, it can be complete removed.
In addition the Whole Article page is also redundant, can also be removed.
Then please extend the space in the Summera page Article Box so thate the article Title and the Article "Summary" (rename from "Main Thesis"). Have sufficient space.
---
