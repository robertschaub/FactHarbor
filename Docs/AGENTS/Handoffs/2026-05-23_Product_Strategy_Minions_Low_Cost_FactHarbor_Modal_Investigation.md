# 2026-05-23 - Product Strategy - Minions-Style Low-Cost FactHarbor / Modal Investigation

## Task

Investigate how FactHarbor could implement a low-cost Minions-style local or
small-model preprocessing path, and whether Modal serverless GPU is a practical
option.

## Local FactHarbor Findings

- The clean insertion point is the V2 W4-H/W5 seam:
  `BoundedTextExtractionInputPacket.sourceContentPackets` is built in
  `apps/web/src/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.ts`.
- W5 evidence extraction currently receives an aggregate bounded packet and
  calls a standard Anthropic model through
  `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner.ts`.
- Current defaults use Anthropic provider, tiering on, `modelExtractEvidence:
  "standard"`, `maxTotalTokens: 1000000`, `enforceBudgets: false`, source
  extraction length `15000`, and V2 as the default variant.
- Current V2 model policies use `standard` for evidence extraction, sufficiency,
  boundary verdict, and aggregation narrative. The W5 policy is fail-closed with
  no fallback and no cache read/write in current runtime-owned execution.

## External Sources

- Filip W. Minions article:
  https://www.strathweb.com/2025/10/llm-and-slm-collaboration-using-the-minions-pattern/
- Modal pricing:
  https://modal.com/pricing
- Modal vLLM OpenAI-compatible serving example:
  https://modal.com/docs/examples/vllm_inference
- Modal cold starts:
  https://modal.com/docs/guide/cold-start
- Modal throughput example:
  https://modal.com/docs/examples/vllm_throughput
- Anthropic pricing:
  https://platform.claude.com/docs/en/about-claude/pricing
- Gemini pricing:
  https://ai.google.dev/gemini-api/docs/pricing
- Ollama structured outputs:
  https://docs.ollama.com/capabilities/structured-outputs
- vLLM structured outputs:
  https://docs.vllm.ai/en/stable/features/structured_outputs.html

## Recommendation

Start with a shadow-mode source preprocessor. Do not replace W5 and do not use
the small/local model to discard source chunks in production at first.

Recommended first architecture:

1. Add a new hidden/admin-only `source_preprocessing_shadow` experiment around
   the W4-H extraction-input packet.
2. Feed `ClaimContract` selected AtomicClaims and each
   `sourceContentPacket` to a cheap/local model.
3. Return structured candidate notes tied to `sourceRecordId`,
   `contentPacketId`, text hash, language, candidate quote/excerpt, and
   candidate relevance/evidence rationale.
4. Preserve current W5 standard-model extraction as the authority.
5. Compare the shadow output against accepted W5 EvidenceItems and report
   quality before allowing it to reduce W5 input text.

## Option Ranking

1. Cheapest/easiest first: hosted small model as a shadow preprocessor
   (Gemini Flash-Lite / Claude Haiku / OpenAI mini-class model depending on
   provider policy). This has low ops burden and is likely cheaper at small
   volumes than running a GPU endpoint.
2. Developer-local proof of concept: Ollama with Qwen/Gemma-class 8B-12B model
   and structured outputs. Good for learning and offline experiments, but not a
   production serving story unless local hardware is reliable and always
   available.
3. Modal serverless GPU with vLLM: viable if batching many source chunks or
   many jobs so GPU utilization is high. Use scale-to-zero for budget, persist
   model weights in Modal Volumes, and accept cold starts for non-interactive
   or admin/internal runs. Keeping replicas warm improves latency but creates
   idle GPU cost.

## Modal Assessment

Modal prices GPU by the second. Current listed base prices include T4
`$0.000164/s`, L4 `$0.000222/s`, and A10 `$0.000306/s`; a one-minute run is
roughly one to two cents before CPU/memory overhead. Modal Starter includes
`$30/month` free compute credits and GPU concurrency limits suitable for a small
experiment.

Modal is attractive when:

- FactHarbor can batch many chunks into one invocation;
- the workload is offline/admin/internal or can tolerate cold starts;
- privacy/control over open models matters;
- local hardware is unavailable;
- the preprocessor can run at high GPU utilization.

Modal is not the first choice when:

- requests are sporadic and interactive;
- each job only has a small amount of source text;
- cold-start latency would hurt user experience;
- a cheap hosted model can process the same token volume for less operational
  overhead.

## Implementation Shape

Define a V2-owned task rather than a generic fallback:

- task id: `evidence_source_preprocessing_shadow` or
  `source_preprocessing_shadow`;
- provider adapter: supports `local_ollama`, `modal_vllm_openai_compatible`,
  and cheap cloud provider behind config;
- output contract: `SourcePreprocessingCandidateSet`;
- visibility: internal/admin only at first;
- side effects: no EvidenceItems, no verdicts, no report text, no public
  projection;
- authority: W5 remains final EvidenceItem authority until a gated experiment
  proves recall and report quality.

The first measurable success criterion should be recall, not precision: the
small/local model must preserve all evidence that the current W5 would admit,
even if it returns extra candidate material. Precision can be improved later;
missing decisive evidence is unacceptable.

## Open Risks

- Small models may drop minority or contradicting evidence.
- Structured JSON reliability varies by local model and runtime.
- Modal cold starts can erase latency gains.
- Remote Modal inference still sends user claims and source text to a third
  party, so it is not equivalent to local privacy.
- A production filter that discards chunks before W5 would require explicit
  quality-gated approval.
