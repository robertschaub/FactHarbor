import path from "node:path";
import { describe, expect, it } from "vitest";

import { __internalFindRepoRoot } from "@/lib/analyzer/debug";

describe("analyzer/debug", () => {
  it("findRepoRoot resolves to repo root from nested dirs (cwd-independent)", () => {
    // This test guards against a regression where debug logs were written relative to
    // process.cwd(), producing paths like apps/web/apps/web/debug-analyzer.log when
    // the Next.js dev server runs from apps/web.
    const repoRoot = path.resolve(__dirname, "../../../../..");

    expect(__internalFindRepoRoot(repoRoot)).toBe(repoRoot);
    expect(__internalFindRepoRoot(path.join(repoRoot, "apps", "web"))).toBe(
      repoRoot,
    );
    expect(__internalFindRepoRoot(path.join(repoRoot, "apps", "web", "src"))).toBe(
      repoRoot,
    );
  });
});

