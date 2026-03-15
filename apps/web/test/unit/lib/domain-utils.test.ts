import { describe, expect, it } from "vitest";

import {
  extractNormalizedHostname,
  getDomainLookupChain,
  getFamilyDomain,
  isSubdomainEntry,
  normalizeHostname,
} from "@/lib/domain-utils";

describe("domain-utils", () => {
  it("normalizes hostnames consistently", () => {
    expect(normalizeHostname("WWW.Example.COM.")).toBe("example.com");
  });

  it("extracts normalized hostname from a URL", () => {
    expect(extractNormalizedHostname("https://WWW.Example.COM./path")).toBe("example.com");
    expect(extractNormalizedHostname("not-a-url")).toBeNull();
  });

  it("returns the registrable family domain for common subdomains", () => {
    expect(getFamilyDomain("fr.wikipedia.org")).toBe("wikipedia.org");
    expect(getFamilyDomain("news.bbc.co.uk")).toBe("bbc.co.uk");
    expect(getFamilyDomain("localhost")).toBe("localhost");
  });

  it("builds exact-host-first lookup chains", () => {
    expect(getDomainLookupChain("fr.wikipedia.org")).toEqual(["fr.wikipedia.org", "wikipedia.org"]);
    expect(getDomainLookupChain("bbc.co.uk")).toEqual(["bbc.co.uk"]);
  });

  it("detects whether an entry is a subdomain within its family", () => {
    expect(isSubdomainEntry("fr.wikipedia.org")).toBe(true);
    expect(isSubdomainEntry("wikipedia.org")).toBe(false);
  });
});
