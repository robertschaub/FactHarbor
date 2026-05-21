# ACS Slow Dialog Real Issue: Fragment URL Expansion

Date: 2026-04-23  
Role: Unassigned  
Model: Codex (GPT-5)

## Task

Find the concrete defect behind the perceived "checkworthiness detection is slow in the claim-selection dialog" behavior, rather than stopping at the generic observation that Stage 1 is expensive.

## Verdict

The primary real issue is **URL fragment loss plus naive whole-article extraction for FAQ pages**.

For the live Grander draft, the user-provided URL targeted a single FAQ subsection via a `#fragment`, but the pipeline expanded it into the **entire FAQ article**, including duplicated question headings. That inflated the Stage 1 input, candidate-claim count, and contract-validation workload before recommendation ever started.

## Evidence

### 1. Fragment-scoped URLs are not scoped during analysis input resolution

- `resolveAnalysisText(...)` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` simply calls `extractTextFromUrl(inputValue, ...)` and then sets `analysisText = fetched.text`.
- `extractTextFromUrl(...)` in `apps/web/src/lib/retrieval.ts` fetches the raw URL and extracts HTML text, but it has **no fragment-aware post-processing path**.

### 2. HTTP fetch does not preserve the browser fragment

Verified live with the Grander URL:

- Input URL:
  `https://www.grandervertrieb.ch/ch/informationen-faqs-service/faqs-fragen-kritik/funktion-wirkung#welche-auswirkungen-hat-die-strukturveraenderung-in-einem-grander-belebten-wasser`
- `fetch(...)` returned final URL:
  `https://www.grandervertrieb.ch/ch/informationen-faqs-service/faqs-fragen-kritik/funktion-wirkung`
- Therefore the server always returns the full page; without explicit DOM scoping, the anchor is semantically lost.

### 3. The HTML extractor takes the whole `<article>` text and preserves duplicate FAQ headings

Using the same selector logic as `extractTextFromHtml(...)`:

- selected container: `article`
- extracted text length: `7364`
- `"Wie funktioniert die GRANDER®-Wasserbelebung?"` appears `2` times
- `"Welche Auswirkungen hat die Strukturveränderung in einem GRANDER® belebten Wasser?"` appears `2` times

The first 1200 characters of the extracted text begin:

`Wie funktioniert ...? Wie funktioniert ...? ... Zu welchen Veränderungen ...? Zu welchen Veränderungen ...? ...`

So the duplication visible in `resolvedInputText` is not a later pipeline bug; it comes directly from the current HTML extraction strategy.

### 4. The fragment-targeted accordion section is much smaller than the extracted whole article

On the same page:

- whole extracted article text: `7383` chars
- target fragment's accordion group text: `1332` chars
- reduction ratio: `0.18`
- whole article question marks: `22`
- target section question marks: `2`

So the current pipeline feeds roughly **5.5x more text** than needed for this anchored input, and much of that text is unrelated to the user-targeted subsection.

### 5. The inflated input translated into the observed slow/failing Stage 1 draft

For draft `6f18f926e2a2443f96afa097429ec146`:

- `preparedStage1.resolvedInputText.Length = 7364`
- `preparedStage1.preparedUnderstanding.atomicClaims.Count = 20`
- `observability.stage1Ms = 330004`
- failure mode:
  `revalidation_unavailable: final accepted claim set changed after Gate 1, but the contract re-validation LLM call returned no usable result.`

Recommendation never started. The user-visible "checkworthiness" delay was therefore mostly spent on a Stage 1 input that had already been expanded far beyond the intended subsection.

## Interpretation

This is not just "Stage 1 is slow."

It is a concrete preprocessing defect:

1. The UI accepts a fragment-scoped URL that semantically points to one subsection.
2. The retrieval layer drops that scope because fragments are not sent over HTTP.
3. The HTML extractor then takes the full article text with duplicate FAQ headings.
4. Stage 1 extracts many more claims than the anchored input warrants.
5. Contract revalidation becomes slower and more failure-prone.
6. The claim-selection dialog looks slow even though recommendation is not the bottleneck.

## Best Fix Direction

### P1

Add **fragment-aware HTML scoping** in `extractTextFromUrl(...)` / `resolveAnalysisText(...)` for `inputType="url"` when `new URL(inputValue).hash` is present.

For accordion / FAQ pages, the first attempt should:

- locate the DOM node matching the fragment id or named anchor
- prefer the closest semantically bounded container (for example the matching accordion group / section)
- extract text from that bounded container instead of the entire article

### P1

Add **light duplication suppression** for obvious repeated heading patterns inside extracted HTML text, especially accordion pages where the clickable heading and content heading both serialize into text.

### P2

Keep the current draft observability improvements, but split final contract revalidation timing explicitly so long late-Stage-1 failures remain visible even after the fragment bug is fixed.

## Risks

- Fragment ids are site-specific; the fix must stay generic and DOM-structural, not hardcoded to Grander.
- Scoping too narrowly could clip context on pages where the fragment points to a tiny heading and the relevant content is a sibling block; container selection needs fallback rules.
- Some sites use JS-driven accordion markup where the fragment target is an anchor preceding the real content node, so nearest-container logic must be conservative and observable.

## Validation Performed

- Live fetch proof that the fragment is absent from the returned URL
- DOM extraction using the same selector pattern as `extractTextFromHtml(...)`
- Fragment-section vs whole-article size comparison on the live page
- Draft-state inspection for the affected ACS draft

## Warnings

- No product code was changed in this diagnosis pass.
- No automated tests were run in this diagnosis pass.
- The root cause was established on a real live input, but the fix still needs implementation plus one fresh anchored-URL draft rerun.

## For Next Agent

- Implement generic fragment-aware bounded extraction for HTML URL inputs.
- Re-run the same Grander anchored URL through ACS draft preparation.
- Acceptance target: materially smaller `resolvedInputText`, materially fewer candidate claims, and recommendation reached unless another independent Stage 1 defect remains.
