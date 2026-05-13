import type { AnalysisInput } from "@/lib/analyzer/types";

export type ClaimBoundaryV2RunContext = {
  runId: string;
  inputType: AnalysisInput["inputType"];
  inputValue: string;
  resolvedInputText: string;
  detectedLanguage: "und";
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

function firstNonBlank(...values: Array<string | undefined>): string {
  const value = values.find((candidate) => typeof candidate === "string" && candidate.trim().length > 0);
  if (!value) {
    throw new Error("Analyzer V2 run context requires a non-empty input value.");
  }
  return value;
}

export function buildClaimBoundaryV2RunContext(
  input: AnalysisInput,
  options: BuildClaimBoundaryV2RunContextOptions = {},
): ClaimBoundaryV2RunContext {
  const now = options.now?.() ?? new Date();
  const generatedUtc = now.toISOString();
  const selectedAtomicClaimIds = normalizeSelectedClaimIds(input.selectedClaimIds);
  const fallbackClaimId = "AC_V2_SHELL_01";
  const inputValue = firstNonBlank(input.inputValue);
  const resolvedInputText = firstNonBlank(input.preparedStage1?.resolvedInputText, inputValue);

  return {
    runId: input.jobId?.trim() || `v2-shell-${generatedUtc}`,
    inputType: input.inputType,
    inputValue,
    resolvedInputText,
    detectedLanguage: "und",
    selectedAtomicClaimIds: selectedAtomicClaimIds.length > 0
      ? selectedAtomicClaimIds
      : [fallbackClaimId],
    generatedUtc,
    currentDate: generatedUtc.slice(0, 10),
  };
}
