<a id="factharbor"></a>
<a id="our-vision-and-mission"></a>
<a id="why-factharbor-exists"></a>

# FactHarbor application

FactHarbor is an open-source Alpha application for checking factual claims and articles. It brings sources, supporting and opposing evidence, reasoning and uncertainty together so people can inspect an assessment and form their own judgment.

The **FactHarbor association**, a Swiss non-profit, is the organization behind the work. Its aim is to help people make well-grounded decisions and use technology responsibly.

<a id="factharbor-now-and-next"></a>

## FactHarbor application’s next chapter

[**FactHarborDSS**](https://robertschaub.github.io/FactHarborDSS/) is the planned successor application, extending fact-checking to decision support.

<a id="what-we-do-for-you"></a>
<a id="from-claim-to-conclusion-reasoning-you-can-trust-because-you-can-inspect"></a>

<a id="read-a-report"></a>

## Read a FactHarbor report

<div class="fh-explore" markdown="1">

[Open FactHarbor application](https://app.factharbor.ch/) to explore reports. FactHarbor is an Alpha; access to new analyses is by invitation.

</div>

<a id="read-the-result"></a>

[Learn how to interpret a FactHarbor report](product-development/specification/architecture/quality-and-trust/index.md).

In the presentation example below, the first entry in the reports list is labelled **Mixed**, with **Medium confidence**. It concerns generative AI and the preparation needed for small-business automation. These are the Alpha report's assessments, not independently validated conclusions or DSS output.

[![FactHarbor Alpha reports list, captured on 24 October 2026](assets/images/alpha-result.jpg)](assets/images/alpha-result.jpg)

*Reports list captured 24 October 2026. Open the image for a larger view.*

### Inspect the evidence

The evidence matrix separates parts of the broader claim and groups evidence within assessment boundaries. Follow an item to its source and ask: Does it support the point? Does it apply here? What contradicts the conclusion, and what is missing?

[![Evidence matrix from the selected Alpha report, with separate subclaims and evidence counts](assets/images/alpha-evidence.png)](assets/images/alpha-evidence.png)

*From the same example. Colours summarize the report's assessments; counts are evidence items, not votes or measures of evidence quality. Both screenshots are reproduced unchanged from the project presentation of 26 October 2026. Attribution: FactHarbor and its contributors.*

[Open the selected Alpha report](https://app.factharbor.ch/jobs/812e3d1c1c5d423ba27b4bb18dee2ff9). Availability and access depend on the application; these dated images illustrate the interface at that time.

<a id="where-factharbor-stands-out"></a>
<a id="where-the-application-stands-out"></a>
<a id="how-it-works-the-core-concepts"></a>
<a id="the-lifecycle-from-input-to-verdict"></a>

## How it works

The application identifies factual claims, researches supporting and opposing evidence, and assesses the findings. A structured agent debate challenges the assessment before reconciliation and validation; model roles depend on the active configuration. Evidence-backed challenges can change a conclusion; agreement alone does not establish correctness.

![FactHarbor application analysis: understand the claim, research evidence, assess and challenge findings, then produce a report](diagrams/homepage-method.svg)

[Full-size diagram](diagrams/homepage-method.svg) · [Analysis pipeline](akel-pipeline.md)

The Alpha can miss evidence or misread citations, and repeated runs can differ. Inspect the underlying sources and [quality limitations](product-development/specification/architecture/quality-and-trust/index.md), rather than relying on the headline verdict alone.

<a id="quick-start"></a>

## Explore further

- [Understanding a FactHarbor report](product-development/specification/architecture/quality-and-trust/index.md) — interpreting evidence, verdicts and uncertainty.
- [Product development](product-development/index.md) — architecture, setup and contribution guidance.
- [Association and governance](organisation/index.md) · [About and contact](about-factharbor/index.md).
- [Cooperation](product-development/presentations/index.md) — research, newsroom and funding discussions.
- [Licence and disclaimer](license-and-disclaimer/index.md).
