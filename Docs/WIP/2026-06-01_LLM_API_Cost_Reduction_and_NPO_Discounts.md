# LLM API Cost Reduction & NPO Discounts — Investigation + Proposal

**Status:** Investigation complete; proposal (no code/config changed)
**Created:** 2026-06-01
**Owner:** open
**Trigger:** Anthropic API spend ~$730 (last 30 days) / $1,432 (April 2026) judged too high. Find similar-quality, cheaper alternatives; pursue NPO discounts. RAG-grounded in code + primary web sources + the internal Finance analysis.

---

## 0. Reconciliation with the internal Finance analysis (read first)

A prior, rigorous analysis already exists in `C:\DEV\FactHarbor-internal\Operations\Finance\` (May 2026). This proposal is reconciled against it — it does **not** supersede it. Key files: `API Costs/API_Cost_Analysis_2026-05-08.md`, `Finanzierung/AI_And_Search_Provider_Nonprofit_Programs.md`, `Finanzierung/FactHarbor_AI_Kostenbloecke_ZHAW_Beschaffungswege_2026-05-09.md`.

**This investigation CONFIRMS:**
- **API bill = 100% pipeline, ~0% coding.** Their cost-by-key analysis shows both API keys are pipeline keys; Opus was Feb experimentation only ("not routed anywhere in production"). My OAuth proof (§2) adds the mechanism: coding runs on the Team subscription. Two independent angles, same conclusion.
- **Caching is net-negative — already measured on real data and already mitigated.** Their Jan–May exports: cache-read **0.3%** ($13.67) vs cache-write **22.1%** ($915.89). The targeted opt-out shipped (commit `4609e9b9`, verified present). → I **withdraw** my "re-measure caching" item; it's done.
- **Batch API −50% is a real medium-term lever** (their P7 / R6). Matches §5.

**This investigation CORRECTS my earlier draft:**
- **OpenAI API credits were overstated.** Their Goodstack-verified finding: *OpenAI for Nonprofits = ChatGPT Business seats only* (CHF 16.65/mo), **not** an API discount. The only API-credit path is **OpenAI Researcher Access (~$1,000/12mo), and only if a research framing fits.** The "$2,500 every-applicant" figure I cited is not corroborated by their research — treat as unverified/likely stale.
- **The academic research-credit anchor is invalid.** AI for Science ($20k), AWS/Azure/Google **research** credits are all **PAUSED** — the ZHAW academic partnership (Patrick Giedemann) was declined 2026-05-19/20. Do not anchor on these. (Matches the advisor's earlier caution.)
- **The #1 NPO-API path is Anthropic Sales direct pricing** (their P1): there is **no public self-serve nonprofit discount for the Claude API**. The realistic route is a direct request to `sales@anthropic.com` citing NPO status (UID `CHE-448.446.098`), the Jan–May exports, run-rate, and asking for nonprofit/social-impact API pricing or credits.

**This investigation ADDS (genuinely new vs. the May analysis):**
- **By-task cost split** (their analysis was by-model only): verdict ~33%, research ~35%, cluster ~14% — this tells you *which stages* to route (§3a).
- **The output-token lever is the biggest no-risk Claude saving and belongs at the top** — their own R1 ($90–180/mo): **output tokens are 53% of all Claude cost.** I had omitted this; now elevated (§5 Tier 0d).
- **June pricing refresh + provider quality-parity analysis** for the "similar quality, cheaper" half of your question (§4, §6) — the internal docs cover discounts, not quality-matched alternatives.
- **Open-action status:** their URGENT search fix (Serper→priority 1, ~$170/mo) — **APPLIED to main 2026-06-01** (commit `362a9312`, ported from `edeca59a`): `search.default.json` + `sr.default.json` + code defaults swapped (serper P1, Google CSE P2 / free-tier 100). Local `config.db` system-owned blobs auto-refreshed and verified live (serper=P1 for both search and SR lanes). ⚠️ **Production still pending — TWO conditions:** (a) production `config.db` active search blob must show `serper.priority=1` (code defaults only refresh **system-owned** blobs on server init; admin-owned prod blobs won't auto-update — re-seed or admin PUT), **and** (b) `SERPER_API_KEY` must be set + non-placeholder in the prod env, else provider selection (`hasCredentials`) silently falls back to Google CSE P2 and the bill doesn't move. Locally both are confirmed (blob live; key present, len 40). It dwarfs most Claude-side levers.

---

## 1. Executive summary

1. **The API bill is NOT agentic coding (verified for *now*).** As of June 2026, Claude Code *and* FactHarbor's own agent wrapper (`scripts/agents/invoke-claude.cjs`) run on the **NPO Team subscription (OAuth)**, not the API key — proven three independent ways (§2). ⚠️ This is present-tense proof: the **April $1,432 chart predates the Team plan** (active 2026-05-10; personal Max cancelled 05-11), so coding *could* have hit an API key in April — confirm by filtering the console by **date + API key**. The recurring spend is **the analysis product**: production pipeline + local dev runs + eval/diagnostic scripts. No coding leak today.
2. **The pipeline is already multi-provider, and the dollars are measured (§3).** Across 1,635 local jobs: **standard tier (Sonnet) = 52–64%**, **budget tier (Haiku) = 36–45%**, **premium (Opus) = <4%**. By task: **verdict ~33% · research ~35% · cluster ~14%**. The challenger role already runs on **OpenAI**. Two distinct targets: a *large, low-risk* one (budget extraction) and a *large, high-risk* one (Sonnet verdict).
3. **Quality-neutral levers that need no model swap** (§5, Tier 0), corrected against the internal analysis: **constrain output tokens** (output = 53% of Claude cost; internal R1, ~$90–180/mo, top priority), **Batch API −50%** for offline eval, **reduce self-consistency passes**, and pursue **Anthropic Sales direct nonprofit API pricing** (the only credible API discount — no self-serve one exists). *Prompt caching is already measured net-negative and mitigated; academic credits (AI-for-Science etc.) are paused with the ZHAW partnership.*
4. **Structural savings need calibration gating** (§5, Tier 1), but the priority is now measured, not guessed:
   - **Biggest *safe* win: budget extraction (research + understand, ~45% of spend) → Gemini 2.5 Flash (~85% cheaper).** Lower-judgment, structured tasks. If Flash passes audit, this alone is a large cut.
   - **Biggest *single* lever, but highest risk: verdict (~33% of spend) is standard-tier Sonnet.** Moving it is where the real dollars are *and* where neutrality/variance risk lives. You authorized "anything audit-proven" — so it's a candidate, but it must clear the hardest paired-job audit (`calibration/paired-job-audit.ts`). Cluster (~14%) is a medium-risk middle ground.
5. **Security note:** live OpenAI + Google API keys sit in plaintext in `.claude/settings.local.json` (gitignored, not pushed) and were surfaced in this session transcript — consider rotating (§7).

**Measured envelope (local jobs, 1,635):** last-30-day local LLM spend ≈ **$202** (computed) of the ~$730 dashboard → ~$528/30d is production + eval scripts. Routing budget→Flash (audit-gated) could cut ~35–40% of LLM spend at low quality risk; adding cluster + verdict (if audited) approaches ~60%. Credits (§5) can cover several months outright at current alpha volume. Production-side numbers still need the console split by key/date (§8).

---

## 2. Finding #1 — Claude Code / agents do NOT bill the API console

You weren't aware the Claude API key was used for agentic coding. **It isn't.** Evidence:

| Check | Result | Meaning |
|---|---|---|
| `~/.claude/.credentials.json` | `claudeAiOauth`, `subscriptionType: "team"`, scopes incl. `user:inference`, `user:sessions:claude_code` | Claude Code uses **subscription OAuth** (the $51.89/mo NPO Team plan), not the API |
| `ANTHROPIC_API_KEY` env (Process/User/Machine) | **not set** anywhere | Claude Code has no API key to bill against |
| `scripts/agents/invoke-claude.cjs` | spawns the `claude` CLI with `--model`, `--settings`, `--effort`; **injects no API key** | FactHarbor's multi-agent/steer-co wrapper also runs on subscription OAuth |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` (the default; harmless) | not a third-party proxy; `apiyi.com` in the allow-list was only ever WebFetch'd, never wired |

