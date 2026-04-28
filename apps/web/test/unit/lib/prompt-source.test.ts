import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { loadPromptSourceContent } from "@/lib/prompt-source";

const originalPromptDir = process.env.FH_PROMPT_DIR;
let tempDir: string | null = null;

async function createTempPromptDir(): Promise<string> {
  tempDir = await mkdtemp(path.join(tmpdir(), "fh-prompt-source-"));
  process.env.FH_PROMPT_DIR = tempDir;
  return tempDir;
}

describe("prompt source loading", () => {
  beforeEach(async () => {
    await createTempPromptDir();
  });

  afterEach(async () => {
    if (originalPromptDir === undefined) {
      delete process.env.FH_PROMPT_DIR;
    } else {
      process.env.FH_PROMPT_DIR = originalPromptDir;
    }
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("loads the existing monolithic prompt when no split manifest exists", async () => {
    const promptPath = path.join(tempDir!, "claimboundary.prompt.md");
    const content = [
      "---",
      'version: "1.0.0"',
      'pipeline: "claimboundary"',
      "requiredSections:",
      '  - "CLAIM_EXTRACTION_PASS1"',
      "---",
      "",
      "## CLAIM_EXTRACTION_PASS1",
      "",
      "Extract claims.",
      "",
    ].join("\n");
    await writeFile(promptPath, content, "utf-8");

    const source = await loadPromptSourceContent("claimboundary");

    expect(source.sourceKind).toBe("monolith");
    expect(source.primaryPath).toBe(promptPath);
    expect(source.sourceFiles).toEqual([promptPath]);
    expect(source.content).toBe(content);
  });

  it("assembles a split prompt manifest into one deterministic composite", async () => {
    const manifestDir = path.join(tempDir!, "claimboundary");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "frontmatter.prompt.md"),
      [
        "---",
        'version: "1.0.0"',
        'pipeline: "claimboundary"',
        "requiredSections:",
        '  - "CLAIM_EXTRACTION_PASS1"',
        '  - "EXTRACT_EVIDENCE"',
        "---",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "stage1-understand.prompt.md"),
      ["## CLAIM_EXTRACTION_PASS1", "", "Extract claims."].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "stage2-research.prompt.md"),
      ["## EXTRACT_EVIDENCE", "", "Extract evidence."].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify(
        {
          schemaVersion: 1,
          profile: "claimboundary",
          frontmatterPath: "frontmatter.prompt.md",
          files: [
            {
              path: "stage1-understand.prompt.md",
              sections: ["CLAIM_EXTRACTION_PASS1"],
            },
            {
              path: "stage2-research.prompt.md",
              sections: ["EXTRACT_EVIDENCE"],
            },
          ],
        },
        null,
        2,
      ),
      "utf-8",
    );

    const source = await loadPromptSourceContent("claimboundary");

    expect(source.sourceKind).toBe("manifest");
    expect(source.content).toBe([
      "---",
      'version: "1.0.0"',
      'pipeline: "claimboundary"',
      "requiredSections:",
      '  - "CLAIM_EXTRACTION_PASS1"',
      '  - "EXTRACT_EVIDENCE"',
      "---",
      "",
      "## CLAIM_EXTRACTION_PASS1",
      "",
      "Extract claims.",
      "",
      "## EXTRACT_EVIDENCE",
      "",
      "Extract evidence.",
      "",
    ].join("\n"));
  });

  it("fails closed when manifest section mapping does not match file headings", async () => {
    const manifestDir = path.join(tempDir!, "claimboundary");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "frontmatter.prompt.md"),
      [
        "---",
        'version: "1.0.0"',
        'pipeline: "claimboundary"',
        "requiredSections:",
        '  - "CLAIM_EXTRACTION_PASS1"',
        "---",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "stage1-understand.prompt.md"),
      ["## CLAIM_EXTRACTION_PASS1", "", "Extract claims."].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        profile: "claimboundary",
        frontmatterPath: "frontmatter.prompt.md",
        files: [
          {
            path: "stage1-understand.prompt.md",
            sections: ["EXTRACT_EVIDENCE"],
          },
        ],
      }),
      "utf-8",
    );

    await expect(loadPromptSourceContent("claimboundary")).rejects.toThrow(
      /Sections for stage1-understand\.prompt\.md mismatch/,
    );
  });

  it("rejects manifest file paths that escape the manifest directory", async () => {
    const manifestDir = path.join(tempDir!, "claimboundary");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        profile: "claimboundary",
        frontmatterPath: "../frontmatter.prompt.md",
        files: [
          {
            path: "stage1-understand.prompt.md",
            sections: ["CLAIM_EXTRACTION_PASS1"],
          },
        ],
      }),
      "utf-8",
    );

    await expect(loadPromptSourceContent("claimboundary")).rejects.toThrow(
      /escapes manifest directory/,
    );
  });

  it("rejects split file paths that escape the manifest directory", async () => {
    const manifestDir = path.join(tempDir!, "claimboundary");
    await mkdir(manifestDir, { recursive: true });
    await writeFile(
      path.join(manifestDir, "frontmatter.prompt.md"),
      [
        "---",
        'version: "1.0.0"',
        'pipeline: "claimboundary"',
        "requiredSections:",
        '  - "CLAIM_EXTRACTION_PASS1"',
        "---",
        "",
      ].join("\n"),
      "utf-8",
    );
    await writeFile(
      path.join(manifestDir, "manifest.json"),
      JSON.stringify({
        schemaVersion: 1,
        profile: "claimboundary",
        frontmatterPath: "frontmatter.prompt.md",
        files: [
          {
            path: "../stage1-understand.prompt.md",
            sections: ["CLAIM_EXTRACTION_PASS1"],
          },
        ],
      }),
      "utf-8",
    );

    await expect(loadPromptSourceContent("claimboundary")).rejects.toThrow(
      /escapes manifest directory/,
    );
  });
});
