/**
 * Monolithic Dynamic Pipeline (PR 4 - Placeholder)
 *
 * This module will implement a single-context AI SDK tool loop that produces
 * flexible/dynamic output structure (not bound to canonical schema).
 *
 * Key features (to be implemented):
 * - AI SDK generateText with tool loop
 * - Dynamic output structure with citations
 * - Budget enforcement (maxSteps, maxSearches, timeout)
 * - Context compression after N tool calls
 * - Minimum safety contract: citations[], rawJson always stored
 * - "Experimental" labeling in UI
 */

export type MonolithicAnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void | Promise<void>;
  jobId?: string;
};

/**
 * Run fact-check analysis using a monolithic tool loop with dynamic output.
 *
 * Currently throws "not implemented" to trigger fallback to orchestrated pipeline.
 */
export async function runMonolithicDynamic(
  input: MonolithicAnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  if (input.onEvent) {
    await input.onEvent("Monolithic dynamic pipeline selected (not yet implemented)", 1);
  }

  throw new Error(
    "Monolithic dynamic pipeline not yet implemented. " +
      "This variant will use AI SDK tool loops with flexible output structure. " +
      "Falling back to orchestrated pipeline."
  );
}