**Who actually uses `ANTHROPIC_API_KEY`:** only `apps/web/.env.local` (the pipeline) and standalone node scripts that load it (calibration runner, the recent verdict-stability batch harness, `scripts/diag/*`, compare-evidence-pools, etc.). The Opus **4.7 / 4.5 / 4.1** slices on your dashboard are **not** interactive coding — and they are **not** the local pipeline either (local Opus = <4%, §3). They are most likely **production verdict/premium runs and eval batches** that pin a different/older Opus than local (`metrics.ts:419-425` carries dated price entries for 4.7/4.5/4.1, implying jobs ran those versions). This makes the §3 "audit production config pins" check a likely quick win.

> Action: confirm by filtering platform.claude.com **by API key AND by date**. Expect ~$0 on coding for May–June (post-Team-plan); the **April** window predates the Team subscription and must be checked separately — if April shows API-key coding usage, that one-off is already gone now that Claude Code is on OAuth.

---

## 3. Finding #2 — Live pipeline model routing (RAG-grounded)

From the active `pipeline/default` config blob in `apps/web/config.db`:

```
llmProvider:          anthropic        llmTiering: true
modelUnderstand:      budget   (Haiku 4.5)
modelExtractEvidence: budget   (Haiku 4.5)
modelVerdict:         standard (Sonnet 4.6)   ← verdict is NOT on Opus
modelOpus:            premium  (Opus 4.6)     ← one high-stakes task only
debateRoles:
  advocate        anthropic / standard (Sonnet 4.6)
  challenger      OPENAI    / standard        ← already non-Claude
  reconciler      anthropic / standard (Sonnet 4.6)
  selfConsistency anthropic / standard (Sonnet 4.6)
  validation      anthropic / budget   (Haiku 4.5)
verdictBatchSize: 5
```

