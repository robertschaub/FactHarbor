# FactHarbor known issues

The application remains an invite-gated Alpha. These are retained limitations and decisions from the August/September 2026 reviews, not a new production audit. [Backlog](Backlog.md) carries current priorities and holds. An existing gap does not mean a remedy is authorized or queued.

## Analysis and configuration

- Input phrasing and language can affect results. Cross-language divergence is open; no working test currently measures the approved question/statement neutrality requirement. See [multilingual handling](../ARCHITECTURE/Multilingual_Language_Handling.md) and `NEUTRALITY-PAIRS`.
- Evidence attribution, entity identity, decomposition and report grounding have open defects or validation gaps (`EV-TARGET`, `SR-IDENTITY`, `DECOMP-RULES`, `GROUND-REJ`). Scores and fluent explanations do not establish that an attribution is correct.
- Model and prompt changes are not automatically deployed or activated. Verify per-job provenance and active configuration before comparisons (`F2-PROD`, `PROD-PINS`).
- `allowModelKnowledge` was verified inert in the August review: an editable/provenance field does not itself establish runtime enforcement. Grounding has separate citation controls. Removal or implementation needs a separate decision.
- Budget defaults have not undergone a systematic quality/cost sweep. No general near-optimality or savings claim follows from isolated measurements.
- Source-reliability identity, in-memory cache validity and EQA eligibility remain open; the entity-null correction and local cancellation checks do not close them.

- The default disables Anthropic prompt caching (`anthropicPromptCachingEnabled: false`). Do not enable it based only on generic savings claims; use an authorized, source-backed comparison.
- The Q-HF6 review proxy currently uses successful job status as a publication assumption. Check persisted publishability when interpreting a retained low-confidence verdict; correcting the proxy requires a separate reviewed quality-contract change.

## Data, resilience and observability

- Claim verdict caching and a normalized cross-analysis claim/evidence database are not implemented. Result caching remains deliberately off during Alpha; changing that alters comparison conditions.
- There is no general cross-provider failover. Narrow recovery paths do not guarantee analysis completion during an outage.
- Per-job metrics and aggregate endpoints exist, but external liveness/error alerting is deferred (`OPS-MONITOR`) and the telemetry admin UI remains open (`TELEM-UI`).
- API test coverage does not yet cover all authentication, invite quota, rate-limiting and runner behavior. Frontend/E2E coverage is also incomplete.
- The unused claim-highlighter component and inconsistent prompt-governance surfaces remain cleanup/design questions. Closed historical features must not be treated as available implementations.

## Security concerns

The following review dates and accepted decisions remain material. Reassess them before wider access; this document does not assert unchanged production configuration.

### S1. SSRF protection

The August 2026 review found scheme/address/redirect checks and response-size limits in `apps/web/src/lib/retrieval.ts`, with a residual DNS-rebinding concern on discovered links. Do not describe protection as complete without checking the current connection path.

### S2. Admin endpoint security

Administrative API operations use shared-key controls and the web admin area has a login gate. The `/admin/source-reliability` page has a documented read-only exemption, tracked as `SEC-ADMIN-SR`. A page being under `/admin` does not prove every read is authenticated.

### S3. Rate limiting

The API has a fixed-window per-IP limiter and admin-key bypass; invite codes also carry job caps. These controls are not end-user accounts or a comprehensive abuse-prevention system. See current `apps/api/Program.cs` for configured limits.

### S4. Invite-code lockout

Failed invite attempts are not tracked for lockout. The maintainer declined lockout work on 10 August 2026 and accepted the cost-amplification risk with rate limiting and provider-side spend limits/alerts as the chosen controls. The gap remains real. Reopen on evidence of probing or before open signup; do not silently remove the decision or claim lockout exists.

## Operational follow-up

Monitoring remains deferred in favor of manual checks under the 10 August 2026 decision. Changed traffic, a paid pilot or a concrete incident warrants a fresh assessment. Wider rollout also requires the [privacy policy's](../site/privacy-policy.md) gates. Never recover a startup problem by deleting a database without explicit authority and a verified backup.

Use [Current status](Current_Status.md), [Backlog](Backlog.md) and root [AGENTS.md](../../AGENTS.md) before implementing a remedy. Changes to analysis, permissions, deployed services or paid validation require their applicable review and action scope.
