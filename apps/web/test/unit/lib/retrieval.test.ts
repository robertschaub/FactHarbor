import { afterEach, describe, expect, it, vi } from "vitest";

// SSRF guard resolves hostnames via dns/promises.lookup — mock it to a public IP so the
// end-to-end fetch tests below pass validation without real DNS.
vi.mock("dns/promises", () => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34", family: 4 }]),
}));

import {
  buildDistributedExcerpt,
  bufferLooksLikePdf,
  extractSameFamilyFollowUpUrlsFromHtml,
  extractSameFamilyPdfUrlsFromHtml,
  extractTextFromUrl,
  shouldParseAsPdf,
} from "@/lib/retrieval";

describe("shouldParseAsPdf (content-type aware PDF detection)", () => {
  it("parses as PDF when content-type is application/pdf, regardless of URL", () => {
    expect(shouldParseAsPdf("https://x.test/article", "application/pdf")).toBe(true);
    expect(shouldParseAsPdf("https://x.test/report.html", "application/pdf; charset=binary")).toBe(true);
  });

  it("does NOT parse as PDF when a .pdf URL returns an explicit HTML content-type (the bug fix)", () => {
    expect(shouldParseAsPdf("https://x.test/paper.pdf", "text/html")).toBe(false);
    expect(shouldParseAsPdf("https://x.test/paper.pdf?download=1", "text/html; charset=utf-8")).toBe(false);
    expect(shouldParseAsPdf("https://x.test/paper.pdf", "application/xhtml+xml")).toBe(false);
  });

  it("falls back to the URL extension when content-type is missing or ambiguous", () => {
    expect(shouldParseAsPdf("https://x.test/paper.pdf", undefined)).toBe(true);
    expect(shouldParseAsPdf("https://x.test/paper.pdf", "")).toBe(true);
    expect(shouldParseAsPdf("https://x.test/paper.pdf", "application/octet-stream")).toBe(true);
    expect(shouldParseAsPdf("https://x.test/paper.pdf?x=1", "application/octet-stream")).toBe(true);
  });

  it("treats non-PDF URLs with no content-type as HTML", () => {
    expect(shouldParseAsPdf("https://x.test/page", undefined)).toBe(false);
    expect(shouldParseAsPdf("https://x.test/page", "application/octet-stream")).toBe(false);
  });
});

describe("bufferLooksLikePdf (magic-byte guard)", () => {
  it("accepts a real %PDF- header at byte 0", () => {
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("%PDF-1.7\n...")))).toBe(true);
  });

  it("accepts a %PDF- header preceded by a BOM or leading whitespace/junk", () => {
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("﻿%PDF-1.4")))).toBe(true);
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("   \n%PDF-1.5")))).toBe(true);
  });

  it("rejects HTML block/login pages served from .pdf URLs", () => {
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("<!DOCTYPE html><html>...")))).toBe(false);
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("<html>denied</html>")))).toBe(false);
  });

  it("rejects buffers too short to contain the signature", () => {
    expect(bufferLooksLikePdf(new Uint8Array(Buffer.from("%PD")))).toBe(false);
    expect(bufferLooksLikePdf(new Uint8Array())).toBe(false);
  });

  it("does not scan past the first ~1KB for the signature", () => {
    const late = Buffer.concat([Buffer.alloc(2000, 0x20), Buffer.from("%PDF-1.7")]);
    expect(bufferLooksLikePdf(new Uint8Array(late))).toBe(false);
  });
});

describe("extractTextFromUrl (branch routing; mocked fetch + dns)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const htmlResponse = (body: string, contentType = "text/html; charset=utf-8") =>
    new Response(body, { status: 200, headers: { "content-type": contentType } });

  it("extracts HTML for a normal HTML content-type", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(
          "<html><head><title>Hello World</title></head><body><p>This is the article body, long enough to extract.</p></body></html>",
        ),
      ),
    );
    const out = await extractTextFromUrl("https://example.com/page", { timeoutMs: 5000 });
    expect(out.contentType).toBe("text/html");
    expect(out.title).toBe("Hello World");
    expect(out.text).toContain("article body");
  });

  it("falls back to HTML extraction when a .pdf URL returns an HTML block page (text/html)", async () => {
    // The Tier 0 fix: a .pdf URL that actually returns HTML must NOT be force-parsed as PDF.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(
          "<html><head><title>Sign in</title></head><body>Please subscribe to read this article in full.</body></html>",
        ),
      ),
    );
    const out = await extractTextFromUrl("https://example.com/paper.pdf", { timeoutMs: 5000 });
    expect(out.title).toBe("Sign in");
    expect(out.text).toContain("subscribe");
  });

  it("falls back to HTML when a .pdf URL returns HTML under octet-stream with no %PDF- magic", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        htmlResponse(
          "<html><head><title>Access blocked</title></head><body>Access denied by the publisher paywall.</body></html>",
          "application/octet-stream",
        ),
      ),
    );
    const out = await extractTextFromUrl("https://example.com/paper.pdf", { timeoutMs: 5000 });
    expect(out.title).toBe("Access blocked");
    expect(out.text).toContain("paywall");
  });
});

