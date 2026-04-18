import { describe, expect, it } from "vitest";
import {
  buildDistributedExcerpt,
  extractSameFamilyFollowUpUrlsFromHtml,
  extractSameFamilyPdfUrlsFromHtml,
} from "@/lib/retrieval";

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
