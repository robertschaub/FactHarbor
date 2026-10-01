# Governance

## 1. Our Philosophy

At FactHarbor, we prioritize systems that scale and results that are auditable.

-   **Automation First**: We minimize manual, subjective processes.
-   **Radical Transparency**: Our decision-making is open by default.
-   **Decisive Community**: We listen to input, but we decide with clarity.
-   **Data-Driven**: Every system change is backed by measured outcomes.
-   **Adaptive**: Our structure evolves to meet new challenges.

## 2. Organisational Structure

We follow a **Flat Cooperative Model** that promotes collaborative teamwork over hierarchy.

# Governance Structure

![Governance Structure diagram 1](../../diagrams/diagram-2f6b502a73c6a990.svg)

[Full-size diagram](../../diagrams/diagram-2f6b502a73c6a990.svg) · [Mermaid source](../../diagrams/diagram-2f6b502a73c6a990.mmd)

## Structure Summary

-   **General Assembly (Members)**: The supreme body; elects the Board and may appoint an Auditor.
-   **Governing Team (Board)**: Strategic oversight, policy setting, and appointments.
-   **Auditor (Optional)**: Provides independent financial oversight. Not mandatory by Swiss law for associations of FactHarbor's current size.
-   **Governance Steward**: Safeguards neutrality and fairness of all processes.
-   **Domain Leads**: Operational execution leads for R&D, Operations, Community, and Finance.
-   **Team & Community**: The collective operational workforce managed by Domain Leads. Individuals in the following roles are members of this group:
    -   **Developers / Core Ops**: Build and maintain the Application & Services and the technical infrastructure.
    -   **UCM Administrators**: Manage system configuration and prompt architecture within the Application & Services.
    -   **Moderators**: Handle system-flagged content escalations and system gaming.
-   **Application & Services**: The technical platform consisting of the core reasoning logic (AKEL), infrastructure, and the Unified Config Management (UCM) system. It generates the analytical reports.
-   **Reports (Claims & Evidence)**: The primary output of the system, consisting of claim decompositions, evidence items, and truth assessments.
-   **Readers & Users**: Interact with the platform while remaining subject to community guidelines and automated moderation.

**General Assembly** (All Members) → **Governing Team** → **Domain Leads**

-   **General Assembly**: Meets annually to elect the Governing Team, approve statutes, major strategy, and the budget.
-   **Governing Team**: Meets quarterly to set policy, allocate budget, and make strategic decisions.
-   **Domain Leads**: Small, specialized roles focused on R&D, Operations, Community, and Finance.

## 3. Decision Authority

Authority is distributed based on the scope and impact of the decision.

-   **Strategic**: General Assembly (2/3 majority required).
-   **Tactical**: Governing Team (Simple majority required).
-   **Operational**: Domain Leads (Autonomous within their domains).
-   **Emergency**: Immediate action allowed by any team member, followed by Governing Team ratification.

## 4. Policy & Finance

**Developing Policies (The RFC Process)**: Anyone can draft a proposal (RFC). We discuss it as a community, the Governing Team reviews and votes, and the result is published openly.

**Financial Integrity**:

-   **Budgeting**: An annual budget is approved by the General Assembly.
-   **Safeguards**: Two-signature requirement for amounts over CHF 5,000.
-   **Oversight**: Quarterly reports and an annual independent audit ensure full transparency.

## 5. Automation Governance

FactHarbor is built on the principle of **systemic integrity**. Instead of manually reviewing every claim, we focus on building a robust, automated system that produces reliable results at scale.

<span id="5-1-the-decision-boundary"></span>

### 5.1 The Decision Boundary

To maintain objectivity and scalability, we maintain a clear boundary between automated analysis and human oversight. **Core Principle**: The AI layer (AKEL) evaluates the **content**, while humans manage the **system** (algorithms, policies, and strategy).

**What the System Decides (Automated)**:

-   **Verdicts**: Truth assessments and confidence scores.
-   **Evidence**: Selection, relevance, and quality scoring.
-   **Sources**: Track record and reliability calibration.
-   **Risk Levels**: Classification of claims into safety tiers.
-   **Boundaries**: Grouping evidence and extracting complex narratives from raw data.

**What Humans Decide**:

-   **Mission & Values**: Defining the core purpose of the project.
-   **Risk Policies**: Setting the boundaries for safety and sensitivity.
-   **Architecture**: Major shifts in how the system works.
-   **Tuning**: Adjusting algorithm parameter ranges within policy.

<span id="5-2-principle-fix-the-system-not-the-data"></span>

### 5.2 Principle: Fix the System, Not the Data

When the system produces a questionable result, we do not manually "fix" that specific verdict. Instead, we use it as a signal to improve the entire system.

-   **Don't**: Manually override a single verdict or source score.
-   **Do**: Investigate if the issue is systematic and refine the underlying algorithm.

<span id="5-3-human-intervention-criteria"></span>

### 5.3 Human Intervention Criteria

Manual intervention is only permitted for operational integrity, never for content preference.

-   **Yes**: System metrics show performance degradation or legal/safety issues.
-   **Yes**: The system explicitly flags an item for human review.
-   **No**: Disagreement with a specific verdict or "manual quality gates."

<span id="5-4-consent-based-decision-making"></span>

### 5.4 Consent-Based Decision Making

For system and policy changes, we use **Consent** rather than Consensus (based on <a href="https://sociocracy30.org/" rel="noopener" target="_blank">Sociocracy 3.0</a>). **Consent** means there are no principled objections. It is faster than consensus and maintains high velocity while ensuring everyone can "live with" the decision.

------------------------------------------------------------------------

## 6. Transparency & Accountability

FactHarbor is committed to building public trust through openness.

-   **Public Information**: All policies, board memberships, financials, and quality metrics are public.
-   **Audit Trail**: All meetings, decisions, and system actions are documented and retained.

## 7. Conflict Resolution & Moderation

-   **User Disputes**: Handled by moderators, with a right of appeal to the Governing Team.
-   **Internal Conflicts**: Resolved through direct discussion, or external mediation if necessary.
-   **Moderation Oversight**: Moderators must have a high reputation and their actions are periodically reviewed.
