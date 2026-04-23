import { describe, expect, it } from "vitest";
import {
  buildDistributedExcerpt,
  extractSameFamilyFollowUpUrlsFromHtml,
  extractSameFamilyPdfUrlsFromHtml,
  extractTextFromHtml,
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

  it("bounds HTML extraction to a fragment-scoped ancestor section when the target is a nested anchor", () => {
    const html = `
      <html>
        <body>
          <article>
            <section>
              <h2>Overview</h2>
              <p>This intro should not survive fragment scoping.</p>
            </section>
            <section class="faq-item">
              <h2><a id="target-section"></a>Question B</h2>
              <h2>Question B</h2>
              <p>
                Answer B explains the targeted topic in enough detail to form a
                meaningful bounded extraction. It should stay in the result while
                unrelated neighboring FAQ entries are dropped from the extracted text.
              </p>
            </section>
            <section>
              <h2>Question C</h2>
              <p>This unrelated section should also be excluded.</p>
            </section>
          </article>
        </body>
      </html>
    `;

    const text = extractTextFromHtml(html, {
      requestedUrl: "https://example.com/faq#target-section",
    });

    expect(text).toContain("Question B");
    expect(text).toContain("Answer B explains the targeted topic");
    expect(text).not.toContain("Overview");
    expect(text).not.toContain("Question C");
    expect(text.match(/Question B/g)?.length ?? 0).toBe(1);
  });

  it("falls back to the primary content root when no fragment target is found", () => {
    const html = `
      <html>
        <body>
          <article>
            <section>
              <h2>Overview</h2>
              <p>This intro stays when no fragment match exists.</p>
            </section>
            <section>
              <h2>Question B</h2>
              <h2>Question B</h2>
              <p>Duplicate adjacent headings should still collapse to one line.</p>
            </section>
            <section>
              <h2>Question C</h2>
              <p>This content stays in the whole-page fallback.</p>
            </section>
          </article>
        </body>
      </html>
    `;

    const text = extractTextFromHtml(html, {
      requestedUrl: "https://example.com/faq#missing-fragment",
    });

    expect(text).toContain("Overview");
    expect(text).toContain("Question B");
    expect(text).toContain("Question C");
    expect(text.match(/Question B/g)?.length ?? 0).toBe(1);
  });
});
