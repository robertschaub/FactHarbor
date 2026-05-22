import { describe, expect, it } from "vitest";
import {
  SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
  SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
  buildSourceCandidatePreviewProjection,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview";
import {
  buildSourceMaterialPageSummaryFetchLocator,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-fetch-locator";
import {
  executeEvidenceLifecycleSourceMaterialPageSummaryTransport,
  type SourceAcquisitionNetworkLowLevelRequest,
  type SourceAcquisitionNetworkLowLevelTransport,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-transport";

function locator() {
  const candidate = {
    key: "Hydrogen_vehicle",
    title: "Hydrogen vehicle",
    excerpt: "Fuel cell vehicles use hydrogen.",
    description: "Public encyclopedia page",
    url: "https://example.invalid/poison?secret=sk_test",
  };
  return buildSourceMaterialPageSummaryFetchLocator({
    projection: buildSourceCandidatePreviewProjection({
      providerId: SOURCE_CANDIDATE_PREVIEW_PROVIDER_ID,
      endpointId: SOURCE_CANDIDATE_PREVIEW_ENDPOINT_ID,
      providerAttemptOrdinal: 1,
      providerRank: 1,
      candidateOrdinal: 1,
      sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
      candidate,
    }),
    candidate,
    languageCode: "en",
  });
}

function transport(
  overrides: Partial<SourceAcquisitionNetworkLowLevelTransport> = {},
): SourceAcquisitionNetworkLowLevelTransport {
  return {
    resolve: overrides.resolve ?? (async () => [{ address: "93.184.216.34", family: 4 }]),
    request: overrides.request ?? (async () => ({
      statusCode: 200,
      headers: { "content-type": "application/json" },
      remoteAddress: "93.184.216.34",
      body: Buffer.from(JSON.stringify({
        query: {
          pages: [{
            title: "Hydrogen vehicle",
            extract: "Hydrogen vehicles store hydrogen and use it to power an electric motor.",
          }],
        },
      }), "utf8"),
    })),
    now: overrides.now ?? (() => 100),
  };
}

function actionApiTextExtractPath(title: string): string {
  return "/w/api.php?action=query&prop=extracts&exchars=1200&explaintext=1"
    + `&exsectionformat=plain&format=json&formatversion=2&redirects=1&titles=${title}`;
}

describe("Analyzer V2 W3-B page-summary transport", () => {
  it("fetches one exact Wikimedia page-summary path with containment headers and bounded diagnostics", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const outcome = await executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
      locator: locator(),
      lowLevelTransport: transport({
        request: async (request) => {
          calls.push(request);
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from(JSON.stringify({
              query: {
                pages: [{
                  pageid: 123,
                  key: "Hydrogen_vehicle",
                  title: "Hydrogen vehicle",
                  extract: "A bounded action-api text extract.",
                }],
              },
            }), "utf8"),
          };
        },
      }),
    });
    const serialized = JSON.stringify(outcome);

    expect(calls).toEqual([
      expect.objectContaining({
        hostname: "en.wikipedia.org",
        port: 443,
        method: "GET",
        pathWithQuery: actionApiTextExtractPath("Hydrogen_vehicle"),
        timeoutMs: 1500,
        maxCompressedBytes: 8192,
      }),
    ]);
    expect(calls[0]?.headers).toEqual({
      accept: "application/json",
      "user-agent": "FactHarbor-V2-Internal-SourceMaterial/1.0",
    });
    expect(outcome).toMatchObject({
      status: "success",
      json: { extract: "A bounded action-api text extract." },
      diagnostic: {
        visibility: "internal_admin_only",
        providerId: "wikimedia_core",
        endpointId: "ep_wikimedia_project_page_summary",
        status: "success",
        stopReason: "not_stopped",
        dnsAddressCount: 1,
        selectedAddressFamily: "ipv4",
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCategory: "success_2xx",
        contentTypeCategory: "accepted_json",
        byteCapState: "within_cap",
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
        errorTraceIncluded: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityTouched: false,
      },
    });
    expect(serialized).not.toContain("Hydrogen_vehicle");
    expect(serialized).not.toContain("Hydrogen vehicle");
    expect(serialized).not.toContain("pageid");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("headers");
    expect(serialized).not.toContain("authorization");
  });

  it("fails closed for private DNS, final address mismatch, redirect, non-json, malformed json, and byte caps", async () => {
    await expect(executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
      locator: locator(),
      lowLevelTransport: transport({
        resolve: async () => [{ address: "127.0.0.1", family: 4 }],
      }),
    })).resolves.toMatchObject({
      status: "blocked",
      diagnostic: { stopReason: "dns_address_blocked", finalAddressValidation: "blocked_or_mismatched" },
    });

    await expect(executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
      locator: locator(),
      lowLevelTransport: transport({
        request: async () => ({
          statusCode: 200,
          headers: { "content-type": "application/json" },
          remoteAddress: "127.0.0.1",
          body: Buffer.from("{\"extract\":\"ok\"}", "utf8"),
        }),
      }),
    })).resolves.toMatchObject({
      status: "blocked",
      diagnostic: { stopReason: "final_address_mismatch", finalAddressValidation: "blocked_or_mismatched" },
    });

    for (const [response, stopReason] of [
      [{ statusCode: 302, headers: { "content-type": "application/json", location: "https://redirect.invalid" }, body: "{}" }, "redirect_denied"],
      [{ statusCode: 200, headers: { "content-type": "text/html" }, body: "{}" }, "content_type_rejected"],
      [{ statusCode: 200, headers: { "content-type": "application/json" }, body: "not-json" }, "json_parse_failed"],
      [{ statusCode: 200, headers: { "content-type": "application/json" }, body: "x".repeat(8_193) }, "compressed_byte_cap_exceeded"],
    ] as const) {
      const outcome = await executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
        locator: locator(),
        lowLevelTransport: transport({
          request: async () => ({
            statusCode: response.statusCode,
            headers: response.headers,
            remoteAddress: "93.184.216.34",
            body: Buffer.from(response.body, "utf8"),
          }),
        }),
      });

      expect(outcome.status).toBe("failed");
      expect(outcome.diagnostic.stopReason).toBe(stopReason);
      expect(JSON.stringify(outcome)).not.toContain("redirect.invalid");
    }
  });

  it("maps transport timeout and cancellation to bounded enum diagnostics", async () => {
    for (const [message, status, stopReason] of [
      ["timed_out", "timed_out", "timed_out"],
      ["cancelled", "cancelled", "cancelled"],
      ["socket exploded with https://example.invalid/sk_test", "failed", "transport_failure"],
    ] as const) {
      const outcome = await executeEvidenceLifecycleSourceMaterialPageSummaryTransport({
        locator: locator(),
        lowLevelTransport: transport({
          request: async () => {
            throw new Error(message);
          },
        }),
      });

      expect(outcome).toMatchObject({
        status,
        diagnostic: {
          stopReason,
          rawPayloadIncluded: false,
          errorTraceIncluded: false,
        },
      });
      expect(JSON.stringify(outcome)).not.toContain("example.invalid");
      expect(JSON.stringify(outcome)).not.toContain("sk_test");
    }
  });
});
