import type { AnalysisInput } from "@/lib/analyzer/types";

export class AnalyzerV2ShellNotImplementedError extends Error {
  readonly code = "ANALYZER_V2_SHELL_NOT_IMPLEMENTED";

  constructor() {
    super(
      "ANALYZER_V2_SHELL_NOT_IMPLEMENTED: Analyzer V2 shell is selected, but no V2 implementation is available yet.",
    );
    this.name = "AnalyzerV2ShellNotImplementedError";
  }
}

export async function runClaimBoundaryV2Shell(
  input: AnalysisInput,
): Promise<{ resultJson: any; reportMarkdown: string }> {
  input.onEvent?.("Analyzer V2 shell selected but not implemented.", 0);
  throw new AnalyzerV2ShellNotImplementedError();
}
