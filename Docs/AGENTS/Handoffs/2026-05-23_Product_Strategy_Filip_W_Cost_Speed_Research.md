# 2026-05-23 - Product Strategy - Filip W. Cost/Speed Research

## Task

Research how Filip W.'s public work on agent architectures could help reduce
FactHarbor analysis-pipeline cost and improve speed, with concrete reading
recommendations and questions for Filip.

## Sources Reviewed

- StrathWeb: Chain of Agents, 2026-05-21:
  https://www.strathweb.com/2026/05/chain-of-agents-collaboration-between-local-and-remote-languague-models-with-agent-framework/
- StrathWeb: Minions pattern, 2025-10-24:
  https://www.strathweb.com/2025/10/llm-and-slm-collaboration-using-the-minions-pattern/
- StrathWeb: SLM-default, LLM-fallback, 2025-12-05:
  https://www.strathweb.com/2025/12/slm-default-llm-fallback-pattern-with-agent-framework-and-azure-ai-foundry/
- StrathWeb: HyPE RAG with Semantic Kernel, 2025-07-14:
  https://www.strathweb.com/2025/07/rag-agent-with-hype-pattern-using-semantic-kernel/
- StrathWeb / AgentGuard:
  https://www.strathweb.com/2026/03/introducing-agentguard-declarative-guardrails-for-dotnet-ai-agents/
  https://filipw.github.io/AgentGuard/
- StrathWeb: OpenAPI tools with Semantic Kernel / Azure AI Foundry:
  https://www.strathweb.com/2025/06/ai-agents-with-openapi-tools-part-1-semantic-kernel/
  https://www.strathweb.com/2025/06/ai-agents-with-openapi-tools-part-2-azure-ai-foundry/
- Primary research background: Chain of Agents arXiv 2406.02818, Minions arXiv
  2502.15964, SLM agentic systems survey arXiv 2510.03847.

LinkedIn post text was not directly accessible through public search/login-free
access. The best recent comment target is likely Filip's 2026-05-21 Chain of
Agents post if he shared it on LinkedIn.

## FactHarbor Local Context

- V2 is the default pipeline (`apps/web/configs/pipeline.default.json`) with
  standard-tier extraction/verdict defaults, `parallelExtractionLimit: 3`,
  `maxTotalTokens: 1000000`, `enforceBudgets: false`,
  `maxResearchIterations: 4`, `maxSourcesPerIteration: 8`,
  `maxTotalSources: 24`, `sourceExtractionMaxLength: 15000`, and
  `selfConsistencyMode: full`.
- V2 model policies currently run standard-tier calls for claim understanding,
  query planning, evidence extraction, sufficiency, boundary verdict, and
  aggregation narrative (`apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`).
  The policies are fail-closed with no fallback behavior.
- The current HJ66 lane shows the system can now produce hidden/admin internal
  reports, but quality validation is the next step. Repeated recent bottlenecks
  include W4 source-material usefulness/size, W5 evidence extraction
  no-evidence/schema/oversize behavior, W7-B verdict calibration/orientation,
  and W8 report writer output shape.
- V2 runtime owners record token usage and duration at cloud LLM call sites,
  but many V2 runtime boundaries explicitly set cache I/O and retry/fallback
  behavior to forbidden or none while the pipeline is being stabilized.

## Main Conclusion

Filip's strongest value for FactHarbor cost/speed is not generic agentic coding.
It is hybrid local/cloud model orchestration for large source material, plus
retrieval-time shifting and structured guardrail placement. The highest-value
near-term path is a shadow-mode local/cheap pre-extraction and retrieval
compression lane that never changes final EvidenceItem admission until quality
is proven.

## Recommended Experiments

1. Baseline first: build a V2 per-stage cost/speed ledger from existing token
   and duration telemetry before any optimization.
2. Pilot a Minions-style W5 shadow pre-extractor: cloud model decomposes the
   selected AtomicClaim into extraction jobs; a local/cheap worker reads source
   packets and emits candidate snippets; the current standard W5 extractor
   remains the final EvidenceItem authority. Measure cloud input-token
   reduction, wall-clock impact, schema damage, and missed evidence.
3. Pilot HyPE-like source-material indexing for repeated official pages,
   PDFs, XLSX extracts, and high-value domains: generate "questions this chunk
   answers" offline or once per source, then match claim/query questions before
   W5. This targets source-material usefulness and avoids sending irrelevant
   packets into expensive extraction.
4. Evaluate Chain-of-Agents only for source-material corpora where evidence is
   spread across chunks and independent chunk extraction loses chronology or
   cross-document coherence. Use a bounded Communication Unit that carries
   source refs, quote hashes, temporal bounds, and candidate EvidenceItem refs,
   not full source text.
5. Use AgentGuard ideas structurally, not as semantic shortcuts: token limits,
   prompt-injection/source-result filtering, PII/secrets redaction, tool
   argument validation, and OpenTelemetry-style guardrail timing. Do not add
   deterministic semantic rules for analysis decisions.
6. Batch/asynchronous provider APIs are best for validation gauntlets and
   non-interactive report-quality runs. They are less useful for interactive
   user latency unless the product accepts delayed reports.
7. Model-tier downgrades should be late, not first: try budget/local workers
   for query planning or pre-extraction only after baseline telemetry and
   quality gates exist. Do not downgrade W7-B/report final authority before
   cross-input report quality is stable.

## Questions For Filip

- For fact-checking pipelines, have you seen Chain of Agents reduce total cloud
  tokens versus a map/reduce extractor when citations and provenance must be
  preserved?
- How would you design the Communication Unit so it carries enough evidence
  lineage without turning into a second long context?
- In Minions-style document processing, where would you draw the boundary
  between local SLM extraction and cloud LLM validation for legally/politically
  sensitive factual claims?
- What verifier would you trust for SLM-default fallback when self-reported
  confidence is not acceptable and deterministic semantic heuristics are off
  limits?
- Would HyPE question indexing work for multilingual claims over official PDFs,
  spreadsheets, and government pages, or does it require domain-specific
  tuning?
- Which AgentGuard layers would you put before RAG/source chunks and before
  tool results specifically to save tokens without hiding quality degradation?
- For a Next.js analyzer plus ASP.NET API, would you expose the analysis
  stages through OpenAPI/MCP-style tool contracts or keep the orchestration
  inside the TypeScript pipeline?
- What local model/runtime stack would you recommend on Windows/Azure for
  structured extraction shadow work: Foundry Local, Ollama/vLLM, Phi Engine, or
  something else?

## Residual Risks

- Local/SLM preprocessing can silently drop minority evidence. It must be
  shadowed against the current standard W5 path before it is allowed to reduce
  cloud context.
- CoA is sequential by design and may increase wall-clock latency if used where
  independent chunk processing is sufficient.
- AgentGuard includes regex/keyword-style rules that are acceptable for
  structural security filtering but not for FactHarbor semantic analysis
  decisions.
- Batch APIs can cut cost for offline validation but do not directly improve
  user-facing latency.
