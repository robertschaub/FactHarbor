import type { AnalyzerV2PolicyApproval } from "@/lib/analyzer-v2/gateway/types";

export const ANALYZER_V2_X7_W5_A_APPROVAL_ANCHOR =
  "Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-A_Corrective_Recovery_Approval.md#approval-anchor" as const;

export const ANALYZER_V2_7L1_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  approvedAt: "2026-05-15T20:43:42.6482362Z",
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-A_Corrective_Recovery_Approval.md
  approvedAt: ANALYZER_V2_X7_W5_A_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;
