import type { AnalyzerV2PolicyApproval } from "@/lib/analyzer-v2/gateway/types";

export const ANALYZER_V2_7L1_CAPTAIN_APPROVAL = {
  status: "approved",
  reviewer: "Captain",
  approvedAt: "2026-05-15T20:43:42.6482362Z",
} as const satisfies AnalyzerV2PolicyApproval;
