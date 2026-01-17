/**
 * Monolithic Canonical Pipeline (PR 3 - Placeholder)
 *
 * This module will implement a single-context AI SDK tool loop that produces
 * output conforming to the canonical FactHarbor schema.
 *
 * Key features (to be implemented):
 * - AI SDK generateText with tool loop
 * - Budget enforcement (maxSteps, maxSearches, timeout)
 * - Context compression after N tool calls
 * - Canonical schema validation
 * - Fallback to orchestrated on failure
 */

export type MonolithicAnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void | Promise<void>;
  jobId?: string;
};

/**
 * Run fact-check analysis using a monolithic tool loop with canonical schema output.
 *
 * Currently throws "not implemented" to trigger fallback to orchestrated pipeline.
 */
export async function runMonolithicCanonical(
  input: MonolithicAnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  if (input.onEvent) {
    await input.onEvent("Monolithic canonical pipeline selected (not yet implemented)", 1);
  }

  throw new Error(
    "Monolithic canonical pipeline not yet implemented. " +
      "This variant will use AI SDK tool loops to perform analysis in a single context. " +
      "Falling back to orchestrated pipeline."
  );
}
