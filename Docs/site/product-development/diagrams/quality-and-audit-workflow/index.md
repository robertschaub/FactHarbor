> **Info**
>
> **Current Implementation (v2.10.2)** - Only Gate 1 (Claim Validation) and Gate 4 (Verdict Confidence) are implemented. Gates 2-3 are planned for future.

# Quality Gates Flow

![Quality and Audit Workflow diagram 1](../../../diagrams/diagram-32c21962fcd7bc05.svg)

[Full-size diagram](../../../diagrams/diagram-32c21962fcd7bc05.svg) · [Mermaid source](../../../diagrams/diagram-32c21962fcd7bc05.mmd)

# Gate Details

## Gate 1: Claim Validation

**Purpose:** Ensure extracted claims are factual assertions that can be verified.

| Check | Purpose | Pass Criteria |
|----|----|----|
| Factuality Test | Can this claim be proven true/false? | Must be verifiable |
| Opinion Detection | Contains subjective language? | Opinion score 0.3 or less |
| Specificity Check | Contains concrete details? | Specificity score 0.3 or more |
| Future Prediction | About future events? | Must be about past/present |

## Gate 4: Verdict Confidence Assessment

**Purpose:** Only display verdicts with sufficient evidence and confidence.

| Tier | Evidence | Avg Quality | Agreement | Publishable? |
|----|----|----|----|----|
| **HIGH** | 3+ sources | 0.7 or more | 80% or more | Yes |
| **MEDIUM** | 2+ sources | 0.6 or more | 60% or more | Yes |
| **LOW** | 2+ sources | 0.5 or more | 40% or more | Needs review |
| **INSUFFICIENT** | Less than 2 sources | Any | Any | More research needed |

# Not Yet Implemented

**Gate 2: Contradiction Search** (planned) - Counter-evidence actively searched

**Gate 3: Uncertainty Quantification** (planned) - Data gaps identified and disclosed
