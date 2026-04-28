export type PromptSurfaceManagement =
  | "manifest_backed_ucm"
  | "ucm"
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
    management: "manifest_backed_ucm",
    stability: "runtime_contract",
    adminEditable: true,
    reseedSupported: true,
    ucmProfile: "claimboundary",
    runtimeOwners: [
      "apps/web/src/lib/analyzer/prompt-loader.ts",
      "apps/web/src/lib/analyzer/claimboundary-pipeline.ts",
    ],
    sourcePaths: [
      "apps/web/prompts/claimboundary/manifest.json",
      "apps/web/prompts/claimboundary.prompt.md",
    ],
    notes:
      "Primary ClaimBoundary runtime prompt. Split source files assemble into one UCM composite blob.",
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
    notes:
      "UCM-backed source reliability enrichment sections loaded from the source-reliability prompt profile.",
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
    notes:
      "Current exception: core SR prompts are TypeScript builders, while enrichment uses UCM.",
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
    id: "inverse-claim-verification",
    label: "Inverse claim verification calibration helper",
    management: "disk_only_calibration",
    stability: "intentional_exception",
    adminEditable: false,
    reseedSupported: false,
    runtimeOwners: ["apps/web/src/lib/calibration/paired-job-audit.ts"],
    sourcePaths: ["apps/web/prompts/text-analysis/inverse-claim-verification.prompt.md"],
    notes:
      "Calibration-only helper loaded directly from disk by paired-job audit; not production analysis runtime.",
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
