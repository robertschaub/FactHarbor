import { describe, expect, it, vi } from "vitest";
import {
  AnalyzerV2ShellNotImplementedError,
  runClaimBoundaryV2Shell,
} from "@/lib/analyzer-v2/pipeline-shell";

describe("analyzer-v2 fail-fast shell", () => {
  it("emits a stable not-implemented failure instead of producing placeholder analysis", async () => {
    const onEvent = vi.fn();

    await expect(runClaimBoundaryV2Shell({
      jobId: "job-v2-shell",
      inputType: "text",
      inputValue: "Structural shell test input",
      onEvent,
    })).rejects.toBeInstanceOf(AnalyzerV2ShellNotImplementedError);

    await expect(runClaimBoundaryV2Shell({
      inputType: "text",
      inputValue: "Structural shell test input",
    })).rejects.toMatchObject({
      code: "ANALYZER_V2_SHELL_NOT_IMPLEMENTED",
      name: "AnalyzerV2ShellNotImplementedError",
    });
    expect(onEvent).toHaveBeenCalledWith("Analyzer V2 shell selected but not implemented.", 0);
  });
});
