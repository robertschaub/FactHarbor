import path from "node:path";
import { describe, expect, it } from "vitest";

import { __internalFindWebRoot } from "@/lib/analyzer/debug";

describe("analyzer/debug", () => {
  it("findWebRoot resolves to the web workspace from repo and nested dirs", () => {
    // This test guards against a regression where debug logs were written relative to
    // process.cwd(), producing paths like apps/web/apps/web/debug-analyzer.log when
    // the Next.js dev server runs from apps/web.
    // Path: test/unit/lib/analyzer -> 6 levels up to repo root
    const repoRoot = path.resolve(__dirname, "../../../../../..");
    const webRoot = path.join(repoRoot, "apps", "web");

    expect(__internalFindWebRoot(repoRoot)).toBe(webRoot);
    expect(__internalFindWebRoot(webRoot)).toBe(webRoot);
    expect(__internalFindWebRoot(path.join(webRoot, "src"))).toBe(webRoot);
  });
});
