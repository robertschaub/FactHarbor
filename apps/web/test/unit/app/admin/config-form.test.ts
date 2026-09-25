import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import * as jsx from "react/jsx-runtime";
import { DEFAULT_PIPELINE_CONFIG, MODEL_POLICY_STAGES, PipelineConfigSchema, type PipelineConfig } from "@/lib/config-schemas";

// Exercise the actual form and event handlers without mounting the full Admin
// page (which fetches live config). No copied handler or production export.
const file = path.resolve(__dirname, "../../../../src/app/admin/config/page.tsx");
const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const form = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === "PipelineConfigForm")!;
const js = ts.transpileModule("export " + form.getText(source), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const exported: any = {};
new Function("require", "exports", "styles", "MODEL_POLICY_STAGES", "SHARED_DEFAULT_PIPELINE_CONFIG", js)(
  (name: string) => { if (name === "react/jsx-runtime") return jsx; throw Error("Unexpected import: " + name); },
  exported, {}, MODEL_POLICY_STAGES, DEFAULT_PIPELINE_CONFIG,
);
function find(node: any, id: string): any {
  if (!node) return undefined;
  if (Array.isArray(node)) return node.map(n => find(n, id)).find(Boolean);
  return node.props?.id === id ? node : find(node.props?.children, id);
}

describe("Admin contract candidate controls", () => {
  it("preserves native mode across thinking/cap edits and JSON round trips", () => {
    let config = structuredClone(DEFAULT_PIPELINE_CONFIG);
    const edit = (id: string, value: string) => {
      const tree = exported.PipelineConfigForm({ config, onChange: (next: PipelineConfig) => { config = next; } });
      const control = find(tree, id);
      expect(control).toBeDefined();
      control.props.onChange({ target: { value } });
    };
    const initial = exported.PipelineConfigForm({ config, onChange: () => {} });
    expect(find(initial, "contract-validator-output").props.disabled).toBe(true);
    edit("contract-validator-model", "claude-sonnet-5");
    edit("sonnet5-thinking", "adaptive:medium");
    edit("cap-claimContractValidation", "8192");
    edit("contract-validator-output", "outputFormat");
    edit("sonnet5-thinking", "adaptive:low");
    edit("cap-claimContractValidation", "4096");
    const parsed = PipelineConfigSchema.parse(JSON.parse(JSON.stringify(config)));
    expect(parsed.modelPolicies!["claude-sonnet-5"]).toMatchObject({
      thinking: { type: "adaptive", effort: "low" }, outputTokenCaps: { claimContractValidation: 4096 },
      structuredOutputModes: { claimContractValidation: "outputFormat" },
    });
    edit("contract-validator-model", "");
    expect(PipelineConfigSchema.safeParse(config).success).toBe(false);
    edit("contract-validator-output", "jsonTool");
    expect(PipelineConfigSchema.safeParse(config).success).toBe(true);
    expect(config.modelVerdict).toBe(DEFAULT_PIPELINE_CONFIG.modelVerdict);
  });
});
