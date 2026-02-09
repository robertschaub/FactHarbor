/**
 * Error Classification Tests
 *
 * Tests that pipeline errors are correctly categorized as provider outages,
 * rate limits, timeouts, or unknown errors.
 */

import { describe, it, expect } from "vitest";
import { classifyError } from "@/lib/error-classification";
import { SearchProviderError } from "@/lib/web-search";

describe("error-classification", () => {
  describe("SearchProviderError", () => {
    it("classifies fatal SearchProviderError as provider_outage", () => {
      const err = new SearchProviderError("SerpAPI", 403, true, "Forbidden");
      const result = classifyError(err);
      expect(result.category).toBe("provider_outage");
      expect(result.provider).toBe("search");
      expect(result.shouldCountAsProviderFailure).toBe(true);
      expect(result.retriable).toBe(false);
    });

    it("classifies 429 SearchProviderError as rate_limit", () => {
      const err = new SearchProviderError("Google-CSE", 429, true, "Rate limited");
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("search");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies non-fatal SearchProviderError as not counting", () => {
      const err = new SearchProviderError("SerpAPI", 500, false, "Internal error");
      const result = classifyError(err);
      expect(result.shouldCountAsProviderFailure).toBe(false);
    });

    it("classifies by shape when instanceof fails", () => {
      // Simulate cross-module boundary issue
      const err = Object.assign(new Error("quota exceeded"), {
        name: "SearchProviderError",
        provider: "SerpAPI",
        status: 429,
        fatal: true,
      });
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("search");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });
  });

  describe("LLM errors", () => {
    it("classifies 429 status as rate_limit for LLM", () => {
      const err = Object.assign(new Error("Too many requests"), { status: 429 });
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies 529 status as rate_limit for LLM", () => {
      const err = Object.assign(new Error("Overloaded"), { status: 529 });
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies 503 status as rate_limit for LLM", () => {
      const err = Object.assign(new Error("Service unavailable"), { status: 503 });
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
    });

    it("classifies 401 status as provider_outage for LLM", () => {
      const err = Object.assign(new Error("Unauthorized"), { status: 401 });
      const result = classifyError(err);
      expect(result.category).toBe("provider_outage");
      expect(result.provider).toBe("llm");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies API key error by message", () => {
      const err = new Error("Invalid API key provided");
      const result = classifyError(err);
      expect(result.category).toBe("provider_outage");
      expect(result.provider).toBe("llm");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies rate limit by message", () => {
      const err = new Error("Rate limit exceeded, please retry");
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
      expect(result.shouldCountAsProviderFailure).toBe(true);
    });

    it("classifies overloaded by message", () => {
      const err = new Error("Model is currently overloaded");
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
    });

    it("classifies quota by message", () => {
      const err = new Error("Your quota has been exceeded");
      const result = classifyError(err);
      expect(result.category).toBe("rate_limit");
      expect(result.provider).toBe("llm");
    });
  });

  describe("Timeout errors", () => {
    it("classifies TimeoutError by name", () => {
      const err = new Error("The operation timed out");
      err.name = "TimeoutError";
      const result = classifyError(err);
      expect(result.category).toBe("timeout");
      expect(result.provider).toBeNull();
      expect(result.shouldCountAsProviderFailure).toBe(false);
      expect(result.retriable).toBe(true);
    });

    it("classifies AbortError by name", () => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      const result = classifyError(err);
      expect(result.category).toBe("timeout");
      expect(result.provider).toBeNull();
      expect(result.shouldCountAsProviderFailure).toBe(false);
    });

    it("classifies timeout by message", () => {
      const err = new Error("Request timed out after 30000ms");
      const result = classifyError(err);
      expect(result.category).toBe("timeout");
      expect(result.shouldCountAsProviderFailure).toBe(false);
    });

    it("classifies ETIMEDOUT by message", () => {
      const err = new Error("connect ETIMEDOUT 1.2.3.4:443");
      const result = classifyError(err);
      expect(result.category).toBe("timeout");
    });
  });

  describe("Unknown errors", () => {
    it("classifies generic Error as unknown", () => {
      const err = new Error("Something went wrong");
      const result = classifyError(err);
      expect(result.category).toBe("unknown");
      expect(result.provider).toBeNull();
      expect(result.shouldCountAsProviderFailure).toBe(false);
      expect(result.retriable).toBe(false);
    });

    it("classifies string error as unknown", () => {
      const result = classifyError("some string error");
      expect(result.category).toBe("unknown");
      expect(result.message).toBe("some string error");
    });

    it("classifies null/undefined as unknown", () => {
      const result = classifyError(null);
      expect(result.category).toBe("unknown");
    });
  });
});
