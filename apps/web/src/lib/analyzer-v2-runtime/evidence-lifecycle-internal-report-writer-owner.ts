import { readFile } from "node:fs/promises";
import path from "node:path";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import type {
  BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import {
  AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
  AGGREGATION_NARRATIVE_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/aggregation-narrative-contract";
import type {
  InternalAlphaReportResultCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-alpha-report-result";
import {
  buildAggregationNarrativeInputPacket,
  INTERNAL_REPORT_WRITER_DECISION_VERSION,
  INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
  runInternalReportWriterRuntime,
  type AggregationNarrativeInputPacket,
  type InternalReportWriterDecision,
  type InternalReportWriterProviderCallRequest,
  type InternalReportWriterProviderCallResponse,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/internal-report-writer";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";

export const INTERNAL_REPORT_WRITER_PROVIDER_FACTORY_VERSION =
  "v2.evidence-lifecycle.internal-report-writer.provider-factory.hj18" as const;
const INTERNAL_REPORT_WRITER_PROMPT_PROFILE = "claimboundary-v2" as const;
const INTERNAL_REPORT_WRITER_PROMPT_FILE = "claimboundary-v2.prompt.md" as const;
const INTERNAL_REPORT_WRITER_VARIABLES = [
  "aggregationNarrativeInputPacketJson",
  "taskPolicySnapshotJson",
  "reportQualityGuardrailsJson",
] as const;

type InternalReportWriterPromptVariable = typeof INTERNAL_REPORT_WRITER_VARIABLES[number];

type RenderedInternalReportWriterPrompt = {
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
};

export class InternalReportWriterProviderCallError extends Error {
  constructor(message = "Internal report writer provider call failed.") {
    super(message);
    this.name = "InternalReportWriterProviderCallError";
  }
}

function requireTokenCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new InternalReportWriterProviderCallError();
  }
  return value;
}

function sanitizeProviderError(error: unknown): InternalReportWriterProviderCallError {
  return error instanceof InternalReportWriterProviderCallError
    ? error
    : new InternalReportWriterProviderCallError();
}

function assertActivation(context: PipelineRunContext): void {
  const activation = context.queryPlanningRuntimeActivation;
  if (
    activation.status !== QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT ||
    activation.source !== "v2_task_policy_snapshot" ||
    activation.suppliedBy !== "product_owned_activation_authority" ||
    activation.freezeLocation !== "pipeline_run_context" ||
    activation.activationProfileId !== QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID ||
    activation.provider.providerId !== "anthropic" ||
    activation.provider.modelId.trim().length === 0 ||
    activation.hiddenArtifactSink.visibility !== "internal_admin_only" ||
    activation.hiddenArtifactSink.publicPointerExposure !== "forbidden"
  ) {
    throw new InternalReportWriterProviderCallError();
  }
}

function assertRequestMatchesSnapshot(
  request: InternalReportWriterProviderCallRequest,
  context: PipelineRunContext,
): void {
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "aggregation_narrative");
  if (!modelPolicy) {
    throw new InternalReportWriterProviderCallError();
  }
  if (
    request.outputSchemaVersion !== AGGREGATION_NARRATIVE_SCHEMA_VERSION ||
    request.modelPolicy.policyId !== modelPolicy.policyId ||
    request.modelPolicy.gatewayTaskId !== "aggregation_narrative" ||
    request.modelPolicy.modelTask !== "report" ||
    request.modelPolicy.temperature !== modelPolicy.temperature ||
    request.modelPolicy.maxCalls !== modelPolicy.maxCalls ||
    request.modelPolicy.schemaRetryCount !== modelPolicy.schemaRetryCount ||
    request.modelPolicy.timeoutMs !== modelPolicy.timeoutMs ||
    request.modelPolicy.maxOutputTokens !== modelPolicy.maxOutputTokens
  ) {
    throw new InternalReportWriterProviderCallError();
  }
}

async function executeAnthropicProviderCall(params: {
  readonly request: InternalReportWriterProviderCallRequest;
  readonly context: PipelineRunContext;
  readonly startedAt: number;
}): Promise<InternalReportWriterProviderCallResponse> {
  try {
    assertActivation(params.context);
    assertRequestMatchesSnapshot(params.request, params.context);
    const modelId = params.context.queryPlanningRuntimeActivation.provider.modelId;
    const result = await generateText({
      model: anthropic(modelId as Parameters<typeof anthropic>[0]),
      prompt: params.request.renderedPrompt,
      temperature: params.request.modelPolicy.temperature,
      maxOutputTokens: params.request.modelPolicy.maxOutputTokens,
      timeout: params.request.modelPolicy.timeoutMs,
      maxRetries: 0,
    });
    const usage = result.totalUsage ?? result.usage;
    return {
      output: result.text,
      telemetry: {
        providerId: "anthropic",
        modelId,
        inputTokens: requireTokenCount(usage.inputTokens),
        outputTokens: requireTokenCount(usage.outputTokens),
        totalTokens: requireTokenCount(usage.totalTokens),
        durationMs: Math.max(0, Date.now() - params.startedAt),
      },
    };
  } catch (error) {
    throw sanitizeProviderError(error);
  }
}

function buildConfigSnapshotHash(params: {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): string {
  return sha256Json({
    sourcePackage: INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
    providerFactoryVersion: INTERNAL_REPORT_WRITER_PROVIDER_FACTORY_VERSION,
    runtimeDecisionVersion: INTERNAL_REPORT_WRITER_DECISION_VERSION,
    activationSnapshotHash: params.context.queryPlanningRuntimeActivation.activationSnapshotHash,
    gatewayTask: getPipelineRunGatewayTask(params.context, "aggregation_narrative"),
    modelPolicy: getPipelineRunTaskModelPolicy(params.context, "aggregation_narrative"),
    modelPolicySnapshotHash: params.context.modelPolicy.snapshotHash,
    parentDecisionHashes: {
      internalAlphaReportResult: params.internalAlphaReportResult
        ? sha256Json(params.internalAlphaReportResult)
        : null,
      boundaryVerdictExecution: params.boundaryVerdictExecution
        ? sha256Json(params.boundaryVerdictExecution)
        : null,
    },
  });
}

function buildReportQualityGuardrails(inputPacket: AggregationNarrativeInputPacket): Record<string, unknown> {
  return {
    outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
    publicCutoverStatus: "blocked_precutover",
    publicProjectionAllowed: false,
    defaultProjection: "hash_length_provenance_only",
    preserveVerdictValuesExactly: true,
    preserveCitationIdsExactly: true,
    allowedEvidenceItemIds: inputPacket.citedEvidenceItemIds,
    allowedVerdictCandidateIds: inputPacket.verdictSetCandidate.verdictCandidates
      .map((verdict) => verdict.verdictCandidateId),
    allowedBoundaryCandidateIds: inputPacket.boundarySetCandidate.boundaries
      .map((boundary) => boundary.boundaryCandidateId),
    warningPublication: "closed",
  };
}

function buildPromptVariables(params: {
  readonly context: PipelineRunContext;
  readonly inputPacket: AggregationNarrativeInputPacket;
}): Record<InternalReportWriterPromptVariable, string> {
  return {
    aggregationNarrativeInputPacketJson: JSON.stringify(params.inputPacket),
    taskPolicySnapshotJson: JSON.stringify({
      gatewayTask: getPipelineRunGatewayTask(params.context, "aggregation_narrative"),
      modelPolicy: getPipelineRunTaskModelPolicy(params.context, "aggregation_narrative"),
      promptSectionId: AGGREGATION_NARRATIVE_PROMPT_SECTION_ID,
      outputSchemaVersion: AGGREGATION_NARRATIVE_SCHEMA_VERSION,
      sourcePackage: INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
      productOwnerSourcePackage: INTERNAL_REPORT_WRITER_SOURCE_PACKAGE,
    }),
    reportQualityGuardrailsJson: JSON.stringify(buildReportQualityGuardrails(params.inputPacket)),
  };
}

async function loadAndRenderPrompt(
  variables: Record<InternalReportWriterPromptVariable, string>,
): Promise<RenderedInternalReportWriterPrompt> {
  const promptRoot = path.resolve(process.cwd(), "prompts");
  const promptFilePath = path.join(promptRoot, INTERNAL_REPORT_WRITER_PROMPT_FILE);
  for (const variableName of INTERNAL_REPORT_WRITER_VARIABLES) {
    JSON.parse(variables[variableName]);
  }
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterPipeline = readFrontmatterPipeline(content);
  if (frontmatterPipeline !== INTERNAL_REPORT_WRITER_PROMPT_PROFILE) {
    throw new InternalReportWriterProviderCallError();
  }
  const section = readSection(content, AGGREGATION_NARRATIVE_PROMPT_SECTION_ID);
  if (!section.includes(AGGREGATION_NARRATIVE_SCHEMA_VERSION)) {
    throw new InternalReportWriterProviderCallError();
  }
  for (const variableName of INTERNAL_REPORT_WRITER_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new InternalReportWriterProviderCallError();
    }
  }

  return {
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    renderedPrompt: [
      section,
      "### Runtime JSON Packets",
      ...INTERNAL_REPORT_WRITER_VARIABLES.map((variableName) => [
        `Packet: ${variableName}`,
        "```json",
        variables[variableName],
        "```",
      ].join("\n")),
    ].join("\n\n"),
  };
}

function readFrontmatterPipeline(content: string): string | null {
  if (!content.startsWith("---\n")) {
    return null;
  }
  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return null;
  }
  const match = content.slice(4, end).match(/^pipeline:\s*(.+)$/m);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

function readSection(content: string, sectionId: string): string {
  const header = `## ${sectionId}`;
  const start = content.indexOf(header);
  if (start < 0) {
    throw new InternalReportWriterProviderCallError();
  }
  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

export async function runInternalReportWriterDecision(input: {
  readonly context: PipelineRunContext;
  readonly internalAlphaReportResult: InternalAlphaReportResultCandidate | null | undefined;
  readonly boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null | undefined;
}): Promise<InternalReportWriterDecision> {
  const inputPacket = buildAggregationNarrativeInputPacket({
    internalAlphaReportResult: input.internalAlphaReportResult,
    boundaryVerdictExecution: input.boundaryVerdictExecution,
  });
  const configSnapshotHash = buildConfigSnapshotHash(input);
  if (!inputPacket) {
    return runInternalReportWriterRuntime({
      ...input,
      renderedPrompt: "",
      promptContentHash: "",
      configSnapshotHash,
      providerCall: (request) => executeAnthropicProviderCall({
        request,
        context: input.context,
        startedAt: Date.now(),
      }),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });
  }

  const renderedPrompt = await loadAndRenderPrompt(buildPromptVariables({
    context: input.context,
    inputPacket,
  }));
  const providerCall = async (
    request: InternalReportWriterProviderCallRequest,
  ): Promise<InternalReportWriterProviderCallResponse> => executeAnthropicProviderCall({
    request,
    context: input.context,
    startedAt: Date.now(),
  });

  return runInternalReportWriterRuntime({
    ...input,
    renderedPrompt: renderedPrompt.renderedPrompt,
    promptContentHash: renderedPrompt.promptContentHash,
    configSnapshotHash,
    providerCall,
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  });
}
