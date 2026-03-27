import { describe, expect, it, vi } from "vitest";
import {
  getLlmConnectivityProbeUrl,
  probeLLMConnectivity,
} from "@/lib/connectivity-probe";

describe("probeLLMConnectivity", () => {
  it("returns reachable on any HTTP response", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 503 }));

    const result = await probeLLMConnectivity({ fetchImpl });

    expect(result).toMatchObject({
      reachable: true,
      statusCode: 503,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("returns unreachable on DNS failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("getaddrinfo ENOTFOUND api.anthropic.com");
    });

    const result = await probeLLMConnectivity({ fetchImpl });

    expect(result.reachable).toBe(false);
    expect(result.error).toContain("ENOTFOUND");
  });

  it("returns unreachable on connection refused", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("connect ECONNREFUSED 104.18.7.46:443");
    });

    const result = await probeLLMConnectivity({ fetchImpl });

    expect(result.reachable).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });

  it("returns unreachable on fetch-layer failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("fetch failed");
    });

    const result = await probeLLMConnectivity({ fetchImpl });

    expect(result.reachable).toBe(false);
    expect(result.error).toContain("fetch failed");
  });

  it("uses the configured provider probe URL", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 200 }));

    await probeLLMConnectivity({ provider: "openai", fetchImpl });

    expect(fetchImpl).toHaveBeenCalledWith(
      getLlmConnectivityProbeUrl("openai"),
      expect.objectContaining({ method: "HEAD" }),
    );
  });

  it("uses an explicit URL override when provided", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 200 }));

    await probeLLMConnectivity({
      url: "https://example.test/probe",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example.test/probe",
      expect.objectContaining({ method: "HEAD" }),
    );
  });
});
