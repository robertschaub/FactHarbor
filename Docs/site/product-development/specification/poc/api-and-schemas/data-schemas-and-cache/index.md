# Data Schemas and Cache

## 4. Data Schemas

<span id="4-1-stage-1-output-claimextraction"></span>

### 4.1 Stage 1 Output: ClaimExtraction

```
{
 "job_id": "01J...ULID",
 "stage": "stage1_extraction",
 "article_metadata": {
 "title": "Article title",
 "source_url": "https://example.com/article",
 "extracted_text_length": 5234,
 "language": "en"
 },
 "claims": [
 {
 "claim_id": "C1",
 "claim_text": "Original claim text from article",
 "canonical_claim": "Normalized, deduplicated phrasing",
 "claim_hash": "sha256:abc123...",
 "is_central_to_thesis": true,
 "claim_type": "causal",
 "evaluability": "evaluable",
 "risk_tier": "B",
 "domain": "public_health"
 }
 ],
 "article_thesis": "Main argument detected",
 "cost": 0.003
}
```

------------------------------------------------------------------------

<span id="4-5-verdict-label-taxonomy"></span>

### 4.5 Verdict Label Taxonomy

FactHarbor uses **three distinct verdict taxonomies** depending on analysis level:

<span id="4-5-1-scenario-verdict-labels-stage-2"></span>

#### 4.5.1 Scenario Verdict Labels (Stage 2)

Used for individual scenario verdicts within a claim.

**Enum Values:**

-   Highly Likely - Probability 0.85-1.0, high confidence
-   Likely - Probability 0.65-0.84, moderate-high confidence
-   Unclear - Probability 0.35-0.64, or low confidence
-   Unlikely - Probability 0.16-0.34, moderate-high confidence
-   Highly Unlikely - Probability 0.0-0.15, high confidence
-   Unsubstantiated - Insufficient evidence to determine probability

<span id="4-5-2-claim-verdict-labels-rollup"></span>

#### 4.5.2 Claim Verdict Labels (Rollup)

Used when summarizing a claim across all scenarios.

**Enum Values:**

-   Supported - Majority of scenarios are Likely or Highly Likely
-   Refuted - Majority of scenarios are Unlikely or Highly Unlikely
-   Inconclusive - Mixed scenarios or majority Unclear/Unsubstantiated

**Mapping Logic:**

-   If ≥60% scenarios are (Highly Likely \| Likely) → Supported
-   If ≥60% scenarios are (Highly Unlikely \| Unlikely) → Refuted
-   Otherwise → Inconclusive

<span id="4-5-3-article-verdict-labels-stage-3"></span>

#### 4.5.3 Article Verdict Labels (Stage 3)

Used for holistic article-level assessment.

**Enum Values:**

-   WELL-SUPPORTED - Article thesis logically follows from supported claims
-   MISLEADING - Claims may be true but article commits logical fallacies
-   REFUTED - Central claims are refuted, invalidating thesis
-   UNCERTAIN - Insufficient evidence or highly mixed claim verdicts

**Note:** Article verdict considers **claim centrality** (central claims override supporting claims).

<span id="4-5-4-api-field-mapping"></span>

#### 4.5.4 API Field Mapping

| Level | API Field | Enum Name |
|----|----|----|
| Scenario | scenarios\[\].verdict.label | scenario_verdict_label |
| Claim | claims\[\].rollup_verdict (optional) | claim_verdict_label |
| Article | article_holistic_assessment.overall_verdict | article_verdict_label |

------------------------------------------------------------------------

## 5. Cache Architecture

<span id="5-1-redis-cache-design"></span>

### 5.1 Redis Cache Design

**Technology:** Redis 7.0+ (in-memory key-value store)

**Cache Key Schema:**

```
claim:v1norm1:{language}:{sha256(canonical_claim)}
```

**Example:**

```
Claim (English): "COVID vaccines are 95% effective"
Canonical: "covid vaccines are 95 percent effective"
Language: "en"
SHA256: abc123...def456
Key: claim:v1norm1:en:abc123...def456
```

**Rationale:** Prevents cross-language collisions and enables per-language cache analytics.

**Data Structure:**

```
SET claim:v1norm1:en:abc123...def456 '{...ClaimAnalysis JSON...}'
EXPIRE claim:v1norm1:en:abc123...def456 7776000 # 90 days
```

------------------------------------------------------------------------

<span id="5-1-1-canonical-claim-normalization-v1norm1"></span>

### 5.1.1 Canonical Claim Normalization (v1norm1)

The cache key depends on deterministic claim normalization. **All implementations MUST follow this algorithm exactly.**

**Normalization version:** `v1norm1`

**Algorithm (v1norm1):**

1.  Unicode normalize: NFD
2.  Lowercase
3.  Strip diacritics
4.  Normalize apostrophes: `'` and `'` → `'`
5.  Replace percent sign: `%` → ` percent`
6.  Collapse whitespace
7.  Remove punctuation **except apostrophes**
8.  Expand contractions (fixed list below)
9.  Remove remaining apostrophes
10. Collapse whitespace again

