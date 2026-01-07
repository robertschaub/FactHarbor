Read Docs\Agent_Handover.md and Docs\Coding Agent Rules.md and analyze the current source code.

Then change verdict (ClaimVerdict.verdict) and truth values to be a number 0-100% everywhere, only map to the 7-scale name for the UI.
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
Please document, and maybe we sill need to improve?:
-Check if counter-evidence is distinguished from evidence and correctly influences verdict calculation (positive vs. negative).
-how is higher level verdict determined respectively calculated for each: claim/keyfactor/article?
-how is confidence considered in calculations?
-how is this solved: if there are claims that are extremely close, like "The Venezuelan takeover of oil assets constituted theft of American property" and "The Venezuelan oil asset seizure was one of the largest thefts of American property in US history" =>verdict calculation sould not be fully influenced mutiple times

---
Analyze the current source-code an show me where it does not follow the "Coding Agent Rules.md, 
So then I can decide what to change.

--
Almost all claims are marked as central

--

in the past we had shown confidence number at the right of verdict, please re-add.

---
Please detect when a verdict or claim comment statement does not recognize the current date and makes false comments like "temporal error" and "in the future from the current date" or "date discrepancy"
---
At page "FactHarbor Jobs" pagination prev/next does nothing
Please make sure that at the jobs page we can really page back - currently it seem that noch all data from the database is available



DONE:
---
The "Report" page contains only redundant information - except the "Implied claim" but that's just the same as the article summary, just a bit rephrased - right?
If so we can remove the "Report" page.

What makes more sense to make visible - the Article Summary, or the "Implied claim"? If both are important, then have both at the Summary page inside one box.
---
Move the Article box above Article Verdict, rename the "Article" box to "Article Summary", inside remove the "Title" (label and content), and remove the "Summary" label - so that the text in the boy is only the Article summary.
---
The point is that the summary page is now intended as tha main page for the end-user.
There, the "fact Harbor Analysis" (blue framed) holds redundand information, it can be complete removed.
In addition the Whole Article page is also redundant, can also be removed.
Then please extend the space in the Summera page Article Box so thate the article Title and the Article "Summary" (rename from "Main Thesis"). Have sufficient space.
---
