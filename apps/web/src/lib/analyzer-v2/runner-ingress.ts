import { isShellOnlyPlaceholderClaimId } from "@/lib/analyzer-v2/claim-understanding/types";
import type {
  ClaimBoundaryV2Ingress,
  ClaimBoundaryV2SubmittedInput,
} from "@/lib/analyzer-v2/pipeline-input";
import { isRecord, readOptionalString } from "@/lib/analyzer-v2/util";

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

  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      continue;
    }

    const claimId = candidate.trim();
    if (claimId.length === 0) {
      continue;
    }

    if (isShellOnlyPlaceholderClaimId(claimId)) {
      throw new Error("Analyzer V2 runner boundary rejects shell-only placeholder selected claim IDs.");
    }

    if (!seen.has(claimId)) {
      normalized.push(claimId);
      seen.add(claimId);
    }
  }

  return normalized;
}

function readPreparedSeed(input: Record<string, unknown>): ClaimBoundaryV2Ingress["preparedSeed"] {
  if (!isRecord(input.preparedStage1)) {
    return null;
  }

  return {
    acsSnapshot: input.preparedStage1,
  };
}

export function normalizeClaimBoundaryV2IngressFromRunner(input: unknown): ClaimBoundaryV2Ingress {
  if (!isRecord(input)) {
    throw new Error("Analyzer V2 runner boundary requires an input object.");
  }

  const runnerEventSink = input.onEvent;

  return {
    runIdHint: readOptionalString(input.jobId),
    submitted: {
      kind: readInputKind(input.inputType),
      value: readRequiredString(input.inputValue, "input value"),
    },
    preparedSeed: readPreparedSeed(input),
    selectedAtomicClaimIds: readSelectedAtomicClaimIds(input.selectedClaimIds),
    emitProgress: typeof runnerEventSink === "function"
      ? (event) => Promise.resolve(runnerEventSink(event.message, event.progress))
      : undefined,
  };
}
