export type PromptSurfaceManagement =
  | "ucm"
  | "db_only_legacy"
  | "inline_code"
  | "code_built"
  | "disk_only_calibration";

export type PromptSurfaceStability = "runtime_contract" | "intentional_exception";

export interface PromptSurfaceRegistryEntry {
  id: string;
  label: string;
  management: PromptSurfaceManagement;
  stability: PromptSurfaceStability;
  adminEditable: boolean;
  reseedSupported: boolean;
  runtimeOwners: string[];
  sourcePaths: string[];
  ucmProfile?: string;
  notes: string;
}

export const PROMPT_SURFACE_REGISTRY: PromptSurfaceRegistryEntry[] = [
  {
    id: "claimboundary",
    label: "ClaimBoundary pipeline",
    management: "ucm",
    stability: "runtime_contract",
    adminEditable: true,
    reseedSupported: true,
    ucmProfile: "claimboundary",
    runtimeOwners: [
      "apps/web/src/lib/analyzer/prompt-loader.ts",
      "apps/web/src/lib/analyzer/claimboundary-pipeline.ts",
    ],
    sourcePaths: ["apps/web/prompts/claimboundary.prompt.md"],
    notes: "Primary ClaimBoundary runtime prompt profile loaded through UCM.",
  },
  {
    id: "source-reliability-enrichment",
    label: "Source reliability evidence-quality enrichment",
    management: "ucm",
    stability: "runtime_contract",
    adminEditable: true,
    reseedSupported: true,
    ucmProfile: "source-reliability",
    runtimeOwners: [
      "apps/web/src/lib/source-reliability/sr-eval-enrichment.ts",
      "apps/web/src/lib/analyzer/prompt-loader.ts",
    ],
    sourcePaths: ["apps/web/prompts/source-reliability.prompt.md"],
    notes: "UCM-backed source reliability enrichment sections.",
  },
  {
    id: "source-reliability-core",
    label: "Source reliability core evaluation and refinement",
    management: "code_built",
    stability: "intentional_exception",
    adminEditable: false,
    reseedSupported: false,
    runtimeOwners: [
      "apps/web/src/lib/source-reliability/sr-eval-engine.ts",
      "apps/web/src/lib/source-reliability/sr-eval-prompts.ts",
    ],
    sourcePaths: ["apps/web/src/lib/source-reliability/sr-eval-prompts.ts"],
    notes: "Current exception: core source-reliability prompts are TypeScript builders.",
  },
  {
    id: "input-policy-gate",
    label: "Input policy gate",
    management: "ucm",
    stability: "runtime_contract",
    adminEditable: true,
    reseedSupported: true,
    ucmProfile: "input-policy-gate",
    runtimeOwners: ["apps/web/src/lib/input-policy-gate.ts"],
    sourcePaths: ["apps/web/prompts/input-policy-gate.prompt.md"],
    notes: "Pre-pipeline semantic policy gate prompt loaded through UCM.",
  },
  {
    id: "grounding-check-legacy",
    label: "Grounding check legacy profile",
    management: "db_only_legacy",
    stability: "intentional_exception",
    adminEditable: true,
    reseedSupported: false,
    ucmProfile: "orchestrated",
    runtimeOwners: ["apps/web/src/lib/analyzer/grounding-check.ts"],
    sourcePaths: [],
    notes:
      "Current exception: grounding checks load DB-only legacy orchestrated profile sections; no removed pipeline prompt file is reintroduced.",
  },
  {
    id: "claimboundary-pass2-inline-framing",
    label: "ClaimBoundary Pass 2 inline framing",
    management: "inline_code",
    stability: "intentional_exception",
    adminEditable: false,
    reseedSupported: false,
    runtimeOwners: ["apps/web/src/lib/analyzer/claim-extraction-stage.ts"],
    sourcePaths: ["apps/web/src/lib/analyzer/claim-extraction-stage.ts"],
    notes:
      "Current exception: Stage 1 Pass 2 appends model-facing framing and retry/language directives in code around UCM sections.",
  },
  {
    id: "source-reliability-evidence-pack-inline",
    label: "Source reliability evidence-pack language helpers",
    management: "inline_code",
    stability: "intentional_exception",
    adminEditable: false,
    reseedSupported: false,
    runtimeOwners: ["apps/web/src/lib/source-reliability/sr-eval-evidence-pack.ts"],
    sourcePaths: ["apps/web/src/lib/source-reliability/sr-eval-evidence-pack.ts"],
    notes:
      "Current exception: source-reliability evidence-pack language helpers build model-facing prompt text in code.",
  },
  {
    id: "inverse-claim-verification",
    label: "Inverse claim verification calibration helper",
    management: "disk_only_calibration",
    stability: "intentional_exception",
    adminEditable: false,
    reseedSupported: false,
    runtimeOwners: ["apps/web/src/lib/calibration/paired-job-audit.ts"],
    sourcePaths: ["apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md"],
    notes: "Calibration-only helper loaded from disk by paired-job audit.",
  },
];

function clonePromptSurfaceEntry(entry: PromptSurfaceRegistryEntry): PromptSurfaceRegistryEntry {
  return {
    ...entry,
    runtimeOwners: [...entry.runtimeOwners],
    sourcePaths: [...entry.sourcePaths],
  };
}

export function listPromptSurfaceRegistry(): PromptSurfaceRegistryEntry[] {
  return PROMPT_SURFACE_REGISTRY.map(clonePromptSurfaceEntry);
}

export function getPromptSurfaceRegistryEntry(id: string): PromptSurfaceRegistryEntry | null {
  const entry = PROMPT_SURFACE_REGISTRY.find((candidate) => candidate.id === id);
  return entry ? clonePromptSurfaceEntry(entry) : null;
}

export function listPromptSurfaceExceptions(): PromptSurfaceRegistryEntry[] {
  return PROMPT_SURFACE_REGISTRY.filter(
    (entry) => entry.stability === "intentional_exception",
  ).map(clonePromptSurfaceEntry);
}