**Implications:**
- Cost is dominated by **standard-tier Sonnet 4.6** (advocate + reconciler + selfConsistency + verdict + clustering/aggregation) and **budget Haiku** (extraction). This matches the Sonnet-dominant dashboard.
- The pipeline **already mixes providers** (challenger=OpenAI). Per-role `{provider, strength}` routing is a **config change, not a rewrite** — the resolver (`model-resolver.ts`) and `getModelForTask` (`model-tiering.ts`) already support anthropic/openai/google/mistral.
- ⚠️ Code defaults only seed *new* DBs; the **production** `config.db` may pin different model versions (memory: `feedback_deploy_config_state`). Audit production role pins — if verdict/premium drifted onto **Opus 4.1 ($15/$75)** that's a 4× overspend vs 4.6 ($5/$25) and a quick win.

### 3a. Measured cost anatomy (1,635 local jobs, `AnalysisMetrics` table)

Aggregated from real `MetricsJson.llmCalls` (per-call model + token counts), priced with the `metrics.ts` table. **This is local dev-run data — production may weight Opus more (see §2).**

| | Last 30 days | All time |
|---|---|---|
| Jobs / LLM calls | 185 / 9,397 | 1,635 / 76,326 |
| Computed LLM cost | **$202** | $1,873 |
| **standard** tier (Sonnet) | **51.9%** | 64.0% |
| **budget** tier (Haiku) | **44.8%** | 35.7% |
| **premium** tier (Opus) | 3.3% | 0.4% |

