import test from "node:test";
import assert from "node:assert/strict";

import { preflightTask } from "../src/query/preflight-task.mjs";
import { searchHandoffs } from "../src/query/search-handoffs.mjs";

function createKnowledgeContext() {
  return {
    data: {
      handoffs: {
        entries: [
          {
            file: "2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md",
            date: "2026-04-22",
            roles: ["unassigned"],
            topics: ["mcp", "agent", "knowledge", "cli", "architecture"],
            files_touched: ["Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md"],
            summary: "Internal Agent Knowledge Query Layer CLI-First Realignment",
          },
          {
            file: "2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec.md",
            date: "2026-04-22",
            roles: ["lead_architect"],
            topics: ["atomic_claim_selection", "implementation_spec"],
            files_touched: ["Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md"],
            summary: "Atomic Claim Selection Implementation Spec",
          },
        ],
      },
      recentWindow: {
        entries: [
          {
            date: "2026-04-22",
            role: "Unassigned",
            title: "Internal Agent Knowledge Query Layer CLI-First Realignment",
            summary: "Active spec is the CLI-first internal knowledge layer handoff.",
            link: "Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md",
          },
        ],
      },
      roles: {
        entries: [
          {
            canonicalName: "Lead Architect",
            canonicalKey: "lead_architect",
            aliases: ["Senior Architect"],
            aliasKeys: ["lead_architect", "senior_architect"],
            file: "Docs/AGENTS/Roles/Lead_Architect.md",
          },
        ],
      },
      docSections: {
        docs: [
          {
            file: "Docs/AGENTS/Agent_Outputs.md",
            title: "Agent Outputs Log -- Active Index",
            sections: [{ heading: "Current Window" }],
          },
          {
            file: "Docs/AGENTS/Roles/Lead_Architect.md",
            title: "Lead Architect",
            sections: [{ heading: "Focus Areas" }],
          },
          {
            file: "Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md",
            title: "Internal Agent Knowledge Query Layer - CLI-First v1 Implementation Spec",
            sections: [{ heading: "5. V1 CLI surface" }],
          },
          {
            file: "Docs/STATUS/Current_Status.md",
            title: "Current Status",
            sections: [{ heading: "Current State" }],
          },
        ],
      },
      stageMap: { stages: {} },
    },
  };
}

test("search-handoffs normalizes role aliases", () => {
  const results = searchHandoffs(createKnowledgeContext(), {
    query: "implementation",
    role: "Senior Architect",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].roles[0], "lead_architect");
});

test("preflight-task keeps query-relevant handoffs and filters utility docs from anchors", () => {
  const result = preflightTask(createKnowledgeContext(), {
    task: "Continue the internal knowledge layer MCP implementation",
    role: "Senior Architect",
  });

  assert.equal(
    result.matchedHandoffs[0]?.file,
    "2026-04-22_Unassigned_Internal_Agent_Knowledge_Query_Layer_CLI_First_Realignment.md",
  );
  assert.ok(
    result.docAnchors.some(
      (doc) => doc.file === "Docs/WIP/2026-04-22_Internal_Agent_Knowledge_MCP_V1_Spec.md",
    ),
  );
  assert.ok(
    result.docAnchors.every((doc) => doc.file !== "Docs/AGENTS/Agent_Outputs.md"),
  );
  assert.ok(
    result.docAnchors.every((doc) => doc.file !== "Docs/AGENTS/Roles/Lead_Architect.md"),
  );
});
