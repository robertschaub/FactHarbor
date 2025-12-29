# LLM Reporting Guide (FactHarbor POC1)

This repo supports two report modes for analyses:

- `structured` (default): uses the existing JSON → markdown renderer.
- `rich`: adds a second LLM pass that turns the JSON result into a structured, narrative report.

The rich mode is designed to produce more comprehensive summaries, but it will only be as good as the input + retrieval. Without external sources, it cannot reliably match the depth of a fully sourced report.

## Quick Setup

1) Configure your provider (OpenAI/Claude/Gemini/Mistral).
2) Add these settings to `apps/web/.env.local`:

```env
# Report generation
FH_REPORT_STYLE=rich
FH_ALLOW_MODEL_KNOWLEDGE=true
```

## Environment Variables

All variables are read by `apps/web/src/lib/analyzer.ts`.

### Report Mode

- `FH_REPORT_STYLE=structured` (default)
  - Uses the existing server-side renderer.
  - Fast and deterministic.
  - Limited structure.

- `FH_REPORT_STYLE=rich`
  - Uses a second LLM call to generate the report.
  - Produces headings, executive summary, and structured sections.
  - Output varies by provider and temperature.

### Model Knowledge Toggle

- `FH_ALLOW_MODEL_KNOWLEDGE=false` (default)
  - The report writer must stick to the input + structured JSON.
  - Reduces hallucination but can be thin if input is short.

- `FH_ALLOW_MODEL_KNOWLEDGE=true`
  - The report writer may add broader context.
  - Any such content must be labeled as "model knowledge".
  - Useful for richer reports when no retrieval layer exists.

## Provider Notes

Results vary by provider. The analysis phase is strict JSON extraction, while the report phase is free-form markdown.

- OpenAI: usually best balance for structure + clarity.
- Claude: strong narrative but needs strict grounding to avoid overreach.
- Mistral: can be terse or generic without strong evidence guidance.
- Gemini: often good structure but can be verbose.

If you see generic outputs, try:

- Using `FH_REPORT_STYLE=rich`
- Increasing input detail
- Reducing scenarios in the prompt
- Enabling `FH_ALLOW_MODEL_KNOWLEDGE=true` for richer summaries

## LLM Fallbacks

You can configure a fallback order if a provider call fails:

```env
FH_LLM_FALLBACKS=openai,anthropic,google,mistral
```

If unset, the system tries the selected provider then falls back to the others in a default order.

## Source Bundle (Retrieval Lite)

To improve report quality without full web search, you can provide a curated list of sources that the analyzer will fetch and include in the prompt.

1) Create a JSON file based on `apps/web/test-config/source-bundle.example.json`
2) Point the env var to it:

```env
FH_SOURCE_BUNDLE_PATH=apps/web/test-config/source-bundle.example.json
FH_SOURCE_BUNDLE_MAX_SOURCES=6
FH_SOURCE_BUNDLE_EXCERPT_CHARS=1200
```

Sources are fetched using the existing SSRF-hardened fetcher. The analyzer will cite excerpts from these sources when generating evidence.

Bundle fields:
- `url` (required)
- `title` (optional)
- `sourceType` (optional): e.g. `NewsOutlet`, `AcademicJournal`, `GovernmentAgency`, `NGO`, `ThinkTank`, `Court`, `InternationalOrg`
- `trackRecordScore` (optional, 0-100): general reliability hint per spec

## Web Search (SerpAPI or Google CSE)

Optional web search can auto-populate the source bundle when a SerpAPI key is present.

```env
FH_SEARCH_PROVIDER=auto
FH_SEARCH_ENABLED=true
FH_SEARCH_MAX_RESULTS=6
FH_SEARCH_DOMAIN_WHITELIST=who.int,cdc.gov,nih.gov,justice.gov,ec.europa.eu,oecd.org
SERPAPI_API_KEY=PASTE_YOUR_KEY_HERE
```

Notes:
- Search is skipped if `SERPAPI_API_KEY` is missing.
- Results are treated as neutral sources unless you also provide a curated source bundle.
- `auto` prefers Google CSE (if configured) then fills remaining slots with SerpAPI.

Google CSE alternative:

```env
FH_SEARCH_PROVIDER=google-cse
FH_SEARCH_ENABLED=true
FH_SEARCH_MAX_RESULTS=6
FH_SEARCH_DOMAIN_WHITELIST=who.int,cdc.gov,nih.gov,justice.gov,ec.europa.eu,oecd.org
GOOGLE_CSE_API_KEY=PASTE_YOUR_KEY_HERE
GOOGLE_CSE_ID=PASTE_YOUR_CSE_ID
```

## What Changed

Recent updates in `apps/web/src/lib/analyzer.ts`:

- Added `FH_REPORT_STYLE` and `FH_ALLOW_MODEL_KNOWLEDGE`.
- Added `renderReportWithLlm` to produce a structured markdown report via LLM.
- The structured JSON extraction is still used for storage and is unchanged.

## How to Tweak Output

Recommended levers:

1) **Input quality**: the model can only cite what it sees.
2) **Provider selection**: OpenAI and Claude tend to be stronger for structured reasoning.
3) **Rich report mode**: improves readability and structure.
4) **Allow model knowledge**: improves depth but risks hallucination.

If you want the long, fully sourced output style, you will need a retrieval step:

- Fetch multiple sources.
- Provide excerpts to the model.
- Require citations to those excerpts.

## Troubleshooting

- **Report is too short**: use `FH_REPORT_STYLE=rich` and/or add more input.
- **Hallucinations**: set `FH_ALLOW_MODEL_KNOWLEDGE=false`.
- **Overly cautious output**: reduce constraints or increase input context.

## Manual LLM Integration Test

The repo includes a manual integration test to compare providers and output styles:

- Config: `apps/web/test-config/llm-providers.json`
- Output: `apps/web/test-output/`
- Run: `npm run test:llm`

Set `"enabled": true` in the config to actually call providers.
