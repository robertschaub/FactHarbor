import type { ClaimBoundaryV2Ingress } from "@/lib/analyzer-v2/pipeline-input";

export type ClaimBoundaryV2RunContext = {
  runId: string;
  inputType: ClaimBoundaryV2Ingress["submitted"]["kind"];
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
  input: ClaimBoundaryV2Ingress,
  options: BuildClaimBoundaryV2RunContextOptions = {},
): ClaimBoundaryV2RunContext {
  const now = options.now?.() ?? new Date();
  const generatedUtc = now.toISOString();
  const selectedAtomicClaimIds = normalizeSelectedClaimIds(input.selectedAtomicClaimIds);
  const fallbackClaimId = "AC_V2_SHELL_01";
  const inputValue = firstNonBlank(input.submitted.value);
  const resolvedInputText = firstNonBlank(
    typeof input.preparedSeed?.resolvedText === "string" ? input.preparedSeed.resolvedText : undefined,
    inputValue,
  );

  return {
    runId: input.runIdHint || `v2-shell-${generatedUtc}`,
    inputType: input.submitted.kind,
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
