# FactHarbor AI and Search Provider Nonprofit Programs

**Date:** 2026-04-29  
**Purpose:** Central reference for nonprofit discounts, credits, and special-condition application paths relevant to FactHarbor's current AI, search, tooling, and infrastructure stack.

## Current FactHarbor Readiness

- **Organization:** FactHarbor
- **Legal form:** Swiss association under the Swiss Civil Code
- **Founded:** 2026-04-23
- **Commercial Register filing submitted:** 2026-04-27
- **Commercial Register entry letter received:** 2026-04-29
- **UID / Firmennummer:** `CHE-448.446.098`
- **Registry visibility note:** public `SHAB` / `Zefix` visibility may still be propagating
- **Primary support document:** `Docs/Legal/Handelsregister_Eintrag_FactHarbor_2026-04-29.pdf`
- **Organisation email:** `info@factharbor.ch`

## Important Distinction

Not every nonprofit program reduces FactHarbor's runtime costs.

- **Directly relevant for runtime or infrastructure:** API credits, search credits, cloud credits
- **Indirectly relevant:** Chat/team subscriptions, IDE discounts, organization tooling

## Recommended Priority Queue

### Apply now

1. `Anthropic / Claude for Nonprofits`
2. `OpenAI for Nonprofits`
3. `OpenAI Researcher Access Program` if the project fits the research criteria
4. `Google for Nonprofits`
5. `GitHub for Nonprofits`
6. `Serper` and `SerpApi` manual outreach for public-interest pricing

### Apply once bank / broader compliance base is stronger

1. `Microsoft for Nonprofits`
2. `AWS nonprofit credit programs`
3. `TechSoup`, `Candid`, `NGOsource` where relevant

## Provider Matrix

