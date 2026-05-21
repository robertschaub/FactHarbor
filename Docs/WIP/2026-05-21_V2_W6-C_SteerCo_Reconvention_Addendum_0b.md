# W6-C Steer-Co Reconvention Addendum: Axis 0a Failed, 0b Decision Required

**Date:** 2026-05-21
**Workstream:** W6-C Retrieval Quality (Direction A)
**Trigger:** Axis 0a canary (quota=6) hit the aggregate byte cap. The trio
raise alone is insufficient — the aggregate cap must also be raised (Axis 0b)
or an alternative path chosen.

## What Happened

Steer-Co consented to Axis 0a: raise the W3B fetch quota trio from 3 to 6,
projected to stay within the existing 4096-byte aggregate cap.

**The projection was wrong.** Canary `2b9bf214` (budget slot 7) with quota=6:

| Metric | Projected (0a package) | Actual |
|---|---|---|
| Source materials fetched | 6 | 6 |
| OpenAlex abstract size | ~2027 bytes (same as prior canary) | **3338 bytes** |
| Wikimedia summaries | ~1.2-1.6KB additional | 960+457+309+392+585 = 2703 bytes |
| Total aggregate (with separators) | ~4KB (near cap) | **6051 bytes** |
| Aggregate cap | 4096 | 4096 |
| Bounded text authorization | projected pass | **REJECTED: `blocked_pre_bounded_corpus_text_oversized`** |
| W6-C reached | projected yes | **no** |

**Why the projection failed:** The OpenAlex abstract for the same claim came
back at 3338 bytes vs 2027 in the prior canary — a 65% swing. OpenAlex abstracts
are reconstructed from inverted index data and vary by which work the search
returns for the same query. The prior canary's search happened to hit a shorter
abstract.

## Empirical Size Bounds

| Source type | Observed range | Hard ceiling |
|---|---|---|
| OpenAlex abstract | 2027-3338 bytes (2 samples) | 4096 bytes (per-record max at source material creation) |
| Wikimedia page summary | 309-960 bytes (5 samples) | 4096 bytes (same per-record max) |
| Theoretical 6-record aggregate | — | 24586 bytes (6 x 4096 + 5 x 2 separators) |
| Realistic worst case | 1 near-max OpenAlex + 5 large Wikimedia | ~9000 bytes |

## Options for Steer-Co

### Option 1: Raise aggregate cap (Axis 0b)

Change `EVIDENCE_CORPUS_BOUNDED_TEXT_AGGREGATE_MAX_BYTES` from 4096:

| Value | Ratio | Handles current canary | Handles realistic worst case | Risk |
|---|---|---|---|---|
| **8192** | 2x | yes (35% headroom) | borderline (~9000 exceeds) | may fail on claims with large OpenAlex + large Wikimedia |
| **12288** | 3x | yes (100% headroom) | yes (36% headroom) | comfortable for all realistic content mixes |
| **16384** | 4x | yes | yes (82% headroom) | generous; eliminates cap as practical concern for quota=6 |
| **24576** | 6x per-record | yes | yes | matches theoretical max; aggregate cap becomes redundant |

**Deputy recommendation: 12288.** It handles the realistic worst case with
headroom, doesn't eliminate the safety boundary entirely, and the downstream
extraction LLM can comfortably process 12KB of source text within its context
window.

**Code change:** Single constant edit in `bounded-text-authorization.ts:30`.
Same shape as the trio raise — numeric budget, no architectural work.

### Option 2: Reduce quota to fit cap (0a refinement)

Drop `EVIDENCE_CORPUS_BOUNDED_TEXT_FAN_IN_MAX_RECORDS` to 4 or 5 (keep trio
coupled). With 4 records, the first-per-attempt selection picks the 4 unique
provider-attempts (including OpenAlex), totaling ~3338 + ~960 + ~457 + ~309 =
~5068 bytes. Still exceeds 4096.

**Problem:** Even quota=4 exceeds the cap when OpenAlex is large. This option
only works if OpenAlex is excluded or small, which we can't control.

### Option 3: Pack-to-fit selection (0a refinement)

Change bounded text authorization to accept records up to the aggregate cap
instead of rejecting the whole batch. Records would be added in order until the
cap is reached; remaining records would be excluded.

**Trade-off:** Preserves the safety boundary and maximizes content within it.
But it's a larger code change (affects the sidecar loop and downstream
assumptions about record count consistency), and effectively caps content at
4096 bytes anyway — the same problem that triggered W6-C investigation.

### Option 4: Escalate to Captain

The OpenAlex 2027→3338 variability on the same claim is itself evidence that
summary-only providers can't reliably satisfy W6-C. The within-scope lever
space (timeout tuning + quota tuning) may be fundamentally insufficient.
Escalate for Axis 1 (full content dereference / provider expansion).

**Trade-off:** Skips the quota canary entirely. We don't learn whether 6KB of
content moves any material dimension — data that would inform the Axis 1 scope.

## Deputy Assessment

Option 1 at 12288 is the lowest-risk path to getting the data we need. The
canary with quota=6 already confirmed that the pipeline fetches and admits 6
records correctly — only the aggregate cap blocks W6-C. One constant change
unblocks it.

Option 4 (escalate) is premature: we haven't yet seen what 6KB of content does
to the dimension profile. That data point costs 1 job slot and directly informs
whether Axis 1 work is needed at all.

## Budget Status

| Category | Count |
|---|---|
| Used (informative) | 2 |
| Used (wasted: wrong variant) | 2 |
| Used (wasted: stale server) | 1 |
| Used (partial: aggregate cap block) | 1 |
| Used (wasted: stale server + aggregate cap) | 1 |
| Remaining | 13 |
| Total authorized | 20 |
