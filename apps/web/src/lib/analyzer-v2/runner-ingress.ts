import type {
  ClaimBoundaryV2Ingress,
  ClaimBoundaryV2SubmittedInput,
} from "@/lib/analyzer-v2/pipeline-input";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readInputKind(value: unknown): ClaimBoundaryV2SubmittedInput["kind"] {
  if (value === "text" || value === "url") {
    return value;
  }
  throw new Error("Analyzer V2 runner boundary requires input kind text or url.");
}

function readRequiredString(value: unknown, fieldName: string): string {
  const text = readOptionalString(value);
  if (!text) {
    throw new Error(`Analyzer V2 runner boundary requires non-empty ${fieldName}.`);
  }
  return text;
}

function readSelectedAtomicClaimIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = value
    .filter((claimId): claimId is string => typeof claimId === "string")
    .map((claimId) => claimId.trim())
    .filter((claimId) => claimId.length > 0);
  return Array.from(new Set(normalized));
}

export function normalizeClaimBoundaryV2IngressFromRunner(input: unknown): ClaimBoundaryV2Ingress {
  if (!isRecord(input)) {
    throw new Error("Analyzer V2 runner boundary requires an input object.");
  }

  const preparedSeed = isRecord(input.preparedStage1)
    ? {
      acsSnapshot: input.preparedStage1,
      acsSnapshotHash: isRecord(input.preparedStage1.preparationProvenance)
        ? input.preparedStage1.preparationProvenance.resolvedInputSha256
        : undefined,
    }
    : null;
  const runnerEventSink = input.onEvent;

  return {
    runIdHint: readOptionalString(input.jobId),
    submitted: {
      kind: readInputKind(input.inputType),
      value: readRequiredString(input.inputValue, "input value"),
    },
    preparedSeed,
    selectedAtomicClaimIds: readSelectedAtomicClaimIds(input.selectedClaimIds),
    emitProgress: typeof runnerEventSink === "function"
      ? (event) => Promise.resolve(runnerEventSink(event.message, event.progress))
      : undefined,
  };
}