describe("retrieval linked-document discovery", () => {
  it("keeps same-family PDF links and prioritizes newer artifacts", () => {
    const html = `
      <html>
        <body>
          <a href="https://cms.news.admin.ch/dam/de/sem/old/stat-jahr-2024-kommentar-d.pdf">2024</a>
          <a href="https://cms.news.admin.ch/dam/de/sem/new/stat-jahr-2025-kommentar-d.pdf">2025</a>
          <a href="https://www.example.com/offsite.pdf">offsite</a>
          <a href="/dam/de/sem/readme.pdf">relative</a>
          <a href="mailto:test@example.com">mail</a>
          <a href="https://cms.news.admin.ch/dam/de/sem/new/stat-jahr-2025-kommentar-d.pdf">duplicate</a>
        </body>
      </html>
    `;

    expect(
      extractSameFamilyPdfUrlsFromHtml(html, "https://www.news.admin.ch/de/newnsb/example"),
    ).toEqual([
      "https://cms.news.admin.ch/dam/de/sem/new/stat-jahr-2025-kommentar-d.pdf",
      "https://cms.news.admin.ch/dam/de/sem/old/stat-jahr-2024-kommentar-d.pdf",
      "https://www.news.admin.ch/dam/de/sem/readme.pdf",
    ]);
  });

  it("keeps middle and late sections when bounding long document text", () => {
    const text = [
      "HEAD ".repeat(600),
      "MIDDLE_TARGET ".repeat(600),
      "LATE_TARGET ".repeat(600),
      "TAIL ".repeat(600),
    ].join("");

    const excerpt = buildDistributedExcerpt(text, 6000);

    expect(excerpt.length).toBeLessThanOrEqual(6000);
    expect(excerpt).toContain("HEAD");
    expect(excerpt).toContain("MIDDLE_TARGET");
    expect(excerpt).toContain("LATE_TARGET");
    expect(excerpt).toContain("TAIL");
  });

  it("discovers feed endpoints and listing links before linked PDFs", () => {
    const landingHtml = `
      <div data-url="/sem/de/home/publiservice/statistik/asylstatistik/_jcr_content/par/rel_0001/items/262/tabpar/nsbnewslist.entries.html"></div>
      <a href="/dam/sem/de/data/publiservice/statistik/asylstatistik/asylstatistik-lesehinweise-d.pdf.download.pdf/asylstatistik-lesehinweise-d.pdf">pdf</a>
    `;
    const feedHtml = `
      <div class="list-group-item">
        <a href="https://news.admin.ch/de/newnsb/usCV50HNHTFP">Asylstatistik Februar 2026</a>
      </div>
      <div class="list-group-item">
        <a href="https://news.admin.ch/de/newnsb/iiAHV0k5TFjK">Asylstatistik 2025</a>
      </div>
    `;

    expect(
      extractSameFamilyFollowUpUrlsFromHtml(
        landingHtml,
        "https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik.html",
      ),
    ).toEqual([
      "https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/_jcr_content/par/rel_0001/items/262/tabpar/nsbnewslist.entries.html",
      "https://www.sem.admin.ch/dam/sem/de/data/publiservice/statistik/asylstatistik/asylstatistik-lesehinweise-d.pdf.download.pdf/asylstatistik-lesehinweise-d.pdf",
    ]);

    expect(
      extractSameFamilyFollowUpUrlsFromHtml(
        feedHtml,
        "https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/_jcr_content/par/rel_0001/items/262/tabpar/nsbnewslist.entries.html",
      ),
    ).toEqual([
      "https://news.admin.ch/de/newnsb/usCV50HNHTFP",
      "https://news.admin.ch/de/newnsb/iiAHV0k5TFjK",
    ]);
  });
});
