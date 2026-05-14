import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";
import { isRecord, readAcsResolvedInputText } from "@/lib/analyzer-v2/util";

export type ClaimBoundaryV2RunContext = {
  runId: string;
  inputType: ClaimBoundaryV2Ingress["submitted"]["kind"];
  inputValue: string;
  resolvedInputText: string;
  detectedLanguage: string;
  selectedAtomicClaimIds: string[];
  generatedUtc: string;
  currentDate: string;
};

export type BuildClaimBoundaryV2RunContextOptions = {
  now?: () => Date;
};

function normalizeSelectedClaimIds(selectedClaimIds: string[] | undefined): string[] {
  const normalized = (selectedClaimIds ?? [])
    .map((claimId) => claimId.trim())
    .filter((claimId) => claimId.length > 0);
  return Array.from(new Set(normalized));
}

function firstNonBlank(...values: Array<string | null | undefined>): string {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  if (!value) {
    throw new Error("Analyzer V2 run context requires a non-empty input value.");
  }
  return value;
}

function readAcsDetectedLanguage(input: ClaimBoundaryV2Ingress): string {
  const snapshot = input.preparedSeed?.acsSnapshot;
  const preparedUnderstanding = isRecord(snapshot)
    && isRecord(snapshot.preparedUnderstanding)
    ? snapshot.preparedUnderstanding
    : null;
  const detectedLanguage = preparedUnderstanding?.detectedLanguage;

  return typeof detectedLanguage === "string" && detectedLanguage.trim().length > 0
    ? detectedLanguage
    : "und";
}

export function buildClaimBoundaryV2RunContext(
  input: ClaimBoundaryV2Ingress,
  options: BuildClaimBoundaryV2RunContextOptions = {},
): ClaimBoundaryV2RunContext {
  const now = options.now?.() ?? new Date();
  const generatedUtc = now.toISOString();
  const selectedAtomicClaimIds = normalizeSelectedClaimIds(input.selectedAtomicClaimIds);
  const inputValue = firstNonBlank(input.submitted.value);
  const resolvedInputText = firstNonBlank(
    readAcsResolvedInputText(input),
    inputValue,
  );

  return {
    runId: input.runIdHint || `v2-shell-${generatedUtc}`,
    inputType: input.submitted.kind,
    inputValue,
    resolvedInputText,
    detectedLanguage: readAcsDetectedLanguage(input),
    selectedAtomicClaimIds,
    generatedUtc,
    currentDate: generatedUtc.slice(0, 10),
  };
}