**By task (last 30d):** research **34.8%** · verdict **33.0%** · cluster **13.6%** · understand **8.6%** · aggregate 2.4% · claim_selection 2.0%.
**By provider:** anthropic 97.4% / openai 2.6% (challenger).

Reading: the *single largest task is verdict (~33%, Sonnet, high-risk to move)*; the *largest low-risk pool is budget extraction (research+understand ≈ 43–44%, Haiku)*. Local 30-day spend ($202) is ~28% of the ~$730 dashboard, so **~$528/30d is production + standalone eval scripts** (calibration, verdict-stability batches) — the latter are ideal Batch-API targets (§5 0b).

---

## 4. Pricing reference (Anthropic primary source, June 2026)

Source: [platform.claude.com/docs/.../pricing](https://platform.claude.com/docs/en/about-claude/pricing). Per 1M tokens (input / output):

| Model | Standard | Batch (−50%) | Cache read (0.1×) |
|---|---|---|---|
| Haiku 4.5 | $1 / $5 | $0.50 / $2.50 | $0.10 |
| Sonnet 4.6 | $3 / $15 | $1.50 / $7.50 | $0.30 |
| Opus 4.6 / 4.7 | $5 / $25 | $2.50 / $12.50 | $0.50 |
| Opus 4.1 (older) | $15 / $75 | $7.50 / $37.50 | $1.50 |

Cheaper cross-provider options (per `metrics.ts` table + web): **Gemini 2.5 Flash $0.15/$0.60**, **Gemini 2.5 Pro $1.25/$10**, **GPT-5.4-mini $0.75/$4.50**, **GPT-5.1 $1.25/$10**, GPT-4.1-mini $0.40/$1.60, DeepSeek V3.2 ~$0.14/$0.28.

**Discount mechanics (official):** Batch = −50% both directions, async ≤24h. Caching: 5-min write 1.25×, 1-hr write 2×, **cache read 0.1×** → break-even after **one** reuse (5-min). **Batch and caching stack.** The pricing page explicitly states *"Academic and research discounts may be available"* and volume discounts via sales.

---

## 5. Cost levers, tiered by quality risk

### Tier 0 — Quality-neutral (do first; no model change)

**0a. NPO / API-credit paths** (reconciled with the internal NPO matrix — `AI_And_Search_Provider_Nonprofit_Programs.md`). **There is no public self-serve nonprofit discount for the Claude API**, so the realistic routes are:

| Path | What it actually gives | Status / action |
|---|---|---|
| **P1 — Anthropic Sales: direct nonprofit / custom API pricing** | The only credible *direct* API relief. Anthropic documents case-by-case volume + custom + possible academic/research discounts. | **Do this.** Email `sales@anthropic.com` with NPO status, UID `CHE-448.446.098`, Jan–May console exports, run-rate, asking specifically for nonprofit/social-impact API pricing or credits. |
| **AWS Nonprofit Credit Program** | up to **$5,000** AWS credit; Claude runs on **Bedrock** → identical-model offset | **Deferred** in their queue ("after bank/compliance base stronger"). Nonprofit-track (TechSoup), *not* academic — still viable; verify Swiss eligibility + that Bedrock-Claude is covered in-region before any migration. |
| **Microsoft for Nonprofits** | **$2,000/yr** Azure credits | Low fit for Claude (partner-model restrictions); deferred. |
| **OpenAI Researcher Access** | ~**$1,000/12mo** API credits | Apply **only if a research framing fits**. Note: *OpenAI for Nonprofits itself is ChatGPT-Business seats, NOT an API discount* — already active. |
| ~~AI for Science ($20k) / AWS·Azure·Google **research** credits~~ | API credits via an academic partner | **PAUSED** — ZHAW partnership declined 2026-05-19/20. Re-open only with a confirmed academic partner. |
| ~~Google / OpenAI "for Nonprofits" (seats)~~ | Gemini app / ChatGPT Business seats | Already held; **does not touch the API bill.** |

These are one-time/periodic offsets, not rate cuts. **The structural wins below (§0d output tokens, Tier 1 routing) matter more for the recurring bill than any credit program currently available.**

**0b. Batch API (−50%) for offline workloads.** The user-facing pipeline can't easily adopt Batch (24h SLA too slow; needs the Messages Batch API, not AI SDK `generateText`). But **calibration, verdict-stability batches, audits, and eval reruns are ideal** — non-urgent, high-volume, identical models. Route those through Batch for a clean 50% cut on the dev/eval slice of the bill.

**0c. Prompt caching — RESOLVED, not an open lever.** Measured net-negative on real Jan–May console exports (cache-read 0.3% vs cache-write 22.1%; the per-claim/per-source call pattern misses the 5-min TTL). Targeted opt-out for Stage 2 full-source extraction already shipped (`4609e9b9`, ~$35–40/mo). Remaining caching applies only where prompt structure genuinely repeats. No further action unless a new high-reuse call site appears.

**0d. Constrain output tokens — the single biggest no-risk Claude lever (internal R1).** **Output is 53% of all Claude cost** ($2,208 of $4,152 Jan–May) — output is 5× input. Add `max_tokens` caps + conciseness directives to Stage 2 extraction and Stage 4 verdict (structured JSON, minimal prose). Est. **$90–180/mo, low effort, no quality risk** (verify outputs stay schema-complete). This beats every credit program on certainty and recurs every month.

**0e. Reduce Stage-4 self-consistency passes (internal R5).** If 1 pass agrees with 2 passes >90% of the time, drop to 1. Est. $20–40/mo. Validate agreement rate first.

### Tier 1 — Structural, calibration-gated (you authorized "anything audit-proven")

Route high-volume tiers to cheaper providers, each gated on a paired-job audit (`apps/web/src/lib/calibration/paired-job-audit.ts`, `calibration/runner.ts`):

Priority by *measured* dollar share × risk (§3a):

| Task(s) | Share | Current | Candidate | Approx. saving | Risk |
|---|---|---|---|---|---|
| **research + understand** (extraction) | **~43%** | Haiku $1/$5 | **Gemini 2.5 Flash $0.15/$0.60** | ~85% in / ~88% out | **low** — structured, lower-judgment; watch multilingual. *Do first.* |
| **cluster** | **~14%** | Sonnet 4.6 $3/$15 | **Gemini 2.5 Pro $1.25/$10** / **GPT-5.4-mini $0.75/$4.50** | ~50–75% | medium |
| **verdict** | **~33%** | Sonnet 4.6 $3/$15 | same candidates | ~50–75% | **high** — largest single task *and* neutrality/variance-critical; hardest audit |
| premium (`modelOpus`) | <4% | Opus 4.6 $5/$25 | keep | n/a | not worth the risk at this share |

**The tension, stated plainly:** the safe lever (extraction→Flash) is genuinely large (~43%) *and* low-risk — do it first. But the single biggest task, **verdict (~33%), is also the riskiest to move** — that's where the dollars and the neutrality risk coincide. **Quality is the real cost**: a silent verdict-direction regression is worse than the bill (the entire project history is verdict-variance/neutrality). Precedent: challenger already runs on OpenAI in the **live config**, so mixed-provider debate works — but extend it task-by-task only on before/after paired audits over the benchmark set; keep temp=0 where it is.

### Tier 2 — Run existing Claude on a credit-bearing cloud
If AWS/Azure nonprofit credits land, run the **unchanged** Claude pipeline via **Bedrock/Vertex** (identical models, `model-resolver.ts` already supports it) and let the $5k/$2k credits absorb spend — zero quality risk, just plumbing + eligibility.

---

## 6. Quality parity (why Tier 1 must be gated)
Sonnet 4.6 leads Gemini 2.5 Pro overall on instruction-following, edge-case handling, and knowledge; Gemini wins on math/reasoning/multilingual and is far cheaper ([BenchLM](https://benchlm.ai/compare/claude-sonnet-4-6-vs-gemini-2-5-pro)). For extraction (structured, lower-judgment) Flash is likely fine; for verdict/debate (high-judgment, multilingual, neutrality-sensitive) parity is **not** assumed — prove it per task.

---

## 7. Security note (incidental finding)
`.claude/settings.local.json` contains **plaintext live `OPENAI_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY`**. The file is gitignored (`.gitignore:107`) and not pushed, so no repo leak — but the values were surfaced in this Claude Code session transcript. Recommend: (a) rotate both keys if this transcript may be shared/retained; (b) keep secrets only in `apps/web/.env.local` (already the pipeline's source, also gitignored) rather than duplicating into Claude settings.

---

## 8. Recommended sequence & what to measure
1. **Reduce output tokens (R1)** — biggest no-risk recurring saving (~$90–180/mo); output is ~50% of Claude cost. **Implementation draft in §9.** Measurement shows the lever is *schema/prompt conciseness* (esp. **cluster** — Sonnet, mean 9,650 out tok, unconsumed `congruenceDecisions`/`scopeToBoundaryMapping` rationales) + high-volume per-call trims (research, relevance), with `max_tokens` only as a runaway guard. Verify schema completeness / no new `report_damaged`.
2. ~~**Close the search fix (their URGENT open item)**~~ — **DONE on main 2026-06-01** (commit `362a9312`): Serper→priority 1, Google CSE→priority 2 + free-tier quota; applied to `search.default.json`, `sr.default.json`, and code defaults; local `config.db` verified live. **Remaining (production, two conditions):** (a) active search blob shows `serper.priority=1` (re-seed/admin-PUT if admin-owned) **and** (b) `SERPER_API_KEY` set + non-placeholder in prod env — both required or traffic silently falls back to Google CSE. Note: `dailyQuotaLimit` is declarative (not yet enforced) — the live levers are the priority swap + externally-disabled Google billing.
3. **Email Anthropic Sales** for direct nonprofit/social-impact API pricing or credits (the only credible API discount). Include NPO status, UID, Jan–May exports, run-rate.
4. **Calibration-gated routing, by measured priority**: **(a) research+understand → Gemini Flash** (~43% of spend, low risk) → **(b) cluster → Gemini Pro/GPT-mini** → **(c) verdict only if it clears the hardest audit**. Paired-job audit each (`paired-job-audit.ts`) before activating.
5. **Batch API −50% for eval/calibration/verdict-stability runs** (~$528/30d off-dashboard, async-safe) + **reduce self-consistency passes (R5)** if agreement rate allows.
6. **Audit production `config.db` pins + split console by key/date** — local Opus is <4% but the dashboard shows larger Opus slices; catch drift onto Opus 4.1 ($15/$75) or verdict-on-Opus, and confirm the April pre-Team-plan window.
7. **Defer NPO cloud credits** (AWS $5k Bedrock / Azure) until the compliance base is stronger; **academic research credits remain paused** pending a new academic partner. *Caching is already resolved — no action.*

**Open questions (user-held):** real pipeline-vs-eval token split (console filter); production config role/model pins; Swiss eligibility for AWS/Microsoft nonprofit programs.

---

## 9. Output-token reduction (item 1)

**Status (2026-06-01): conservative set IMPLEMENTED + verified.**
- **Code (live on build/deploy):** dropped unconsumed `congruenceDecisions[].rationale` + `scopeToBoundaryMapping[].rationale` (cluster) and `assessments[].reasoning` (applicability) from the Zod schemas — `Output.object` regenerates the JSON-schema constraint, so the model stops emitting them with no prompt re-seed needed. Added guard `maxOutputTokens`: research 16384, cluster 32768, relevance/applicability 8192 (verdict already 16384).
- **Prompts (`claimboundary.prompt.md` + reseeded local `config.db` → `2a476170`):** relevance `reasoning` ≤12 words; evidence `statement` ≤2 sentences; examples synced to the trimmed schemas; **BOUNDARY_CLUSTERING Rule changed to decision-only** (was "provide a congruence rationale for every decision").
- **Review (scoped code-review of the diff):** verdict = code SAFE TO COMMIT. Caught one real defect — the cluster Rule above still ordered a per-pair rationale, so the model would keep generating (then discarding) the O(N²) rationale text and **leak back the cluster saving**; fixed + re-seeded. All "unconsumed-field" claims independently confirmed; caps confirmed above p99; terminology clean.
- **Verified:** `tsc --noEmit` 0 errors; full safe suite **1,939 passed / 1 skipped / 0 failed** (contract + pipeline re-run after the prompt fix: 473 pass).
- ⚠️ **Production:** schema + cap cuts ship as code (live on deploy); the **prompt brevity directives need `npx tsx scripts/reseed-all-prompts.ts --prompts` on prod** (admin-owned blobs won't auto-refresh) — same re-seed caveat as the search fix.
- **Deferred (aggressive variant):** dropping the *entire* unconsumed `congruenceDecisions`/`scopeToBoundaryMapping` arrays (possible reasoning scaffold) remains behind a `paired-job-audit` gated on boundary-assignment stability + zero new `report_damaged`.

Output = ~50% of Claude cost but only ~17% of token volume (output billed 5×). Measured per-call output distribution (1,635 jobs):

| task | model | calls | p50 | p99 | max | mean | current cap |
|---|---|--:|--:|--:|--:|--:|--:|
| research (extract) | Haiku $5/M out | 50,708 | 1,066 | 4,281 | 64,000 | 1,215 | none |
| cluster | **Sonnet $15/M out** | 1,640 | 9,056 | 22,021 | 34,271 | **9,650** | none |
| verdict | Sonnet $15/M out | 12,804 | 1,515 | 7,092 | 16,384 | 2,036 | 16,384 |
| understand | Haiku $5/M out | 7,656 | 479 | 6,909 | 33,557 | 1,164 | none |

**Conclusion the data forces:** caps barely help research/verdict (means already ≪ any safe cap; the 64k research `max` is a lone runaway). The real savings are **schema/prompt conciseness**, concentrated in **cluster** (mean 9,650, 75% output, on Sonnet = 3× the per-token cost of research) and in **high-volume per-call trims** (research, relevance). Caps are a *runaway guard* against truncation→`report_damaged`, not the lever.

### A. Schema cuts — remove/shorten unconsumed or truncated free-text (biggest, safest)
Every change must update **both** the Zod schema **and** the prompt's "Output Schema" description (`claimboundary.prompt.md`) so the model isn't told to emit a field the contract drops.

| Field | Stage / model | Consumed? | Draft action | Why safe / risk |
|---|---|---|---|---|
| `congruenceDecisions[].rationale` | cluster / Sonnet | **No** (only schema def, lines 51–56) | **Drop `rationale`** (keep `scopeA/B`, `congruent`) | post-hoc (after decision); biggest single cut |
| `scopeToBoundaryMapping[].rationale` | cluster / Sonnet | **No** (only def, 46–50) | **Drop `rationale`** | same |
| `congruenceDecisions` + `scopeToBoundaryMapping` (whole arrays) | cluster / Sonnet | **No** | **Aggressive variant: drop both arrays.** Largest cut. | ⚠️ may be a reasoning scaffold → clustering-quality audit required |
| `relevantSources[].reasoning` | relevance / Haiku | **Yes but truncated to 80 chars** (`research-extraction-stage.ts:201`) | **Keep, instruct ≤12 words / ≤80 chars** | already discarded past 80 chars; high call volume |
| `assessments[].reasoning` | applicability / Haiku | unconfirmed | verify; if unconsumed, shorten/drop | low |
| `evidenceScope.*` strings (`methodology/temporal/geographic/boundaries`) | research / Haiku | Yes (`methodology` used downstream) | instruct concise phrases; **omit optional fields when undeterminable** instead of padding | core data — shorten, don't drop |

Keep untouched (consumed): `methodology`, `internalCoherence`, `statement`, direction/probative scores, `relevantClaimIds`.

### B. Prompt conciseness directives (extend the existing pattern)
The codebase already uses "Keep `rationale` to one sentence" (`claimboundary.prompt.md:159`). Extend to:
- **EXTRACT_EVIDENCE:** "No prose outside JSON fields. `evidenceScope` values: one short phrase each; omit a field rather than writing 'unspecified'."
- **BOUNDARY_CLUSTERING:** if rationale kept, "≤1 short clause"; emit `congruenceDecisions` only for **non-congruent or merged** pairs, never the full O(N²) matrix.
- **RELEVANCE_CLASSIFICATION:** "`reasoning`: ≤12 words."

### C. `max_tokens` guard caps (from p99 + headroom — guard, not trimmer)
Set on the `generateText` calls (only verdict has one today, at `verdict-generation-stage.ts:534`). Sized to clip only runaways:

| stage | cap | clips | rationale |
|---|--:|--:|---|
| extract_evidence (research) | 16,384 | 0.03% | p99 4,281; catches the 64k runaway |
| cluster | **32,768** | 0.06% | p99 22,021 — **do NOT go lower** (16k clips 10.6%, 8k clips 58% → truncation→`report_damaged`) |
| understand | 16,384 | 0.05% | p99 6,909 |
| verdict | keep 16,384 | 0% | p99 7,092 |
| relevance / applicability | 8,192 | ~0% | small outputs once reasoning is brief |

### D. Rollout & audit
1. Ship **B (prompt brevity)** + the **conservative A** (drop the two unconsumed cluster rationales; cap relevance reasoning) first — lowest risk; measure the delta on the next Anthropic export.
2. Add **C guard caps** (prevents runaway truncation; mild positive).
3. Trial the **aggressive A** (drop cluster arrays) behind a `paired-job-audit` gate — accept only if **boundary-assignment stability** and **internalCoherence** are unchanged vs baseline and **no new `report_damaged`**.
4. Every step verified for **schema completeness / zero new `report_damaged`** (the failure mode this lever can *cause* if done carelessly — `json.ts:219`).

**Expected:** cluster schema cut is the highest-value single change (Sonnet × 9,650 × 75% output × unconsumed); relevance/research brevity is volume-driven. Together they plausibly deliver the bulk of internal R1's $90–180/mo with no model-quality change — gated only by the cluster-quality audit for the aggressive variant.

---

## Sources
- [Anthropic pricing (primary)](https://platform.claude.com/docs/en/about-claude/pricing) · [AI for Science rules](https://www.anthropic.com/ai-for-science-program-rules) · [External Researcher Access](https://support.claude.com/en/articles/9125743-what-is-the-external-researcher-access-program)
- [OpenAI for Nonprofits (Goodstack)](https://goodstack.org/software-discounts/openai)
- [AWS Nonprofit Credit Program](https://aws.amazon.com/government-education/nonprofits/nonprofit-credit-program/)
- [Microsoft for Nonprofits — Azure grant](https://learn.microsoft.com/en-us/industry/nonprofit/microsoft-for-nonprofits/claim-activate-nonprofit-azure-grant)
- [Google for Nonprofits — Gemini (app, not API)](https://support.google.com/nonprofits/answer/13534766)
- [Sonnet 4.6 vs Gemini 2.5 Pro benchmark](https://benchlm.ai/compare/claude-sonnet-4-6-vs-gemini-2-5-pro)
- Code: `apps/web/config.db` (live pipeline config), `model-resolver.ts`, `model-tiering.ts`, `metrics.ts:415`, `calibration/paired-job-audit.ts`, `scripts/agents/invoke-claude.cjs`, `~/.claude/.credentials.json`
