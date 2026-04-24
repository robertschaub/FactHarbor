import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  __internalFindWebRoot,
  __internalGetCurrentDebugLogPrefix,
  __internalPrefixDebugMessage,
  runWithDebugLogContext,
} from "@/lib/analyzer/debug";

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

  it("prefixes multi-line debug messages consistently", () => {
    expect(__internalPrefixDebugMessage("line one\nline two", "[draft:abc|prep]")).toBe(
      "[draft:abc|prep] line one\n[draft:abc|prep] line two",
    );
  });

  it("scopes the debug-log prefix to the current async context", async () => {
    expect(__internalGetCurrentDebugLogPrefix()).toBe("");

    await runWithDebugLogContext("[job:123|analysis]", async () => {
      expect(__internalGetCurrentDebugLogPrefix()).toBe("[job:123|analysis]");
    });

    expect(__internalGetCurrentDebugLogPrefix()).toBe("");
  });
});
