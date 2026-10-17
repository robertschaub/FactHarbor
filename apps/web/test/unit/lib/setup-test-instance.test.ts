import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";

it.each(["", "FH_SEARCH_CACHE_PATH=/old/cache.db\n", "FH_SEARCH_CACHE_PATH=/old/a.db\nFH_SEARCH_CACHE_PATH=/old/b.db\n"])("upserts only the test search-cache path in a disposable env: %j", existing => {
  const source = readFileSync(path.resolve("../../scripts/setup-test-instance.sh"), "utf8");
  const start = source.indexOf("# Set the test search cache even when");
  expect(start).toBeGreaterThan(0);
  const end = source.indexOf("\n\n", start);
  expect(end).toBeGreaterThan(start);
  const fragment = source.slice(start, end);
  const root = mkdtempSync(path.join(os.tmpdir(), "fh-cache-env-"));
  const file = path.join(root, ".env.test");
  const bash = process.platform === "win32" ? "C:/Program Files/Git/bin/bash.exe" : "bash";
  const shellPath = (p: string) => process.platform === "win32" ? p.replaceAll("\\", "/").replace(/^([A-Za-z]):/, (_, drive: string) => "/" + drive.toLowerCase()) : p;
  try {
    writeFileSync(file, existing + "UNRELATED=keep"); // also covers missing trailing newline
    const script = "set -euo pipefail\nsudo() { case \"$1\" in sed|tee) \"$@\";; *) return 91;; esac; }\nDATA_TEST_DIR=$1\nENV_TEST=$2\n" + fragment;
    const run = () => execFileSync(bash, ["--noprofile", "--norc", "-c", script, "offline-fixture", shellPath(root), shellPath(file)], { windowsHide: true });
    run(); run();
    const result = readFileSync(file, "utf8");
    expect(result.split("\n").filter(line => line.startsWith("FH_SEARCH_CACHE_PATH="))).toEqual(["FH_SEARCH_CACHE_PATH=" + shellPath(root) + "/search-cache.db"]);
    expect(result).toContain("UNRELATED=keep");
  } finally {
    // Only this test's newly created directory; never application or evidence data.
    expect(path.dirname(root)).toBe(path.resolve(os.tmpdir()));
    expect(path.basename(root)).toMatch(/^fh-cache-env-/);
    rmSync(root, { recursive: true, force: true });
  }
});
