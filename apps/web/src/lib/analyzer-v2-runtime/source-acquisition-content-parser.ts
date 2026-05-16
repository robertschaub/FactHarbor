import {
  disposeSourceAcquisitionContentFixturePacket,
  isSourceAcquisitionContentFixturePacket,
  type SourceAcquisitionContentFixturePacket,
  type SourceAcquisitionContentPacketLifecycleStatus,
} from "./source-acquisition-content-packet-sink";

export const SOURCE_ACQUISITION_CONTENT_PARSER_VERSION =
  "v2.source-acquisition.content-parser.7n3b3-2b";

export type SourceAcquisitionContentParserStructuralStatus =
  | "parsed_structural"
  | "fixture_packet_invalid"
  | "fixture_packet_disposed"
  | "policy_mismatch"
  | "request_invalid"
  | "timed_out"
  | "cancelled";

export type SourceAcquisitionContentParserRequest = {
  readonly packet: SourceAcquisitionContentFixturePacket;
  readonly parserAttemptId: string;
  readonly parserPolicyId: string;
  readonly contentTypePolicyId: string;
  readonly startedAtMs: number;
  readonly nowMs: number;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
};

export type SourceAcquisitionContentParserOutcome = {
  readonly version: typeof SOURCE_ACQUISITION_CONTENT_PARSER_VERSION;
  readonly visibility: "internal_only";
  readonly status: "success" | "blocked" | "timed_out" | "cancelled";
  readonly structuralStatus: SourceAcquisitionContentParserStructuralStatus;
  readonly parserAttemptId: string;
  readonly fixturePacketId: string | null;
  readonly packetLifecycleStatus: SourceAcquisitionContentPacketLifecycleStatus | "not_available";
  readonly disposalStatus: "not_disposed" | "disposed" | "not_applicable";
  readonly observedByteCount: number;
  readonly parserOutputByteCount: 0;
  readonly rawPayloadIncluded: false;
  readonly extractedTextIncluded: false;
  readonly publicPayloadIncluded: false;
  readonly evidenceItemIncluded: false;
  readonly sourceRecordIncluded: false;
  readonly applicabilityIncluded: false;
  readonly probativeValueIncluded: false;
  readonly sourceReliabilityTouched: false;
  readonly warningIncluded: false;
  readonly verdictIncluded: false;
  readonly reportProseIncluded: false;
};

