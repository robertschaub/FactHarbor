import { describe, expect, it } from "vitest";

async function loadBuildIndexModule() {
  return import("../../../../../scripts/build-index.mjs");
}

describe("parseHandoff", () => {
  it("preserves topic tokens that only look like extra roles", async () => {
    const { parseHandoff } = await loadBuildIndexModule();
    const content = [
      "### 2026-04-15 | LLM Expert | GitHub Copilot (GPT-5.4) | Captain-Defined Analysis Inputs Rule",
      "",
      "**Task:** Add a repository-wide rule that agents must not invent analysis inputs.",
    ].join("\n");

    const parsed = parseHandoff(
      "2026-04-15_LLM_Expert_Captain_Defined_Analysis_Inputs_Rule.md",
      content
    );

    expect(parsed.roles).toEqual(["llm_expert"]);
    expect(parsed.topics).toEqual(["captain", "defined", "analysis", "inputs", "rule"]);
  });

  it("strips the full declared multi-role prefix before deriving topics", async () => {
    const { parseHandoff } = await loadBuildIndexModule();
    const content = [
      "### 2026-04-22 | Senior Developer / DevOps Expert | GitHub Copilot (GPT-5.4) | Runner Admin Reads For Hidden Jobs",
      "",
      "**Task:** Fix hidden-job runner reads to use admin auth.",
    ].join("\n");

    const parsed = parseHandoff(
      "2026-04-22_Senior_Developer_DevOps_Expert_Runner_Admin_Reads_For_Hidden_Jobs.md",
      content
    );

    expect(parsed.roles).toEqual(["senior_developer", "devops_expert"]);
    expect(parsed.topics).toEqual(["runner", "admin", "reads", "for", "hidden", "jobs"]);
  });

  it("counts aliased role variants in YAML-driven topic fallback", async () => {
    const { parseHandoff } = await loadBuildIndexModule();
    const content = [
      "---",
      "roles: [senior_developer, devops_expert]",
      "---",
      "# Runner Admin Reads For Hidden Jobs",
    ].join("\n");

    const parsed = parseHandoff(
      "2026-04-22_Senior_Developer_Git_Expert_Runner_Admin_Reads_For_Hidden_Jobs.md",
      content
    );

    expect(parsed.roles).toEqual(["senior_developer", "devops_expert"]);
    expect(parsed.topics).toEqual(["runner", "admin", "reads", "for", "hidden", "jobs"]);
  });
});
