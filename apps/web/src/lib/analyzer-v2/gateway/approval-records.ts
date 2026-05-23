import type { AnalyzerV2PolicyApproval } from "@/lib/analyzer-v2/gateway/types";

export const ANALYZER_V2_X7_W5_A_APPROVAL_ANCHOR =
  "Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-A_Corrective_Recovery_Approval.md#approval-anchor" as const;

export const ANALYZER_V2_X7_W5_B_APPROVAL_ANCHOR =
  "Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-B_Claim_Understanding_Activation_Approval.md#approval-anchor" as const;

export const ANALYZER_V2_W6_C_APPROVAL_ANCHOR =
  "Docs/WIP/2026-05-20_V2_Slice_W6-C_Sufficiency_Assessment_Implementation_Approval_Package.md@fdbe42dc#captain-approved-w6-c" as const;

export const ANALYZER_V2_W7_B_APPROVAL_ANCHOR =
  "Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md@c8cf2ebc#captain-approved-w7-b" as const;

export const ANALYZER_V2_HJ18_APPROVAL_ANCHOR =
  "Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md#steer-co-consensus-captain-authorized" as const;

export const ANALYZER_V2_HJ19_APPROVAL_ANCHOR =
  "Docs/WIP/2026-05-22_V2_HighJump_HJ19_Report_Writer_Output_Budget_Repair.md#steer-co-reduced-quorum-captain-authorized" as const;

export const ANALYZER_V2_HJ78_APPROVAL_ANCHOR =
  "Docs/WIP/2026-05-23_V2_HighJump_HJ78_Evidence_Applicability_Precheck.md#captain-authorized-highjump" as const;

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

export const ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/AGENTS/Handoffs/2026-05-19_Captain_X7-W5-B_Claim_Understanding_Activation_Approval.md
  approvedAt: ANALYZER_V2_X7_W5_B_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_W6_C_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/WIP/2026-05-20_V2_Slice_W6-C_Sufficiency_Assessment_Implementation_Approval_Package.md at fdbe42dc
  approvedAt: ANALYZER_V2_W6_C_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_W7_B_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md at c8cf2ebc
  approvedAt: ANALYZER_V2_W7_B_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_HJ18_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/WIP/2026-05-22_V2_HighJump_HJ18_Internal_Report_Writer.md
  approvedAt: ANALYZER_V2_HJ18_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_HJ19_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/WIP/2026-05-22_V2_HighJump_HJ19_Report_Writer_Output_Budget_Repair.md
  approvedAt: ANALYZER_V2_HJ19_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;

export const ANALYZER_V2_HJ78_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  // Durable approval anchor:
  // Docs/WIP/2026-05-23_V2_HighJump_HJ78_Evidence_Applicability_Precheck.md
  approvedAt: ANALYZER_V2_HJ78_APPROVAL_ANCHOR,
} as const satisfies AnalyzerV2PolicyApproval;