function parserAttemptIdIsValid(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("PARSER_ATT_")
    && /^[A-Z0-9_]{12,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function policyIdIsValid(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.startsWith("POLICY_")
    && /^[A-Z0-9_]{8,96}$/.test(value)
    && !value.includes("://")
    && !value.includes("?")
    && !value.includes("#");
}

function outcome(params: {
  readonly status: SourceAcquisitionContentParserOutcome["status"];
  readonly structuralStatus: SourceAcquisitionContentParserStructuralStatus;
  readonly parserAttemptId: string;
  readonly packetLifecycleStatus?: SourceAcquisitionContentParserOutcome["packetLifecycleStatus"];
  readonly disposalStatus?: SourceAcquisitionContentParserOutcome["disposalStatus"];
  readonly observedByteCount?: number;
}): SourceAcquisitionContentParserOutcome {
  return {
    version: SOURCE_ACQUISITION_CONTENT_PARSER_VERSION,
    visibility: "internal_only",
    status: params.status,
    structuralStatus: params.structuralStatus,
    parserAttemptId: parserAttemptIdIsValid(params.parserAttemptId)
      ? params.parserAttemptId
      : "PARSER_ATT_REDACTED",
    fixturePacketId: null,
    packetLifecycleStatus: params.packetLifecycleStatus ?? "not_available",
    disposalStatus: params.disposalStatus ?? "not_applicable",
    observedByteCount: params.observedByteCount ?? 0,
    parserOutputByteCount: 0,
    rawPayloadIncluded: false,
    extractedTextIncluded: false,
    publicPayloadIncluded: false,
    evidenceItemIncluded: false,
    sourceRecordIncluded: false,
    applicabilityIncluded: false,
    probativeValueIncluded: false,
    sourceReliabilityTouched: false,
    warningIncluded: false,
    verdictIncluded: false,
    reportProseIncluded: false,
  };
}

function disposeValidPacket(
  packet: SourceAcquisitionContentFixturePacket,
): SourceAcquisitionContentParserOutcome["disposalStatus"] {
  const disposed = disposeSourceAcquisitionContentFixturePacket(packet);
  return disposed.status === "disposed" ? "disposed" : "not_disposed";
}

export function parseSourceAcquisitionContentFixturePacket(
  request: SourceAcquisitionContentParserRequest,
): SourceAcquisitionContentParserOutcome {
  if (
    !parserAttemptIdIsValid(request.parserAttemptId)
    || !policyIdIsValid(request.parserPolicyId)
    || !policyIdIsValid(request.contentTypePolicyId)
    || !Number.isInteger(request.startedAtMs)
    || !Number.isInteger(request.nowMs)
    || !Number.isInteger(request.timeoutMs)
    || request.timeoutMs <= 0
    || request.nowMs < request.startedAtMs
  ) {
    const disposalStatus = isSourceAcquisitionContentFixturePacket(request.packet)
      ? disposeValidPacket(request.packet)
      : "not_applicable";
    return outcome({
      status: "blocked",
      structuralStatus: "request_invalid",
      parserAttemptId: request.parserAttemptId,
      packetLifecycleStatus: disposalStatus === "disposed" ? "disposed" : "not_available",
      disposalStatus,
    });
  }

  if (request.signal?.aborted) {
    const disposalStatus = isSourceAcquisitionContentFixturePacket(request.packet)
      ? disposeValidPacket(request.packet)
      : "not_applicable";
    return outcome({
      status: "cancelled",
      structuralStatus: "cancelled",
      parserAttemptId: request.parserAttemptId,
      packetLifecycleStatus: disposalStatus === "disposed" ? "disposed" : "not_available",
      disposalStatus,
    });
  }

  if (request.nowMs - request.startedAtMs >= request.timeoutMs) {
    const disposalStatus = isSourceAcquisitionContentFixturePacket(request.packet)
      ? disposeValidPacket(request.packet)
      : "not_applicable";
    return outcome({
      status: "timed_out",
      structuralStatus: "timed_out",
      parserAttemptId: request.parserAttemptId,
      packetLifecycleStatus: disposalStatus === "disposed" ? "disposed" : "not_available",
      disposalStatus,
    });
  }

  if (!isSourceAcquisitionContentFixturePacket(request.packet)) {
    return outcome({
      status: "blocked",
      structuralStatus: "fixture_packet_invalid",
      parserAttemptId: request.parserAttemptId,
    });
  }

  if (request.packet.disposalStatus === "disposed" || request.packet.lifecycleStatus === "disposed") {
    return outcome({
      status: "blocked",
      structuralStatus: "fixture_packet_disposed",
      parserAttemptId: request.parserAttemptId,
      packetLifecycleStatus: "disposed",
      disposalStatus: "disposed",
    });
  }

  if (
    request.packet.parserPolicyId !== request.parserPolicyId
    || request.packet.contentTypePolicyId !== request.contentTypePolicyId
  ) {
    const disposalStatus = disposeValidPacket(request.packet);
    return outcome({
      status: "blocked",
      structuralStatus: "policy_mismatch",
      parserAttemptId: request.parserAttemptId,
      packetLifecycleStatus: disposalStatus === "disposed" ? "disposed" : "not_available",
      disposalStatus,
    });
  }

  const disposalStatus = disposeValidPacket(request.packet);
  return outcome({
    status: "success",
    structuralStatus: "parsed_structural",
    parserAttemptId: request.parserAttemptId,
    packetLifecycleStatus: disposalStatus === "disposed" ? "disposed" : "not_available",
    disposalStatus,
  });
}
