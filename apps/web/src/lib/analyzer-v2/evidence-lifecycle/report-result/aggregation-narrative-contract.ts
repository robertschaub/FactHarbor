import { z } from "zod";

import {
  BoundaryVerdictInternalLabelSchema,
  EvidenceLifecycleTaskBlockedReasonSchema,
  EvidenceLifecycleTaskDamagedReasonSchema,
  EvidenceLifecycleTaskEventSchema,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
import type {
  BoundaryVerdictInternalLabel,
  EvidenceLifecycleTaskBlockedReason,
  EvidenceLifecycleTaskDamagedReason,
  EvidenceLifecycleTaskEvent,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const AGGREGATION_NARRATIVE_SCHEMA_VERSION = "v2.aggregation_narrative.0" as const;
export const AGGREGATION_NARRATIVE_PROMPT_SECTION_ID = "V2_AGGREGATION_NARRATIVE" as const;

export type AggregationNarrativeCitation = {
  readonly evidenceItemId: string;
  readonly usedFor: string;
};

export type AggregationNarrativeBoundarySection = {
  readonly boundaryCandidateId: string;
  readonly title: string;
  readonly evidenceItemIds: readonly string[];
  readonly narrative: string;
};

export type AggregationNarrativeVerdictSection = {
  readonly verdictCandidateId: string;
  readonly boundaryCandidateIds: readonly string[];
  readonly evidenceItemIds: readonly string[];
  readonly verdictLabel: BoundaryVerdictInternalLabel;
  readonly truthPercentage: number;
  readonly confidence: number;
  readonly narrative: string;
  readonly caveats: readonly string[];
  readonly materialUncertaintySignals: readonly string[];
};

export type AggregationNarrativeResult =
  | {
    readonly schemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
    readonly taskKey: "aggregation_narrative";
    readonly status: "accepted";
    readonly reportTitle: string;
    readonly executiveSummary: string;
    readonly verdictSections: readonly [AggregationNarrativeVerdictSection, ...AggregationNarrativeVerdictSection[]];
    readonly boundarySections: readonly [AggregationNarrativeBoundarySection, ...AggregationNarrativeBoundarySection[]];
    readonly limitations: readonly string[];
    readonly citationMap: readonly [AggregationNarrativeCitation, ...AggregationNarrativeCitation[]];
    readonly reportMarkdown: string;
    readonly integrityEvents: readonly EvidenceLifecycleTaskEvent[];
    readonly blockedReason: null;
    readonly damagedReason: null;
  }
  | {
    readonly schemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
    readonly taskKey: "aggregation_narrative";
    readonly status: "blocked";
    readonly reportTitle: null;
    readonly executiveSummary: null;
    readonly verdictSections: null;
    readonly boundarySections: null;
    readonly limitations: null;
    readonly citationMap: null;
    readonly reportMarkdown: null;
    readonly integrityEvents: readonly EvidenceLifecycleTaskEvent[];
    readonly blockedReason: EvidenceLifecycleTaskBlockedReason;
    readonly damagedReason: null;
  }
  | {
    readonly schemaVersion: typeof AGGREGATION_NARRATIVE_SCHEMA_VERSION;
    readonly taskKey: "aggregation_narrative";
    readonly status: "damaged";
    readonly reportTitle: null;
    readonly executiveSummary: null;
    readonly verdictSections: null;
    readonly boundarySections: null;
    readonly limitations: null;
    readonly citationMap: null;
    readonly reportMarkdown: null;
    readonly integrityEvents: readonly EvidenceLifecycleTaskEvent[];
    readonly blockedReason: null;
    readonly damagedReason: EvidenceLifecycleTaskDamagedReason;
  };

const AggregationNarrativeCitationSchema = z.object({
  evidenceItemId: z.string().min(1),
  usedFor: z.string().min(1),
}).strict();

const AggregationNarrativeBoundarySectionSchema = z.object({
  boundaryCandidateId: z.string().min(1),
  title: z.string().min(1),
  evidenceItemIds: z.array(z.string().min(1)).min(1),
  narrative: z.string().min(1),
}).strict();

const AggregationNarrativeVerdictSectionSchema = z.object({
  verdictCandidateId: z.string().min(1),
  boundaryCandidateIds: z.array(z.string().min(1)).min(1),
  evidenceItemIds: z.array(z.string().min(1)).min(1),
  verdictLabel: BoundaryVerdictInternalLabelSchema,
  truthPercentage: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  narrative: z.string().min(1),
  caveats: z.array(z.string()),
  materialUncertaintySignals: z.array(z.string()),
}).strict();

const AcceptedAggregationNarrativeResultSchema = z.object({
  schemaVersion: z.literal(AGGREGATION_NARRATIVE_SCHEMA_VERSION),
  taskKey: z.literal("aggregation_narrative"),
  status: z.literal("accepted"),
  reportTitle: z.string().min(1),
  executiveSummary: z.string().min(1),
  verdictSections: z.array(AggregationNarrativeVerdictSectionSchema).min(1),
  boundarySections: z.array(AggregationNarrativeBoundarySectionSchema).min(1),
  limitations: z.array(z.string()),
  citationMap: z.array(AggregationNarrativeCitationSchema).min(1),
  reportMarkdown: z.string().min(1),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedAggregationNarrativeResultSchema = z.object({
  schemaVersion: z.literal(AGGREGATION_NARRATIVE_SCHEMA_VERSION),
  taskKey: z.literal("aggregation_narrative"),
  status: z.literal("blocked"),
  reportTitle: z.null(),
  executiveSummary: z.null(),
  verdictSections: z.null(),
  boundarySections: z.null(),
  limitations: z.null(),
  citationMap: z.null(),
  reportMarkdown: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: EvidenceLifecycleTaskBlockedReasonSchema,
  damagedReason: z.null(),
}).strict();

const DamagedAggregationNarrativeResultSchema = z.object({
  schemaVersion: z.literal(AGGREGATION_NARRATIVE_SCHEMA_VERSION),
  taskKey: z.literal("aggregation_narrative"),
  status: z.literal("damaged"),
  reportTitle: z.null(),
  executiveSummary: z.null(),
  verdictSections: z.null(),
  boundarySections: z.null(),
  limitations: z.null(),
  citationMap: z.null(),
  reportMarkdown: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: EvidenceLifecycleTaskDamagedReasonSchema,
}).strict();

export const AggregationNarrativeResultSchema = z.discriminatedUnion("status", [
  AcceptedAggregationNarrativeResultSchema,
  BlockedAggregationNarrativeResultSchema,
  DamagedAggregationNarrativeResultSchema,
]);

export function parseAggregationNarrativeResult(value: unknown): AggregationNarrativeResult {
  return AggregationNarrativeResultSchema.parse(value) as AggregationNarrativeResult;
}