| Provider / Tool | Relevant for FactHarbor | Public offer / current finding | Runtime impact | Official links | Current recommendation |
|---|---|---|---|---|---|
| `Anthropic / Claude` | Primary LLM provider in runtime; also team workspace | `Claude for Nonprofits` for Team / Enterprise | Mostly indirect for app runtime; useful for org tooling | [Claude for Nonprofits](https://claude.com/solutions/nonprofits), [Getting started](https://support.claude.com/en/articles/12893767-getting-started-with-claude-for-nonprofits) | Apply now |
| `OpenAI / ChatGPT` | Secondary / challenger provider; team workspace | `OpenAI for Nonprofits` for ChatGPT Business / Enterprise | Indirect for runtime; useful for organization seats | [OpenAI for Nonprofits](https://help.openai.com/en/articles/9359041-openai-for-nonprofits), [ChatGPT Business sign-up](https://help.openai.com/en/articles/8980713-sign-up-for-chatgpt-business), [Sales](https://openai.com/contact-sales) | Apply now |
| `OpenAI API` | Relevant runtime provider | No general nonprofit API discount publicly documented | Direct if credits are granted | [Researcher Access Program](https://grants.openai.com/prog/openai_researcher_access_program/) | Apply if research framing fits |
| `Google / Gemini / Workspace` | Optional runtime provider; workspace and platform tooling | `Google for Nonprofits`; Switzerland eligibility explicitly covers Swiss associations | Mostly indirect for runtime, but useful for workspace, grants, and ecosystem credibility | [CH eligibility](https://support.google.com/nonprofits/answer/3215869?co=GENIE.CountryCode%3DCH&hl=en), [Get started](https://support.google.com/nonprofits/answer/3367631?hl=en), [Workspace for Nonprofits](https://support.google.com/nonprofits/answer/3367223?hl=en) | Apply now |
| `GitHub` | Core organization tooling | `GitHub for Nonprofits`: free Team or 25% off Enterprise Cloud | Indirect | [GitHub for Nonprofits](https://github.com/solutions/industry/nonprofits), [Quickstart](https://docs.github.com/en/nonprofit/quickstart) | Apply now |
| `GitHub Copilot` | Developer tooling only | No public nonprofit discount currently documented | None for app runtime | [Nonprofit FAQ](https://docs.github.com/en/nonprofit/troubleshooting/frequently-asked-questions), [Copilot org pricing](https://docs.github.com/en/copilot/concepts/billing/organizations-and-enterprises) | Do not expect discount |
| `Microsoft / Azure` | Broader cloud / productivity option | Microsoft publishes nonprofit eligibility and nonprofit offers | Potentially useful for infrastructure via credits and discounted cloud/services | [Eligibility](https://learn.microsoft.com/en-us/industry/nonprofit/microsoft-for-nonprofits/eligibility), [Offers](https://learn.microsoft.com/en-us/industry/nonprofit/microsoft-for-nonprofits/nonprofit-offerings-products) | Review after core registrations stabilize |
| `AWS` | Broader cloud / infrastructure option | AWS nonprofit credit programs exist via official nonprofit tracks / partner paths | Potentially useful for infrastructure credits | [Programs](https://aws.amazon.com/government-education/nonprofits/programs/), [Nonprofit Credit Program](https://aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/) | Review after core registrations stabilize |
| `Mistral` | Supported optional runtime provider | No public nonprofit program found | Direct only through ordinary pricing / free or negotiated paths | [Pricing](https://mistral.ai/pricing), [Subscriptions](https://docs.mistral.ai/admin/user-management-finops/subscriptions) | Monitor only |
| `Cursor` | Editor tooling | No public nonprofit program found | None for app runtime | [Pricing](https://cursor.com/pricing/), [Students](https://cursor.com/en-US/students), [Teams setup](https://docs.cursor.com/en/account/teams/setup) | No nonprofit assumption |
| `Cline` | Editor / BYOK tooling | No public nonprofit program found | Only indirect via discounted BYOK providers | [Getting started](https://docs.cline.bot/getting-started), [Authorization](https://docs.cline.bot/getting-started/authorizing-with-cline), [Team management](https://docs.cline.bot/enterprise-solutions/team-management/managing-members) | No nonprofit assumption |
| `Serper` | Active search provider option in FactHarbor stack | No public nonprofit program found; `2,500 free queries` publicly visible | Direct, but mainly via free tier or manual outreach | [Serper](https://serper.dev/) | Use free tier + manual outreach |
| `SerpApi` | Active search provider option in FactHarbor stack | No public nonprofit program found; `250` free searches and enterprise sales path publicly visible | Direct, but mainly via free tier or manual outreach | [Pricing](https://serpapi.com/pricing), [Free signup](https://serpapi.com/users/sign_up?plan=free), [Enterprise](https://serpapi.com/enterprise), [FAQ](https://serpapi.com/faq) | Use free tier + manual outreach |
| `Brave Search API` | Supported search provider option | No public nonprofit program found; public page advertises `$5` free monthly credits | Direct, small | [Brave Search API](https://brave.com/search/api/) | Use free tier if needed |

## Current Repo-Relevant Reality

Based on `apps/web/.env.example`, runtime configuration, and resolver code, the providers that matter most to FactHarbor today are:

- `Anthropic`
- `OpenAI`
- `Google / Gemini`
- `Mistral`
- `Serper`
- `SerpApi`
- `Brave`

That means the first application effort should focus on programs that either:

- reduce spend on `Anthropic`, `OpenAI`, or `Google` ecosystem usage, or
- reduce search costs for `Serper`, `SerpApi`, or `Brave`

## Manual Outreach Cases

- `Serper` and `SerpApi` currently require manual special-condition outreach if FactHarbor wants nonprofit or public-interest concessions beyond their normal free tiers.
- The ready-to-send templates are in:
  - `Docs/Legal/Search_API_Nonprofit_Outreach_2026-04-29.md`

## Operational Notes

- `Goodstack` is an important verification path for some nonprofit software/provider programs, especially `Anthropic` and `OpenAI`.
- If public registry visibility is still pending, manual document upload may be needed instead of automatic registry matching.
- The most useful support PDF at this stage is the Commercial Register entry letter with UID.

## Source Notes

All provider findings above were checked against official provider pages used in the FactHarbor documentation and outreach work on `2026-04-29`. Public pricing, eligibility rules, and nonprofit-program scope can change, so recheck before submitting high-stakes applications.