```
import re
import unicodedata

# Canonical claim normalization for deduplication.
# Version: v1norm1
#
# IMPORTANT:
# - Any change to these rules REQUIRES a new normalization version.
# - Cache keys MUST include the normalization version to avoid collisions.

CONTRACTIONS_V1NORM1 = {
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "cannot",
    "won't": "will not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "i'm": "i am",
    "we're": "we are",
    "they're": "they are",
    "you're": "you are",
    "i've": "i have",
    "we've": "we have",
    "they've": "they have",
    "you've": "you have",
    "i'll": "i will",
    "we'll": "we will",
    "they'll": "they will",
    "you'll": "you will",
}

def normalize_claim(text: str) -> str:
    if text is None:
        return ""

    # 1) Unicode normalization (NFD)
    text = unicodedata.normalize("NFD", text)

    # 2) Lowercase
    text = text.lower()

    # 3) Strip diacritics
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")

    # 4) Normalize apostrophes
    text = text.replace("\u2019", "'").replace("\u2018", "'")

    # 5) Normalize percent sign
    text = text.replace("%", " percent")

    # 6) Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()

    # 7) Remove punctuation except apostrophes
    text = re.sub(r"[^\w\s']", "", text)

    # 8) Expand contractions
    for k, v in CONTRACTIONS_V1NORM1.items():
        text = re.sub(rf"\b{re.escape(k)}\b", v, text)

    # 9) Remove remaining apostrophes (after contraction expansion)
    text = text.replace("'", "")

    # 10) Final whitespace normalization
    text = re.sub(r"\s+", " ", text).strip()

    return text
```

**Canonical claim hash input (normative):**

-   `claim_hash = sha256_hex_lower( "v1norm1|<language>|" + canonical_claim_text )`
-   Cache key: `claim:v1norm1:<language>:<claim_hash>`

**Normalization Examples:**

<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Input</th>
<th>Normalized Output</th>
</tr>
</thead>
<tbody>
<tr>
<td>"Biden won the 2020 election"</td>
<td><pre class="sourceCode"><code>biden won the 2020 election</code></pre></td>
</tr>
<tr>
<td>"Biden won the 2020 election!"</td>
<td><pre class="sourceCode"><code>biden won the 2020 election</code></pre></td>
</tr>
<tr>
<td>"Biden won the 2020 election"</td>
<td><pre class="sourceCode"><code>biden won the 2020 election</code></pre></td>
</tr>
<tr>
<td>"Biden didn't win the 2020 election"</td>
<td><pre class="sourceCode"><code>biden did not win the 2020 election</code></pre></td>
</tr>
<tr>
<td>"BIDEN WON THE 2020 ELECTION"</td>
<td><pre class="sourceCode"><code>biden won the 2020 election</code></pre></td>
</tr>
</tbody>
</table>

**Versioning:** Algorithm version is

```
v1norm1
```

. Changes to the algorithm require a new version identifier.

<span id="5-1-2-copyright-data-retention-policy"></span>

### 5.1.2 Copyright & Data Retention Policy

**Evidence Excerpt Storage:**

To comply with copyright law and fair use principles:

**What We Store:**

-   **Metadata only:** Title, author, publisher, URL, publication date
-   **Short excerpts:** Max 25 words per quote, max 3 quotes per evidence item
-   **Summaries:** AI-generated bullet points (not verbatim text)
-   **No full articles:** Never store complete article text beyond job processing

**Total per Cached Claim:**

-   Scenarios: 2 per claim
-   Evidence items: 6 per scenario (12 total)
-   Quotes: 3 per evidence × 25 words = 75 words per item
-   **Maximum stored verbatim text:** \~~900 words per claim (12 × 75)

**Retention:**

-   Cache TTL: 90 days
-   Job outputs: 24 hours (then archived or deleted)
-   No persistent full-text article storage

**Rationale:**

-   Short excerpts for citation = fair use
-   Summaries are transformative (not copyrightable)
-   Limited retention (90 days max)
-   No commercial republication of excerpts

**DMCA Compliance:**

-   Cache invalidation endpoint available for rights holders
-   Contact: dmca@factharbor.ch

------------------------------------------------------------------------

## Summary

This specification covers the data schemas and cache architecture for the POC1 API:

-   **Data Schemas**: Stage 1 output (ClaimExtraction), verdict label taxonomy (3-level: Scenario, Claim, Article), API field mapping
-   **Cache Architecture**: Redis cache design, canonical claim normalization (v1norm1), copyright & data retention policy

**Full specification sections:**

-   [Codegen Contract](../codegen-contract/index.md) — OpenAPI spec and locked enums
-   [Pipeline Architecture](../pipeline-architecture/index.md) — 3-stage pipeline and scoring algorithms
-   [LLM Abstraction Layer](../llm-abstraction-layer/index.md) — Provider abstraction and failover
-   [REST API Contract](../rest-api-contract/index.md) — Endpoints and response schemas

------------------------------------------------------------------------

**Navigation:** [API & Schemas](../index.md) \| Prev: [REST API Contract](../rest-api-contract/index.md)
