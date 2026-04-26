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

  it("extracts debt-guard result blocks as passive governance telemetry", async () => {
    const { parseHandoff } = await loadBuildIndexModule();
    const content = [
      "---",
      "roles: [senior_developer]",
      "topics: [bugfix, debt_guard]",
      "---",
      "# Focused Bugfix",
      "",
      "```",
      "DEBT-GUARD RESULT",
      "Classification: incomplete-existing-mechanism",
      "Chosen option: amend",
      "Net mechanism count: unchanged",
      "Verification: safe-local / npm -w apps/web test -- build-index.test.ts",
      "```",
    ].join("\n");

    const parsed = parseHandoff("2026-04-26_Senior_Developer_Focused_Bugfix.md", content);

    expect(parsed.governance?.debt_guard).toEqual({
      present: true,
      result_type: "full_result",
      block_header: "DEBT-GUARD RESULT",
      fields: {
        classification: "incomplete-existing-mechanism",
        chosen_option: "amend",
        net_mechanism_count: "unchanged",
        verification: "safe-local / npm -w apps/web test -- build-index.test.ts",
      },
    });
  });

  it("prefers final debt-guard result telemetry over pre-edit compact blocks", async () => {
    const { parseHandoff } = await loadBuildIndexModule();
    const content = [
      "# Compact Bugfix",
      "",
      "```",
      "COMPACT DEBT-GUARD",
      "Path: Compact",
      "Verifier: safe-local",
      "```",
      "",
      "```",
      "DEBT-GUARD COMPACT RESULT",
      "Chosen option: amend",
      "Net mechanism count: unchanged",
      "Verification: safe-local / npm -w apps/web test -- build-index.test.ts",
      "Residual debt: none",
      "```",
    ].join("\n");

    const parsed = parseHandoff("2026-04-26_Senior_Developer_Compact_Bugfix.md", content);

    expect(parsed.governance?.debt_guard.result_type).toBe("compact_result");
    expect(parsed.governance?.debt_guard.fields).toEqual({
      chosen_option: "amend",
      net_mechanism_count: "unchanged",
      verification: "safe-local / npm -w apps/web test -- build-index.test.ts",
      residual_debt: "none",
    });
  });
});
