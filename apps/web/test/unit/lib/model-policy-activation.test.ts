import { afterAll, describe, expect, it, vi } from "vitest";
// Exercise real storage and routes with an in-memory database only. Never open
// the configured application's database, even when the developer has services up.
vi.mock("sqlite", async importOriginal => {
  const actual = await importOriginal<typeof import("sqlite")>();
  return { ...actual, open: (options: Parameters<typeof actual.open>[0]) => actual.open({ ...options, filename: ":memory:" }) };
});
vi.mock("@/lib/auth", () => ({ checkAdminKey: () => true }));

import { activateConfig, getActiveConfigHash, getDb, rollbackConfig, saveConfigBlob } from "@/lib/config-storage";
import { DEFAULT_PIPELINE_CONFIG, MODEL_POLICY_STAGES } from "@/lib/config-schemas";
import { POST as activateRoute } from "@/app/api/admin/config/[type]/[profile]/activate/route";
import { POST as rollbackRoute } from "@/app/api/admin/config/[type]/[profile]/rollback/route";
import { PUT as saveRoute } from "@/app/api/admin/config/[type]/[profile]/route";

async function historicalBlob(hash: string, content: object) {
  const db = await getDb();
  await db.run(`INSERT INTO config_blobs
    (content_hash, config_type, profile_key, schema_version, version_label, content, created_utc)
    VALUES (?, 'pipeline', 'policy-test', '3.0.0', 'historical', ?, '2026-09-22T00:00:00Z')`, [hash, JSON.stringify(content)]);
}
function request(body: object) {
  return new Request("http://offline.test/api/admin/config/pipeline/policy-test/activate", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ type: "pipeline", profile: "policy-test" }) });

afterAll(async () => { await (await getDb()).close(); });

describe("real UCM save/activation against isolated memory DB", () => {
  it("rejects candidate saves at storage and HTTP seams", async () => {
    const content = JSON.stringify({ ...DEFAULT_PIPELINE_CONFIG, modelVerdict: "claude-sonnet-5" });
    await expect(saveConfigBlob("pipeline", "policy-test", content, "invalid")).rejects.toThrow("explicit adaptive");
    const response = await saveRoute(request({ content, versionLabel: "invalid" }), context());
    expect(response.status).toBe(400);
    expect(JSON.stringify(await response.json())).toContain("modelPolicies");
  });

  it("preserves a legacy active pointer when stored candidate activation or rollback is rejected", async () => {
    const db = await getDb();
    const databases = await db.all("PRAGMA database_list");
    expect(databases.find((d: any) => d.name === "main").file).toBe("");
    // Deliberately incomplete old baseline: activation must not impose modern required fields.
    await historicalBlob("baseline", { modelVerdict: "standard", llmTiering: true });
    await historicalBlob("old-incomplete-candidate", { modelVerdict: "claude-sonnet-5", llmTiering: true });
    await activateConfig("pipeline", "policy-test", "baseline");
    await expect(activateConfig("pipeline", "policy-test", "old-incomplete-candidate")).rejects.toThrow("Invalid model policy");
    await expect(rollbackConfig("pipeline", "policy-test", "old-incomplete-candidate")).rejects.toThrow("Invalid model policy");
    for (const route of [activateRoute, rollbackRoute]) {
      const response = await route(request({ contentHash: "old-incomplete-candidate" }), context());
      expect(response.status).toBe(400);
      expect((await response.json()).error).toContain("explicit adaptive");
      expect(await getActiveConfigHash("pipeline", "policy-test")).toBe("baseline");
    }
  });

  it("accepts explicit disabled policy and retains baseline rollback", async () => {
    const config = { ...DEFAULT_PIPELINE_CONFIG, modelVerdict: "claude-sonnet-5",
      modelPolicies: { "claude-sonnet-5": { thinking: { type: "disabled" },
        outputTokenCaps: Object.fromEntries(MODEL_POLICY_STAGES.map(stage => [stage, 16384])) } } };
    const saved = await saveConfigBlob("pipeline", "policy-test", JSON.stringify(config), "complete-candidate");
    const response = await activateRoute(request({ contentHash: saved.blob.contentHash }), context());
    expect(response.status).toBe(200);
    expect(await getActiveConfigHash("pipeline", "policy-test")).toBe(saved.blob.contentHash);
    await rollbackConfig("pipeline", "policy-test", "baseline");
    expect(await getActiveConfigHash("pipeline", "policy-test")).toBe("baseline");
  });
});
