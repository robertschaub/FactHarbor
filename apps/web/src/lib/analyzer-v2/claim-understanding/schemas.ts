import { z } from "zod";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  type ClaimContract,
  type ClaimUnderstandingResult,
} from "@/lib/analyzer-v2/claim-understanding/types";

export const Gate1StatusSchema = z.object({
  status: z.enum(["passed", "failed", "blocked"]),
  source: z.enum(["acs_prepared_snapshot", "v2_claim_understanding"]),
  summary: z.string(),
  reasons: z.array(z.string()),
}).strict();

export const ClaimIntegrityEventSchema = z.object({
  type: z.enum([
    "acs_snapshot_consumed",
    "duplicate_selected_claim_id",
    "claim_contract_validation_failed",
    "no_valid_claim",
    "prepared_snapshot_invalid",
    "selected_claim_missing",
    "shell_placeholder_claim_id",
  ]),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  claimIds: z.array(z.string()),
}).strict();

export const InputGroundingSeedSchema = z.object({
  source: z.enum(["acs_prepared_snapshot", "direct_input"]),
  inputType: z.enum(["text", "url"]),
  inputValue: z.string().min(1),
  resolvedInputText: z.string().min(1),
  detectedLanguage: z.string().min(1),
  currentDate: z.string().min(1),
  acsSnapshotHash: z.string().nullable(),
  inputGroundingSeedHash: z.string().nullable(),
}).strict();

export const V2AtomicClaimSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  selected: z.boolean(),
  source: z.enum(["acs_prepared_snapshot", "v2_claim_understanding"]),
  gate1Status: Gate1StatusSchema,
  integrityEvents: z.array(ClaimIntegrityEventSchema),
}).strict();

export const ClaimContractSchema = z.object({
  schemaVersion: z.literal(CLAIM_CONTRACT_V2_SCHEMA_VERSION),
  input: z.object({
    inputType: z.enum(["text", "url"]),
    inputValue: z.string().min(1),
    resolvedInputText: z.string().min(1),
    detectedLanguage: z.string().min(1),
    selectedAtomicClaimIds: z.array(z.string().min(1)).min(1),
  }).strict(),
  inputGroundingSeed: InputGroundingSeedSchema,
  atomicClaims: z.array(V2AtomicClaimSchema).min(1),
  integrityEvents: z.array(ClaimIntegrityEventSchema),
  acsMigration: z.object({
    sourceSchemaVersion: z.literal("prepared-stage1-v1"),
    status: z.literal("accepted"),
    selectedClaimFinalityPreserved: z.boolean(),
  }).strict().nullable(),
}).strict();

const AcceptedClaimUnderstandingResultSchema = z.object({
  schemaVersion: z.literal(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION),
  status: z.literal("accepted"),
  claimContract: ClaimContractSchema,
  integrityEvents: z.array(ClaimIntegrityEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedClaimUnderstandingResultSchema = z.object({
  schemaVersion: z.literal(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION),
  status: z.literal("blocked"),
  claimContract: z.null(),
  integrityEvents: z.array(ClaimIntegrityEventSchema).min(1),
  blockedReason: z.enum([
    "duplicate_selected_claim_id",
    "no_valid_claim",
    "prepared_snapshot_invalid",
    "selected_claim_missing",
    "shell_placeholder_claim_id",
  ]),
  damagedReason: z.null(),
}).strict();

const DamagedClaimUnderstandingResultSchema = z.object({
  schemaVersion: z.literal(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION),
  status: z.literal("damaged"),
  claimContract: z.null(),
  integrityEvents: z.array(ClaimIntegrityEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: z.enum([
    "claim_contract_validation_failed",
    "claim_understanding_unavailable",
  ]),
}).strict();

export const ClaimUnderstandingResultSchema = z.discriminatedUnion("status", [
  AcceptedClaimUnderstandingResultSchema,
  BlockedClaimUnderstandingResultSchema,
  DamagedClaimUnderstandingResultSchema,
]);

export function parseClaimContract(value: unknown): ClaimContract {
  return ClaimContractSchema.parse(value) as ClaimContract;
}

export function parseClaimUnderstandingResult(value: unknown): ClaimUnderstandingResult {
  return ClaimUnderstandingResultSchema.parse(value) as ClaimUnderstandingResult;
}
