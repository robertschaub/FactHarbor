import type {
  AnalyzerV2GatewayTaskId,
  AnalyzerV2SurfaceClassification,
} from "@/lib/analyzer-v2/gateway/types";

export type AnalyzerV2SurfaceLedgerEntry = {
  surfaceId: string;
  classification: AnalyzerV2SurfaceClassification;
  verifier: string;
  requiresDeputyApprovalForRemoval: boolean;
  v1StageId?: string;
  v1File?: string;
  v2TaskIds?: readonly AnalyzerV2GatewayTaskId[];
  notes: string;
};

export const ANALYZER_V2_SURFACE_LEDGER = [
  {
    surfaceId: "v1.stage.claim_extraction",
    v1StageId: "claim_extraction",
    v1File: "apps/web/src/lib/analyzer/claim-extraction-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["claim_understanding_gate1", "evidence_extraction"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 must replace claim understanding, Gate 1, and preliminary extraction responsibilities before V1 removal.",
  },
  {
    surfaceId: "v1.stage.research_query",
    v1StageId: "research_query",
    v1File: "apps/web/src/lib/analyzer/research-query-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["evidence_query_planning"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 query planning must own provider-facing query construction through approved prompts.",
  },
  {
    surfaceId: "v1.stage.research_acquisition",
    v1StageId: "research_acquisition",
    v1File: "apps/web/src/lib/analyzer/research-acquisition-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["research_acquisition"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 acquisition should stay an adapter boundary and must not reinterpret verdict or evidence meaning.",
  },
  {
    surfaceId: "v1.stage.research_extraction",
    v1StageId: "research_extraction",
    v1File: "apps/web/src/lib/analyzer/research-extraction-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["evidence_applicability", "evidence_extraction", "evidence_sufficiency"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 evidence lifecycle must replace relevance, applicability, extraction, and evidence-scope contracts.",
  },
  {
    surfaceId: "v1.stage.boundary_clustering",
    v1StageId: "boundary_clustering",
    v1File: "apps/web/src/lib/analyzer/boundary-clustering-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["boundary_clustering", "boundary_verdict_execution"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 must preserve evidence-emergent ClaimAssessmentBoundary semantics.",
  },
  {
    surfaceId: "v1.stage.verdict_generation",
    v1StageId: "verdict_generation",
    v1File: "apps/web/src/lib/analyzer/verdict-generation-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["boundary_verdict_execution", "verdict_debate", "verdict_validation"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 must move provider retries and model policy into gateway-owned contracts.",
  },
  {
    surfaceId: "v1.stage.verdict",
    v1StageId: "verdict",
    v1File: "apps/web/src/lib/analyzer/verdict-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["boundary_verdict_execution", "verdict_debate", "verdict_validation"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 must preserve debate, citation integrity, grounding, and baseless-challenge policy before replacement.",
  },
  {
    surfaceId: "v1.stage.aggregation",
    v1StageId: "aggregation",
    v1File: "apps/web/src/lib/analyzer/aggregation-stage.ts",
    classification: "owned_for_v2",
    v2TaskIds: ["aggregation_narrative"],
    verifier: "Docs/AGENTS/index/stage-map.json",
    requiresDeputyApprovalForRemoval: true,
    notes: "V2 must preserve aggregation, quality gates, and report narrative contracts before V1 removal.",
  },
  {
    surfaceId: "prompt.claimboundary.CLAIM_GROUPING",
    classification: "quarantine_candidate",
    verifier: "Docs/WIP/2026-05-12_Pipeline_Rebuild_Phase2_Prompt_Config_Model_Baseline.md",
    requiresDeputyApprovalForRemoval: true,
    notes: "Baseline classifies CLAIM_GROUPING as orphan/stale candidate until a real V2 caller is proven.",
  },
  {
    surfaceId: "prompt.profile.orchestrated",
    classification: "quarantine_candidate",
    verifier: "apps/web/prompts/README.md",
    requiresDeputyApprovalForRemoval: true,
    notes: "DB-only legacy profile still backs grounding-check sections; candidate only until those calls migrate.",
  },
  {
    surfaceId: "model.helper.model-tiering",
    classification: "quarantine_candidate",
    verifier: "target-spec Section 13 quarantine list",
    requiresDeputyApprovalForRemoval: true,
    notes: "Legacy helper still serves non-pipeline callers; do not remove until model resolver ownership is explicit.",
  },
  {
    surfaceId: "config.pipeline.duplicate_or_weak_knobs",
    classification: "defer",
    verifier: "target-spec Section 13 quarantine list",
    requiresDeputyApprovalForRemoval: true,
    notes: "Detect duplicate/dead knobs in a later config-contract slice; do not edit defaults in this slice.",
  },
  {
    surfaceId: "runtime.callsite.hardcoded_model_parameters",
    classification: "defer",
    verifier: "target-spec Section 13 quarantine list",
    requiresDeputyApprovalForRemoval: true,
    notes: "Hardcoded temperatures, token budgets, and timeouts must move behind model policy in later runtime slices.",
  },
] as const satisfies readonly AnalyzerV2SurfaceLedgerEntry[];

export function getAnalyzerV2SurfaceLedgerEntry(surfaceId: string): AnalyzerV2SurfaceLedgerEntry {
  const found = ANALYZER_V2_SURFACE_LEDGER.find((entry) => entry.surfaceId === surfaceId);
  if (!found) {
    throw new Error(`Unknown Analyzer V2 surface ledger entry: ${surfaceId}`);
  }
  return found;
}
