import type {
  HiddenDirectTextCandidateAcquisitionHarnessResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-candidate-acquisition-harness";

export type HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult =
  HiddenDirectTextCandidateAcquisitionHarnessResult;

const HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION =
  "v2.hidden-direct-text-candidate-acquisition-harness.x6";

const RESULT_KEYS = [
  "blockedReason",
  "candidateAcquisitionRuntime",
  "harnessVersion",
  "publicEnvelope",
  "status",
  "visibility",
  "x5Integration",
].sort();

const BLOCKED_REASONS = new Set([
  "x5_not_completed",
  "source_acquisition_not_ready",
  "candidate_allowlist_not_test_injected",
  "candidate_runtime_blocked",
  "candidate_runtime_damaged",
]);

const runtimeOwnedResults = new WeakSet<object>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

export function markHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
  result: HiddenDirectTextCandidateAcquisitionHarnessResult,
): HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult {
  runtimeOwnedResults.add(result);
  return result;
}

export function readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
  value: unknown,
): HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult | null {
  if (!isRecord(value) || !runtimeOwnedResults.has(value) || !hasExactKeys(value, RESULT_KEYS)) {
    return null;
  }
  if (
    value.harnessVersion !== HIDDEN_DIRECT_TEXT_CANDIDATE_ACQUISITION_HARNESS_VERSION
    || value.visibility !== "internal_only"
  ) {
    return null;
  }
  if (value.status === "completed") {
    return value.blockedReason === null && isRecord(value.candidateAcquisitionRuntime)
      ? value as unknown as HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult
      : null;
  }
  if (value.status === "blocked") {
    return typeof value.blockedReason === "string" && BLOCKED_REASONS.has(value.blockedReason)
      ? value as unknown as HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult
      : null;
  }
  return null;
}

export function isHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(
  value: unknown,
): value is HiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult {
  return readHiddenDirectTextCandidateAcquisitionHarnessRuntimeOwnedResult(value) !== null;
}
