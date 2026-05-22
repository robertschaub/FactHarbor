import {
  buildClaimUnderstandingStageHandoff,
  claimPreparationEnvelopeDiagnosticsFromHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import { buildEvidenceQueryPlanningPreexecutionObservation } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation";
import { buildEvidenceQueryPlanningInspection } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/inspection";
import { runEvidenceQueryPlanningRuntime } from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime";
import { buildQueryPlanSourceAcquisitionHandoff } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import { buildSourceAcquisitionCandidateRuntimeAdmissionDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-admission";
import { runSourceAcquisitionCandidateRuntimeClosedLoop } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop";
import { runSourceAcquisitionCandidateProviderNetworkLoop } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import { buildSourceAcquisitionIntakeBoundaryDecision } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import { buildSourceAcquisitionRequest } from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/request";
import { runClaimUnderstandingRuntimeStage } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildEvidenceLifecycleSourceCandidatePreviewDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-owner";
import { runEvidenceLifecycleSourceMaterialPageSummaryDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner";
import {
  buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-source-material-admission-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusShellDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-shell-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-extraction-readiness-denial-owner";
import {
  buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-authorization-owner";
import {
  buildEvidenceLifecycleExtractionInputAuthorizationDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-owner";
import {
  buildEvidenceLifecycleExecutionReadinessDenialDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-owner";
import {
  runBoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner";
import {
  buildEvidenceItemHandoffDecision,
  type EvidenceItemHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  buildSufficiencyIntakeDecision,
  type SufficiencyIntakeDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";
import {
  buildBoundaryVerdictCandidateDecision,
  type BoundaryVerdictCandidateDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-candidate";
import {
  buildInternalAlphaReportStopCandidate,
  type InternalAlphaReportStopCandidate,
} from "@/lib/analyzer-v2/evidence-lifecycle/report-result/report-stop-candidate";
import {
  runSufficiencyAssessmentDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-sufficiency-assessment-owner";
import {
  runBoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner";
import {
  buildClaimBoundaryV2RunContext,
  type BuildClaimBoundaryV2RunContextOptions,
  QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID,
} from "@/lib/analyzer-v2/run-context";
import type {
  BoundedEvidenceExtractionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction";
import type {
  BoundaryVerdictExecutionDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution";
import type {
  SufficiencyAssessmentDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment";
import type { SourceCandidatePreviewProjection } from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import type { SourceMaterialPageSummaryFetchLocator } from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import type { SourceMaterialPageSummaryRecord } from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material";
import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import type { ClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import type {
  BoundedEvidenceExtractionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink";
import { buildClaimUnderstandingRuntimeActivation } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-activation";
import { createClaimUnderstandingRuntimeInMemoryArtifactSink } from "@/lib/analyzer-v2-runtime/claim-understanding-runtime-artifact-sink";
import { recordEvidenceLifecycleIntakeRuntimeArtifact } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";
import {
  recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink";
import { buildEvidenceQueryPlanningProviderFactory } from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-factory";
import {
  buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot,
  EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE,
} from "@/lib/analyzer-v2-runtime/evidence-query-planning-provider-runtime-config.contract";
import {
  recordEvidenceQueryPlanningRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink";
import {
  recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink";
import {
  recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-admission-artifact-sink";
import {
  recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-closed-loop-artifact-sink";
import {
  recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink";
import {
  recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-candidate-preview-artifact-sink";
import {
  recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-artifact-sink";
import {
  recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-evidence-corpus-readiness-artifact-sink";
import {
  recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-observability-artifact-sink";
import {
  recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-evidence-corpus-bounded-text-artifact-sink";
import {
  recordEvidenceLifecycleExtractionInputRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-artifact-sink";
import {
  recordEvidenceLifecycleExecutionReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink";
import {
  recordBoundedEvidenceExtractionRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-artifact-sink";
import {
  recordInternalAlphaReportResultRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink";
import {
  recordInternalAlphaReportDraftRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink";
import {
  runInternalReportWriterDecision,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-owner";
import {
  recordInternalReportWriterRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-report-writer-artifact-sink";

export type RunClaimBoundaryPipelineV2Options = BuildClaimBoundaryV2RunContextOptions;

function queryPlanningActivationIsOpen(context: ReturnType<typeof buildClaimBoundaryV2RunContext>): boolean {
  const activation = context.queryPlanningRuntimeActivation;
  return activation.status === "enabled_hidden_direct_text"
    && activation.source === "v2_task_policy_snapshot"
    && activation.suppliedBy === "product_owned_activation_authority"
    && activation.freezeLocation === "pipeline_run_context"
    && activation.activationProfileId === QUERY_PLANNING_RUNTIME_ACTIVATION_PROFILE_ID
    && activation.approvalPointer.sourcePackage === EVIDENCE_QUERY_PLANNING_PROVIDER_RUNTIME_SOURCE_PACKAGE
    && activation.activationSnapshotHash.trim().length > 0
    && activation.configProfileHash.trim().length > 0
    && activation.hiddenArtifactSink.kind === "v2_evidence_query_planning_runtime_artifact_ledger"
    && activation.hiddenArtifactSink.visibility === "internal_admin_only"
    && activation.hiddenArtifactSink.publicPointerExposure === "forbidden";
}

function boundedEvidenceExtractionAcceptedForProductChain(
  boundedEvidenceExtraction: BoundedEvidenceExtractionDecision,
  artifact: BoundedEvidenceExtractionRuntimeArtifact | null,
): artifact is BoundedEvidenceExtractionRuntimeArtifact {
  return artifact !== null &&
    artifact.boundedEvidenceExtraction === boundedEvidenceExtraction &&
    boundedEvidenceExtraction.status === "hidden_evidence_item_extraction_completed" &&
    boundedEvidenceExtraction.extractionResultStatus === "accepted" &&
    boundedEvidenceExtraction.extractionStatus === "evidence_extracted" &&
    boundedEvidenceExtraction.extractionResult?.status === "accepted";
}

async function emit(input: ClaimBoundaryV2Ingress, message: string, progress: number): Promise<void> {
  await Promise.resolve(input.emitProgress?.({ message, progress }));
}

export async function runClaimBoundaryPipelineV2(
  input: ClaimBoundaryV2Ingress,
  options: RunClaimBoundaryPipelineV2Options = {},
): Promise<ClaimBoundaryV2Envelope> {
  await emit(input, "Analyzer V2 orchestrator initialized.", 8);

  const context = buildClaimBoundaryV2RunContext(input, options);
  let adminReportMarkdown: string | null = null;
  const claimUnderstandingActivation = buildClaimUnderstandingRuntimeActivation(
    context,
    {
      artifactSink: createClaimUnderstandingRuntimeInMemoryArtifactSink(context.observabilityLedger.ledgerId),
    },
  );
  const claimUnderstandingState = await runClaimUnderstandingRuntimeStage(
    input,
    context,
    { activation: claimUnderstandingActivation },
  );
  const claimUnderstandingHandoff = buildClaimUnderstandingStageHandoff(context, claimUnderstandingState);
  const evidenceLifecycleIntake = buildEvidenceLifecycleIntake(context, claimUnderstandingHandoff);
  try {
    recordEvidenceLifecycleIntakeRuntimeArtifact({
      context,
      claimUnderstandingHandoff,
      evidenceLifecycleIntake,
    });
  } catch {
    // X7-J observability must never affect the public damaged/precutover envelope.
  }
  const queryPlanningPreexecutionObservation =
    buildEvidenceQueryPlanningPreexecutionObservation(evidenceLifecycleIntake);
  try {
    recordEvidenceQueryPlanningPreexecutionObservationRuntimeArtifact({
      ledgerId: context.observabilityLedger.ledgerId,
      runId: context.runId,
      createdUtc: context.generatedUtc,
      observation: queryPlanningPreexecutionObservation,
    });
  } catch {
    // X7-O observability must never affect the public damaged/precutover envelope.
  }
  if (
    queryPlanningActivationIsOpen(context)
    && claimUnderstandingHandoff.status === "accepted"
    && queryPlanningPreexecutionObservation.status === "structural_prerequisites_observed_not_executed_precutover"
  ) {
    try {
      const runtimeConfigSnapshot = buildEvidenceQueryPlanningProviderRuntimeConfigSnapshot(context);
      if (runtimeConfigSnapshot) {
        const providerFactory = buildEvidenceQueryPlanningProviderFactory(runtimeConfigSnapshot);
        const selectedAtomicClaimIds = claimUnderstandingHandoff.claimContract.input.selectedAtomicClaimIds;
        const runtimeResult = await runEvidenceQueryPlanningRuntime({
          claimContract: claimUnderstandingHandoff.claimContract,
          selectedAtomicClaimIds,
          currentDate: context.currentDate,
          configSnapshotHash: providerFactory.configSnapshotHash,
          providerId: providerFactory.providerId,
          modelId: providerFactory.modelId,
          providerCall: providerFactory.providerCall,
        });
        const inspection = buildEvidenceQueryPlanningInspection({
          runtimeResult,
          selectedAtomicClaimIds,
          selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
        });
        const sourceAcquisitionHandoff = buildQueryPlanSourceAcquisitionHandoff({
          runtimeResult,
          selectedAtomicClaimIds,
          selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
        });
        recordEvidenceQueryPlanningRuntimeArtifact({
          context,
          runtimeResult,
          inspection,
          sourceAcquisitionHandoff,
        });
        const sourceAcquisitionStartDecision = buildSourceAcquisitionRequest(evidenceLifecycleIntake);
        const sourceAcquisitionIntakeBoundary = buildSourceAcquisitionIntakeBoundaryDecision({
          handoffDecision: sourceAcquisitionHandoff,
          sourceAcquisitionStartDecision,
        });
        recordEvidenceLifecycleSourceAcquisitionIntakeRuntimeArtifact({
          context,
          intakeBoundary: sourceAcquisitionIntakeBoundary,
        });
        const candidateRuntimeAdmission = buildSourceAcquisitionCandidateRuntimeAdmissionDecision({
          handoffDecision: sourceAcquisitionHandoff,
          sourceAcquisitionStartDecision: sourceAcquisitionStartDecision,
          sourceAcquisitionIntakeBoundary,
        });
        recordEvidenceLifecycleSourceAcquisitionCandidateAdmissionRuntimeArtifact({
          context,
          admissionDecision: candidateRuntimeAdmission,
        });
        const candidateRuntimeClosedLoop = await runSourceAcquisitionCandidateRuntimeClosedLoop({
          handoffDecision: sourceAcquisitionHandoff,
          sourceAcquisitionStartDecision,
          sourceAcquisitionIntakeBoundary,
          candidateRuntimeAdmission,
        });
        recordEvidenceLifecycleSourceAcquisitionCandidateClosedLoopRuntimeArtifact({
          context,
          closedLoopDecision: candidateRuntimeClosedLoop,
        });
        const sourceCandidatePreviewProjections: SourceCandidatePreviewProjection[] = [];
        const sourceMaterialPageSummaryFetchLocators: SourceMaterialPageSummaryFetchLocator[] = [];
        const openAlexSourceMaterialRecords: SourceMaterialPageSummaryRecord[] = [];
        const webSearchPreviewSourceMaterialRecords: SourceMaterialPageSummaryRecord[] = [];
        const candidateProviderNetwork = await runSourceAcquisitionCandidateProviderNetworkLoop({
          handoffDecision: sourceAcquisitionHandoff,
          sourceAcquisitionStartDecision,
          sourceAcquisitionIntakeBoundary,
          candidateRuntimeClosedLoop,
          candidatePreviewProjectionSink: (projection) => sourceCandidatePreviewProjections.push(projection),
          sourceMaterialPageSummaryFetchLocatorSink: (locator) =>
            sourceMaterialPageSummaryFetchLocators.push(locator),
          openAlexSourceMaterialRecordSink: (record) => openAlexSourceMaterialRecords.push(record),
          webSearchPreviewSourceMaterialRecordSink: (record) =>
            webSearchPreviewSourceMaterialRecords.push(record),
        });
        recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
          context,
          networkDecision: candidateProviderNetwork,
        });
        const sourceCandidatePreview = buildEvidenceLifecycleSourceCandidatePreviewDecision({
          networkDecision: candidateProviderNetwork,
          previewProjections: sourceCandidatePreviewProjections,
        });
        recordEvidenceLifecycleSourceCandidatePreviewRuntimeArtifact({
          context,
          previewDecision: sourceCandidatePreview,
        });
        const sourceMaterialPageSummary = await runEvidenceLifecycleSourceMaterialPageSummaryDecision({
          networkDecision: candidateProviderNetwork,
          previewDecision: sourceCandidatePreview,
          fetchLocators: sourceMaterialPageSummaryFetchLocators,
          openAlexSourceMaterialRecords,
          webSearchPreviewSourceMaterialRecords,
        });
        recordEvidenceLifecycleSourceMaterialPageSummaryRuntimeArtifact({
          context,
          decision: sourceMaterialPageSummary,
        });
        const sourceMaterialEvidenceCorpusReadiness =
          buildEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessDecision({
            sourceMaterialPageSummary,
          });
        recordEvidenceLifecycleSourceMaterialEvidenceCorpusReadinessRuntimeArtifact({
          context,
          readinessDecision: sourceMaterialEvidenceCorpusReadiness,
        });
        const evidenceCorpusSourceMaterialAdmission =
          buildEvidenceLifecycleEvidenceCorpusSourceMaterialAdmissionDecision({
            sourceMaterialReadiness: sourceMaterialEvidenceCorpusReadiness,
          });
        const evidenceCorpusShell = buildEvidenceLifecycleEvidenceCorpusShellDecision({
          sourceMaterialAdmission: evidenceCorpusSourceMaterialAdmission,
        });
        const evidenceCorpusExtractionReadinessDenial =
          buildEvidenceLifecycleEvidenceCorpusExtractionReadinessDenialDecision({
            evidenceCorpusShell,
          });
        recordEvidenceLifecycleEvidenceCorpusObservabilityRuntimeArtifact({
          context,
          sourceMaterialAdmission: evidenceCorpusSourceMaterialAdmission,
          evidenceCorpusShell,
          extractionReadinessDenial: evidenceCorpusExtractionReadinessDenial,
        });
        const evidenceCorpusBoundedTextAuthorization =
          buildEvidenceLifecycleEvidenceCorpusBoundedTextAuthorizationDecision({
            sourceMaterialPageSummary,
            sourceMaterialAdmission: evidenceCorpusSourceMaterialAdmission,
            evidenceCorpusShell,
            extractionReadinessDenial: evidenceCorpusExtractionReadinessDenial,
          });
        recordEvidenceLifecycleEvidenceCorpusBoundedTextRuntimeArtifact({
          context,
          boundedTextAuthorization: evidenceCorpusBoundedTextAuthorization,
        });
        const extractionInputAuthorization = buildEvidenceLifecycleExtractionInputAuthorizationDecision({
          boundedTextAuthorization: evidenceCorpusBoundedTextAuthorization,
        });
        recordEvidenceLifecycleExtractionInputRuntimeArtifact({
          context,
          extractionInputAuthorization,
        });
        const executionReadinessDenial = buildEvidenceLifecycleExecutionReadinessDenialDecision({
          extractionInputAuthorization,
        });
        recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
          context,
          executionReadinessDenial,
        });
        const boundedEvidenceExtraction = await runBoundedEvidenceExtractionDecision({
          context,
          claimContract: claimUnderstandingHandoff.claimContract,
          extractionInputAuthorization,
          executionReadinessDenial,
        });
        const boundedEvidenceExtractionArtifact = recordBoundedEvidenceExtractionRuntimeArtifact({
          context,
          boundedEvidenceExtraction,
        });
        if (
          boundedEvidenceExtractionAcceptedForProductChain(
            boundedEvidenceExtraction,
            boundedEvidenceExtractionArtifact,
          )
        ) {
          let evidenceItemHandoff: EvidenceItemHandoffDecision | null = null;
          let sufficiencyIntake: SufficiencyIntakeDecision | null = null;
          let sufficiencyAssessment: SufficiencyAssessmentDecision | null = null;
          let boundaryVerdictCandidate: BoundaryVerdictCandidateDecision | null = null;
          let internalAlphaReportStop: InternalAlphaReportStopCandidate | null = null;
          let boundaryVerdictExecution: BoundaryVerdictExecutionDecision | null = null;

          try {
            evidenceItemHandoff = buildEvidenceItemHandoffDecision({
              boundedEvidenceExtraction,
              boundedEvidenceItemAdmission: boundedEvidenceExtractionArtifact.boundedEvidenceItemAdmission,
            });
            sufficiencyIntake = buildSufficiencyIntakeDecision(evidenceItemHandoff);
            sufficiencyAssessment = await runSufficiencyAssessmentDecision({
              context,
              sufficiencyIntake,
              boundedEvidenceExtraction,
            });
            boundaryVerdictCandidate = buildBoundaryVerdictCandidateDecision({
              evidenceItemHandoff,
              sufficiencyIntake,
              sufficiencyAssessment,
            });
            internalAlphaReportStop = buildInternalAlphaReportStopCandidate({
              evidenceItemHandoff,
              sufficiencyIntake,
              sufficiencyAssessment,
              boundaryVerdictCandidate,
            });
            boundaryVerdictExecution = await runBoundaryVerdictExecutionDecision({
              context,
              claimContract: claimUnderstandingHandoff.claimContract,
              boundedEvidenceExtraction,
              evidenceItemHandoff,
              sufficiencyIntake,
              sufficiencyAssessment,
              boundaryVerdictCandidate,
              internalAlphaReportStop,
            });
          } finally {
            const reportResultArtifact = recordInternalAlphaReportResultRuntimeArtifact({
              context,
              boundedEvidenceExtraction,
              evidenceItemHandoff,
              sufficiencyIntake,
              sufficiencyAssessment,
              boundaryVerdictCandidate,
              internalAlphaReportStop,
              boundaryVerdictExecution,
            });
            if (reportResultArtifact.status === "recorded") {
              recordInternalAlphaReportDraftRuntimeArtifact({
                context,
                internalAlphaReportResult: reportResultArtifact.artifact.internalAlphaReportResult,
                boundaryVerdictExecution,
              });
              const internalReportWriter = await runInternalReportWriterDecision({
                context,
                internalAlphaReportResult: reportResultArtifact.artifact.internalAlphaReportResult,
                boundaryVerdictExecution,
              });
              recordInternalReportWriterRuntimeArtifact({
                context,
                decision: internalReportWriter,
              });
              if (
                internalReportWriter.status === "internal_report_writer_draft_created" &&
                internalReportWriter.reportMarkdown
              ) {
                adminReportMarkdown = internalReportWriter.reportMarkdown;
              }
            }
          }
        }
      }
    } catch {
      // X7-S hidden runtime execution must never affect the public damaged/precutover envelope.
    }
  }
  const envelope = buildDamagedClaimBoundaryV2Envelope(
    context,
    claimPreparationEnvelopeDiagnosticsFromHandoff(claimUnderstandingHandoff),
    { adminReportMarkdown },
  );

  await emit(input, "Analyzer V2 damaged structural envelope generated.", 90);

  return envelope;
}
