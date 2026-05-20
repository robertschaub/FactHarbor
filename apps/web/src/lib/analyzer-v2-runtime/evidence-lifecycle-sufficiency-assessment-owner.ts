import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

import type {
  BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import {
  SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE,
  runSufficiencyAssessmentRuntime,
  type SufficiencyAssessmentDecision,
  type SufficiencyAssessmentProviderCallRequest,
  type SufficiencyAssessmentProviderCallResponse,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type {
  SufficiencyIntakeDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
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
  markSufficiencyAssessmentRuntimeOwnedDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-provenance";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";

export const SUFFICIENCY_ASSESSMENT_OWNER_SOURCE_PACKAGE =
  "Docs/WIP/2026-05-20_V2_Slice_W6-C2_Sufficiency_Product_Runtime_Owner_Review_Package.md" as const;
export const SUFFICIENCY_ASSESSMENT_PROVIDER_FACTORY_VERSION =
  "v2.evidence-lifecycle.sufficiency-assessment.provider-factory.w6c2" as const;
const SUFFICIENCY_ASSESSMENT_PROMPT_PROFILE = "claimboundary-v2" as const;
const SUFFICIENCY_ASSESSMENT_PROMPT_FILE = "claimboundary-v2.prompt.md" as const;
const SUFFICIENCY_ASSESSMENT_VARIABLES = [
  "claimContractJson",
  "taskPolicySnapshotJson",
  "evidenceCorpusJson",
  "sourceAcquisitionTraceJson",
] as const;

type SufficiencyAssessmentPromptVariable = typeof SUFFICIENCY_ASSESSMENT_VARIABLES[number];

export class SufficiencyAssessmentProviderCallError extends Error {
  constructor(message = "Sufficiency Assessment provider call failed.") {
    super(message);
    this.name = "SufficiencyAssessmentProviderCallError";
  }
}

export type RunSufficiencyAssessmentDecisionInput = {
  readonly context: PipelineRunContext;
  readonly sufficiencyIntake: SufficiencyIntakeDecision | null;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision | null;
};

type RenderedSufficiencyAssessmentPrompt = {
  readonly promptContentHash: string;
  readonly renderedPrompt: string;
};

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function requireTokenCount(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new SufficiencyAssessmentProviderCallError();
  }
  return value;
}

function sanitizeProviderError(error: unknown): SufficiencyAssessmentProviderCallError {
  return error instanceof SufficiencyAssessmentProviderCallError
    ? error
    : new SufficiencyAssessmentProviderCallError();
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
    throw new SufficiencyAssessmentProviderCallError();
  }
}

function assertRequestMatchesSnapshot(
  request: SufficiencyAssessmentProviderCallRequest,
  context: PipelineRunContext,
): void {
  const modelPolicy = getPipelineRunTaskModelPolicy(context, "evidence_sufficiency");
  if (!modelPolicy) {
    throw new SufficiencyAssessmentProviderCallError();
  }
  if (
    request.outputSchemaVersion !== EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION ||
    request.modelPolicy.policyId !== modelPolicy.policyId ||
    request.modelPolicy.gatewayTaskId !== "evidence_sufficiency" ||
    request.modelPolicy.modelTask !== "context_refinement" ||
    request.modelPolicy.temperature !== modelPolicy.temperature ||
    request.modelPolicy.maxCalls !== modelPolicy.maxCalls ||
    request.modelPolicy.schemaRetryCount !== modelPolicy.schemaRetryCount ||
    request.modelPolicy.timeoutMs !== modelPolicy.timeoutMs ||
    request.modelPolicy.maxOutputTokens !== modelPolicy.maxOutputTokens
  ) {
    throw new SufficiencyAssessmentProviderCallError();
  }
}

async function executeAnthropicProviderCall(params: {
  readonly request: SufficiencyAssessmentProviderCallRequest;
  readonly context: PipelineRunContext;
  readonly startedAt: number;
}): Promise<SufficiencyAssessmentProviderCallResponse> {
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

function buildConfigSnapshotHash(context: PipelineRunContext): string {
  return sha256Json({
    sourcePackage: SUFFICIENCY_ASSESSMENT_OWNER_SOURCE_PACKAGE,
    coreRuntimeSourcePackage: SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE,
    providerFactoryVersion: SUFFICIENCY_ASSESSMENT_PROVIDER_FACTORY_VERSION,
    activationSnapshotHash: context.queryPlanningRuntimeActivation.activationSnapshotHash,
    gatewayTask: getPipelineRunGatewayTask(context, "evidence_sufficiency"),
    modelPolicy: getPipelineRunTaskModelPolicy(context, "evidence_sufficiency"),
    modelPolicySnapshotHash: context.modelPolicy.snapshotHash,
  });
}

function buildPromptVariables(params: {
  readonly context: PipelineRunContext;
  readonly sufficiencyIntake: SufficiencyIntakeDecision;
  readonly boundedEvidenceExtraction: BoundedEvidenceExtractionDecision;
}): Record<SufficiencyAssessmentPromptVariable, string> {
  const evidenceItems = params.boundedEvidenceExtraction.extractionResult?.status === "accepted"
    ? params.boundedEvidenceExtraction.extractionResult.evidenceItems.map((item) => ({
      evidenceItemId: item.evidenceItemId,
      statement: item.statement,
      statementHash: sha256Text(item.statement),
      statementByteLength: utf8ByteLength(item.statement),
      targetAtomicClaimIds: item.targetAtomicClaimIds,
      claimDirection: item.claimDirection,
      probativeValue: item.probativeValue,
      evidenceStrength: item.evidenceStrength,
      extractionConfidence: item.extractionConfidence,
      evidenceScopeHash: sha256Json(item.evidenceScope),
      evidenceScopeFieldByteLengths: {
        scopeId: utf8ByteLength(item.evidenceScope.scopeId),
        method: item.evidenceScope.method === null ? null : utf8ByteLength(item.evidenceScope.method),
        temporalBounds: item.evidenceScope.temporalBounds === null
          ? null
          : utf8ByteLength(item.evidenceScope.temporalBounds),
        populationOrDomain: item.evidenceScope.populationOrDomain === null
          ? null
          : utf8ByteLength(item.evidenceScope.populationOrDomain),
        geographicScope: item.evidenceScope.geographicScope === null
          ? null
          : utf8ByteLength(item.evidenceScope.geographicScope),
        limitations: item.evidenceScope.limitations.map((limitation) => utf8ByteLength(limitation)),
      },
      provenanceHash: sha256Json(item.provenance),
      provenanceFieldByteLengths: {
        locator: utf8ByteLength(item.provenance.locator),
        rationale: utf8ByteLength(item.provenance.rationale),
      },
    }))
    : [];
  return {
    claimContractJson: JSON.stringify({
      inputType: params.context.inputType,
      resolvedInputText: params.context.resolvedInputText,
      detectedLanguage: params.context.detectedLanguage,
      selectedAtomicClaimIds: params.context.selectedAtomicClaimIds,
      currentDate: params.context.currentDate,
    }),
    taskPolicySnapshotJson: JSON.stringify({
      gatewayTask: getPipelineRunGatewayTask(params.context, "evidence_sufficiency"),
      modelPolicy: getPipelineRunTaskModelPolicy(params.context, "evidence_sufficiency"),
      sourcePackage: SUFFICIENCY_ASSESSMENT_SOURCE_PACKAGE,
      productOwnerSourcePackage: SUFFICIENCY_ASSESSMENT_OWNER_SOURCE_PACKAGE,
    }),
    evidenceCorpusJson: JSON.stringify({
      sufficiencyIntakeDecisionId: params.sufficiencyIntake.decisionId,
      boundedEvidenceExtractionDecisionId: params.boundedEvidenceExtraction.decisionId,
      admittedEvidenceItemCount: params.sufficiencyIntake.admittedEvidenceItemCount,
      evidenceItems,
    }),
    sourceAcquisitionTraceJson: JSON.stringify({
      sourceMaterialLineageHash: params.sufficiencyIntake.sourceMaterialLineageHash,
      w4hPacketHash: params.sufficiencyIntake.w4hPacketHash,
      providerId: params.sufficiencyIntake.providerId,
      modelId: params.sufficiencyIntake.modelId,
      w5ParentPacketHash: params.boundedEvidenceExtraction.parent.parentPacketHash,
      w5ParentProviderId: params.boundedEvidenceExtraction.parent.parentProviderId,
      w5SourceMaterialRefHash: params.sufficiencyIntake.sourceMaterialLineageHash,
    }),
  };
}

async function loadAndRenderPrompt(
  variables: Record<SufficiencyAssessmentPromptVariable, string>,
): Promise<RenderedSufficiencyAssessmentPrompt> {
  const promptRoot = path.resolve(process.cwd(), "prompts");
  const promptFilePath = path.join(promptRoot, SUFFICIENCY_ASSESSMENT_PROMPT_FILE);
  for (const variableName of SUFFICIENCY_ASSESSMENT_VARIABLES) {
    JSON.parse(variables[variableName]);
  }
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatterPipeline = readFrontmatterPipeline(content);
  if (frontmatterPipeline !== SUFFICIENCY_ASSESSMENT_PROMPT_PROFILE) {
    throw new SufficiencyAssessmentProviderCallError();
  }
  const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency);
  if (!section.includes(EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION)) {
    throw new SufficiencyAssessmentProviderCallError();
  }
  for (const variableName of SUFFICIENCY_ASSESSMENT_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new SufficiencyAssessmentProviderCallError();
    }
  }

  return {
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    renderedPrompt: [
      section,
      "### Runtime JSON Packets",
      ...SUFFICIENCY_ASSESSMENT_VARIABLES.map((variableName) => [
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
    throw new SufficiencyAssessmentProviderCallError();
  }
  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

export async function runSufficiencyAssessmentDecision(
  input: RunSufficiencyAssessmentDecisionInput,
): Promise<SufficiencyAssessmentDecision> {
  const runtimeOwnedW5 = readBoundedEvidenceExtractionRuntimeOwnedDecision(
    input.boundedEvidenceExtraction,
  );

  if (!input.sufficiencyIntake || !runtimeOwnedW5) {
    const decision = await runSufficiencyAssessmentRuntime({
      context: input.context,
      sufficiencyIntake: input.sufficiencyIntake,
      boundedEvidenceExtraction: runtimeOwnedW5,
      renderedPrompt: "",
      promptContentHash: "",
      configSnapshotHash: buildConfigSnapshotHash(input.context),
      providerCall: (request) => executeAnthropicProviderCall({
        request,
        context: input.context,
        startedAt: Date.now(),
      }),
      providerCallbackCreated: true,
      providerSdkLoaded: true,
    });
    return markSufficiencyAssessmentRuntimeOwnedDecision(decision);
  }

  const renderedPrompt = await loadAndRenderPrompt(buildPromptVariables({
    context: input.context,
    sufficiencyIntake: input.sufficiencyIntake,
    boundedEvidenceExtraction: runtimeOwnedW5,
  }));
  const providerCall = async (
    request: SufficiencyAssessmentProviderCallRequest,
  ): Promise<SufficiencyAssessmentProviderCallResponse> => executeAnthropicProviderCall({
    request,
    context: input.context,
    startedAt: Date.now(),
  });
  const decision = await runSufficiencyAssessmentRuntime({
    context: input.context,
    sufficiencyIntake: input.sufficiencyIntake,
    boundedEvidenceExtraction: runtimeOwnedW5,
    renderedPrompt: renderedPrompt.renderedPrompt,
    promptContentHash: renderedPrompt.promptContentHash,
    configSnapshotHash: buildConfigSnapshotHash(input.context),
    providerCall,
    providerCallbackCreated: true,
    providerSdkLoaded: true,
  });

  return markSufficiencyAssessmentRuntimeOwnedDecision(decision);
}
