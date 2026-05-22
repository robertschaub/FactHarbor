import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type {
  BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type {
  EvidenceItemHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  BOUNDARY_VERDICT_EXECUTION_INPUT_PACKET_VERSION,
  BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE,
  buildBoundaryVerdictSelectedAtomicClaimProjections,
  runBoundaryVerdictExecutionRuntime,
  type BoundaryVerdictEvidenceScopeProjection,
  type BoundaryVerdictExecutionDecision,
  type BoundaryVerdictExecutionInputPacket,
  type BoundaryVerdictExecutionInputPacketItem,
  type BoundaryVerdictExecutionProviderCallRequest,
  type BoundaryVerdictExecutionProviderCallResponse,
  type BoundaryVerdictExecutionSelectedAtomicClaimProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type {
  BoundaryVerdictCandidateDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import type {
  InternalAlphaReportStopCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import type {
  SufficiencyAssessmentDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type {
  SufficiencyIntakeDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
  type ExtractedEvidenceItemContract,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  getPipelineRunGatewayTask,
  getPipelineRunTaskModelPolicy,
  type PipelineRunContext,
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";
import { sha256Json } from "@/lib/analyzer-v2/util";
import {
  readBoundedEvidenceExtractionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";
import {
  markBoundaryVerdictExecutionRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance";
import {
  readSufficiencyAssessmentRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";

export const BOUNDARY_VERDICT_EXECUTION_OWNER_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W7-B2_Boundary_Verdict_Product_Runtime_Owner_Review_Package.md" as const;
export const BOUNDARY_VERDICT_EXECUTION_PROVIDER_FACTORY_VERSION =
  "v2.evidence-lifecycle.boundary-verdict-execution.provider-factory.w7b2" as const;
const BOUNDARY_VERDICT_EXECUTION_PROMPT_PROFILE = "claimboundary-v2" as const;
const BOUNDARY_VERDICT_EXECUTION_PROMPT_FILE = "claimboundary-v2.prompt.md" as const;
const BOUNDARY_VERDICT_EXECUTION_VARIABLES = [
  "boundaryVerdictInputPacketJson",
  "taskPolicySnapshotJson",
  "sufficiencyAssessmentProjectionJson",
  "warningMaterialitySeedJson",
] as const;

type BoundaryVerdictExecutionPromptVariable = typeof BOUNDARY_VERDICT_EXECUTION_VARIABLES[number];

export class BoundaryVerdictExecutionProviderCallError extends Error {
  constructor(message = "Boundary Verdict Execution provider call failed.") {
    super(message);
    this.name = "BoundaryVerdictExecutionProviderCallError";
  }
}

export type RunBoundaryVerdictExecutionDecisionInput = {
  readonly context: PipelineRunContext;
  readonly claimContract: ClaimContract | null;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null;
};

type RenderedBoundaryVerdictExecutionPrompt = {
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
};

type PromptReadySufficiencyAssessmentDecision = SufficiencyAssessmentDecision & {
  readonly sufficiencyAssessmentStatus:
    NonNullable<SufficiencyAssessmentDecision["sufficiencyAssessmentStatus"]>;
};

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function textOrNullHash(value: string | null): string | null {
  return value === null ? null : sha256Text(value);
}

function requireTokenCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  return value;
}

function sanitizeProviderError(error: unknown): BoundaryVerdictExecutionProviderCallError {
  return error instanceof BoundaryVerdictExecutionProviderCallError
    ? error
    : new BoundaryVerdictExecutionProviderCallError();
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
    throw new BoundaryVerdictExecutionProviderCallError();
  }
}

function assertRequestMatchesSnapshot(
  request: BoundaryVerdictExecutionProviderCallRequest,
  context: PipelineRunContext,
): void {
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "boundary_verdict_execution");
  if (!modelPolicy) {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  if (
    request.outputSchemaVersion !== BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION ||
    request.modelPolicy.policyId !== modelPolicy.policyId ||
    request.modelPolicy.gatewayTaskId !== "boundary_verdict_execution" ||
    request.modelPolicy.modelTask !== "verdict" ||
    request.modelPolicy.temperature !== modelPolicy.temperature ||
    request.modelPolicy.maxCalls !== modelPolicy.maxCalls ||
    request.modelPolicy.schemaRetryCount !== modelPolicy.schemaRetryCount ||
    request.modelPolicy.timeoutMs !== modelPolicy.timeoutMs ||
    request.modelPolicy.maxOutputTokens !== modelPolicy.maxOutputTokens
  ) {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
}

async function executeAnthropicProviderCall(params: {
  readonly request: BoundaryVerdictExecutionProviderCallRequest;
  readonly context: PipelineRunContext;
  readonly startedAt: number;
}): Promise<BoundaryVerdictExecutionProviderCallResponse> {
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
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision | null;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null;
  readonly sufficiencyAssessment: SufficiencyAssessmentDecision | null;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate | null;
}): string {
  return sha256Json({
    sourcePackage: BOUNDARY_VERDICT_EXECUTION_OWNER_SOURCE_PACKAGE,
    coreRuntimeSourcePackage: BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE,
    providerFactoryVersion: BOUNDARY_VERDICT_EXECUTION_PROVIDER_FACTORY_VERSION,
    activationSnapshotHash: params.context.queryPlanningRuntimeActivation.activationSnapshotHash,
    gatewayTask: getPipelineRunGatewayTask(params.context, "boundary_verdict_execution"),
    modelPolicy: getPipelineRunTaskModelPolicy(params.context, "boundary_verdict_execution"),
    modelPolicySnapshotHash: params.context.modelPolicy.snapshotHash,
    parentDecisionHashes: {
      boundedEvidenceExtraction: params.boundedEvidenceExtraction
        ? sha256Json(params.boundedEvidenceExtraction)
        : null,
      evidenceItemHandoff: params.evidenceItemHandoff ? sha256Json(params.evidenceItemHandoff) : null,
      sufficiencyIntake: params.sufficiencyIntake ? sha256Json(params.sufficiencyIntake) : null,
      sufficiencyAssessment: params.sufficiencyAssessment ? sha256Json(params.sufficiencyAssessment) : null,
      boundaryVerdictCandidate: params.boundaryVerdictCandidate
        ? sha256Json(params.boundaryVerdictCandidate)
        : null,
      internalAlphaReportStop: params.internalAlphaReportStop
        ? sha256Json(params.internalAlphaReportStop)
        : null,
    },
  });
}

function evidenceScopeProjection(
  scope: ExtractedEvidenceItemContract["evidenceScope"],
): BoundaryVerdictEvidenceScopeProjection {
  return {
    scopeIdHash: sha256Text(scope.scopeId),
    methodHash: textOrNullHash(scope.method),
    temporalBoundsHash: textOrNullHash(scope.temporalBounds),
    populationOrDomainHash: textOrNullHash(scope.populationOrDomain),
    geographicScopeHash: textOrNullHash(scope.geographicScope),
    limitationCount: scope.limitations.length,
    limitationHashes: scope.limitations.map((limitation) => sha256Text(limitation)),
  };
}

function packetItem(item: ExtractedEvidenceItemContract): BoundaryVerdictExecutionInputPacketItem {
  return {
    evidenceItemId: item.evidenceItemId,
    statement: item.statement,
    statementHash: sha256Text(item.statement),
    statementByteLength: utf8ByteLength(item.statement),
    targetAtomicClaimIds: item.targetAtomicClaimIds.map((claimId) => claimId),
    claimDirection: item.claimDirection,
    probativeValue: item.probativeValue,
    evidenceStrength: item.evidenceStrength,
    extractionConfidence: item.extractionConfidence,
    evidenceScopeHash: sha256Json(item.evidenceScope),
    evidenceScope: evidenceScopeProjection(item.evidenceScope),
    provenanceHash: sha256Json(item.provenance),
  };
}

function buildPromptInputPacket(params: {
  readonly claimContract: ClaimContract;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision;
  readonly sufficiencyIntake: SufficiencyIntakeDecision;
  readonly sufficiencyAssessment: PromptReadySufficiencyAssessmentDecision;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate;
}): BoundaryVerdictExecutionInputPacket {
  const evidenceItems = params.boundedEvidenceExtraction.extractionResult?.status === "accepted"
    ? params.boundedEvidenceExtraction.extractionResult.evidenceItems.map(packetItem)
    : [];
  const selectedAtomicClaimProjection = buildBoundaryVerdictSelectedAtomicClaimProjections(params.claimContract);
  if (selectedAtomicClaimProjection.status !== "accepted") {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  const selectedAtomicClaims: readonly BoundaryVerdictExecutionSelectedAtomicClaimProjection[] =
    selectedAtomicClaimProjection.claims;
  const base = {
    packetVersion: BOUNDARY_VERDICT_EXECUTION_INPUT_PACKET_VERSION,
    parentW5DecisionId: params.boundedEvidenceExtraction.decisionId,
    parentW5FDecisionId: params.evidenceItemHandoff.decisionId,
    parentW6BDecisionId: params.sufficiencyIntake.decisionId,
    parentW6CDecisionId: params.sufficiencyAssessment.decisionId,
    parentW7ADecisionId: params.boundaryVerdictCandidate.decisionId,
    parentW8ADecisionId: params.internalAlphaReportStop.decisionId,
    selectedAtomicClaimCount: selectedAtomicClaims.length,
    selectedAtomicClaims,
    evidenceItemCount: evidenceItems.length,
    evidenceItems,
    sufficiencyAssessmentProjection: {
      sufficiencyResultStatus: params.sufficiencyAssessment.sufficiencyResultStatus,
      sufficiencyAssessmentStatus: params.sufficiencyAssessment.sufficiencyAssessmentStatus,
      reportStopRecommendation: params.sufficiencyAssessment.reportStopRecommendation,
      sufficiencyResultPayloadHash: params.sufficiencyAssessment.sufficiencyResultPayloadHash,
    },
    warningMaterialitySeed: {
      upstreamSufficiencyStatus: params.sufficiencyAssessment.sufficiencyAssessmentStatus,
      upstreamRecommendedNextAction: params.sufficiencyAssessment.reportStopRecommendation,
      userVisibleWarningPublication: "closed" as const,
    },
    sourceMaterialLineageHash: params.evidenceItemHandoff.sourceMaterialLineageHash!,
    sourceProviderId: params.evidenceItemHandoff.providerId!,
    parentEvidenceExtractionModelId: params.evidenceItemHandoff.modelId!,
  };
  return {
    ...base,
    packetId: `BOUNDARY_VERDICT_INPUT_${sha256Json(base).slice(0, 24).toUpperCase()}`,
  };
}

function buildPromptVariables(params: {
  readonly context: PipelineRunContext;
  readonly claimContract: ClaimContract;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
  readonly evidenceItemHandoff: EvidenceItemHandoffDecision;
  readonly sufficiencyIntake: SufficiencyIntakeDecision;
  readonly sufficiencyAssessment: PromptReadySufficiencyAssessmentDecision;
  readonly boundaryVerdictCandidate: BoundaryVerdictCandidateDecision;
  readonly internalAlphaReportStop: InternalAlphaReportStopCandidate;
}): Record<BoundaryVerdictExecutionPromptVariable, string> {
  const inputPacket = buildPromptInputPacket(params);
  return {
    boundaryVerdictInputPacketJson: JSON.stringify(inputPacket),
    taskPolicySnapshotJson: JSON.stringify({
      gatewayTask: getPipelineRunGatewayTask(params.context, "boundary_verdict_execution"),
      modelPolicy: getPipelineRunTaskModelPolicy(params.context, "boundary_verdict_execution"),
      promptSectionId: EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution,
      outputSchemaVersion: BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
      sourcePackage: BOUNDARY_VERDICT_EXECUTION_SOURCE_PACKAGE,
      productOwnerSourcePackage: BOUNDARY_VERDICT_EXECUTION_OWNER_SOURCE_PACKAGE,
    }),
    sufficiencyAssessmentProjectionJson: JSON.stringify(inputPacket.sufficiencyAssessmentProjection),
    warningMaterialitySeedJson: JSON.stringify(inputPacket.warningMaterialitySeed),
  };
}

async function loadAndRenderPrompt(
  variables: Record<BoundaryVerdictExecutionPromptVariable, string>,
): Promise<RenderedBoundaryVerdictExecutionPrompt> {
  const promptRoot = path.resolve(process.cwd(), "prompts");
  const promptFilePath = path.join(promptRoot, BOUNDARY_VERDICT_EXECUTION_PROMPT_FILE);
  for (const variableName of BOUNDARY_VERDICT_EXECUTION_VARIABLES) {
    JSON.parse(variables[variableName]);
  }
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterPipeline = readFrontmatterPipeline(content);
  if (frontmatterPipeline !== BOUNDARY_VERDICT_EXECUTION_PROMPT_PROFILE) {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution);
  if (!section.includes(BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION)) {
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  for (const variableName of BOUNDARY_VERDICT_EXECUTION_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new BoundaryVerdictExecutionProviderCallError();
    }
  }

  return {
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    renderedPrompt: [
      section,
      "### Runtime JSON Packets",
      ...BOUNDARY_VERDICT_EXECUTION_VARIABLES.map((variableName) => [
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
    throw new BoundaryVerdictExecutionProviderCallError();
  }
  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

export async function runBoundaryVerdictExecutionDecision(
  input: RunBoundaryVerdictExecutionDecisionInput,
): Promise<BoundaryVerdictExecutionDecision> {
  const runtimeOwnedW5 = readBoundedEvidenceExtractionRuntimeOwnedDecision(
    input.boundedEvidenceExtraction,
  );
  const runtimeOwnedSufficiencyAssessment = readSufficiencyAssessmentRuntimeOwnedDecision(
    input.sufficiencyAssessment,
  );
  const selectedAtomicClaimProjection = buildBoundaryVerdictSelectedAtomicClaimProjections(input.claimContract);
  const configSnapshotHash = buildConfigSnapshotHash({
    context: input.context,
    boundedEvidenceExtraction: runtimeOwnedW5,
    evidenceItemHandoff: input.evidenceItemHandoff,
    sufficiencyIntake: input.sufficiencyIntake,
    sufficiencyAssessment: runtimeOwnedSufficiencyAssessment,
    boundaryVerdictCandidate: input.boundaryVerdictCandidate,
    internalAlphaReportStop: input.internalAlphaReportStop,
  });

  if (
    !runtimeOwnedW5 ||
    !input.evidenceItemHandoff ||
    !input.sufficiencyIntake ||
    !runtimeOwnedSufficiencyAssessment ||
    !runtimeOwnedSufficiencyAssessment.sufficiencyAssessmentStatus ||
    !input.boundaryVerdictCandidate ||
    !input.internalAlphaReportStop ||
    !input.claimContract ||
    selectedAtomicClaimProjection.status !== "accepted"
  ) {
    const decision = await runBoundaryVerdictExecutionRuntime({
      context: input.context,
      claimContract: input.claimContract,
      boundedEvidenceExtraction: runtimeOwnedW5,
      evidenceItemHandoff: input.evidenceItemHandoff,
      sufficiencyIntake: input.sufficiencyIntake,
      sufficiencyAssessment: runtimeOwnedSufficiencyAssessment,
      boundaryVerdictCandidate: input.boundaryVerdictCandidate,
      internalAlphaReportStop: input.internalAlphaReportStop,
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
    return markBoundaryVerdictExecutionRuntimeOwnedDecision(decision);
  }

  const promptReadySufficiencyAssessment =
    runtimeOwnedSufficiencyAssessment as PromptReadySufficiencyAssessmentDecision;
  const renderedPrompt = await loadAndRenderPrompt(buildPromptVariables({
    context: input.context,
    claimContract: input.claimContract,
    boundedEvidenceExtraction: runtimeOwnedW5,
    evidenceItemHandoff: input.evidenceItemHandoff,
    sufficiencyIntake: input.sufficiencyIntake,
    sufficiencyAssessment: promptReadySufficiencyAssessment,
    boundaryVerdictCandidate: input.boundaryVerdictCandidate,
    internalAlphaReportStop: input.internalAlphaReportStop,
  }));
  const providerCall = async (
    request: BoundaryVerdictExecutionProviderCallRequest,
  ): Promise<BoundaryVerdictExecutionProviderCallResponse> => executeAnthropicProviderCall({
    request,
    context: input.context,
    startedAt: Date.now(),
  });
  const decision = await runBoundaryVerdictExecutionRuntime({
    context: input.context,
    claimContract: input.claimContract,
    boundedEvidenceExtraction: runtimeOwnedW5,
    evidenceItemHandoff: input.evidenceItemHandoff,
    sufficiencyIntake: input.sufficiencyIntake,
    sufficiencyAssessment: runtimeOwnedSufficiencyAssessment,
    boundaryVerdictCandidate: input.boundaryVerdictCandidate,
    internalAlphaReportStop: input.internalAlphaReportStop,
    renderedPrompt: renderedPrompt.renderedPrompt,
    promptContentHash: renderedPrompt.promptContentHash,
    configSnapshotHash,
    providerCall,
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  });

  return markBoundaryVerdictExecutionRuntimeOwnedDecision(decision);
}
