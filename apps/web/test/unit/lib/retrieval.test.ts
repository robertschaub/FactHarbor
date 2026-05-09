import { describe, expect, it } from "vitest";
import {
  buildDistributedExcerpt,
  extractSameFamilyDocumentUrlsFromHtml,
  extractSameFamilyFollowUpUrlsFromHtml,
  extractSameFamilyPdfUrlsFromHtml,
  extractTextFromHtml,
  extractTextFromXlsxBuffer,
  requireExtractedPdfText,
} from "@/lib/retrieval";

function makeStoredZip(entries: Array<{ name: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const content = Buffer.from(entry.content, "utf8");
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt32LE(0, 10);
    localHeader.writeUInt32LE(0, 14);
    localHeader.writeUInt32LE(content.length, 18);
    localHeader.writeUInt32LE(content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, content);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt32LE(0, 12);
    centralHeader.writeUInt32LE(0, 16);
    centralHeader.writeUInt32LE(content.length, 20);
    centralHeader.writeUInt32LE(content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + content.length;
  }

  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralData.length, 12);
  eocd.writeUInt32LE(localData.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([localData, centralData, eocd]);
}

describe("retrieval linked-document discovery", () => {
  it("rejects PDFs whose extracted text is empty after cleanup", () => {
    expect(() => requireExtractedPdfText("   \n\t  ")).toThrow(
      "Extracted PDF text is empty",
    );
  });

  it("preserves extracted PDF text when content is present", () => {
    expect(requireExtractedPdfText("  Important paragraph  ")).toBe("Important paragraph");
  });

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

  it("keeps same-family spreadsheet and plain-data links as document follow-ups", () => {
    const html = `
      <html>
        <body>
          <a href="/dam/sem/de/data/statistics/current-table.xlsx.download.xlsx/current-table.xlsx">xlsx</a>
          <a href="/dam/sem/de/data/statistics/current-data.csv">csv</a>
          <a href="https://www.example.com/offsite.xlsx">offsite</a>
          <a href="/dam/sem/de/data/statistics/current-report.pdf">pdf</a>
        </body>
      </html>
    `;

    expect(
      extractSameFamilyDocumentUrlsFromHtml(
        html,
        "https://www.sem.admin.ch/sem/de/home/publiservice/statistik/asylstatistik/aktuell.html",
      ),
    ).toEqual([
      "https://www.sem.admin.ch/dam/sem/de/data/statistics/current-table.xlsx.download.xlsx/current-table.xlsx",
      "https://www.sem.admin.ch/dam/sem/de/data/statistics/current-data.csv",
      "https://www.sem.admin.ch/dam/sem/de/data/statistics/current-report.pdf",
    ]);
  });

  it("extracts shared strings, inline strings, and numeric values from XLSX sheets", () => {
    const buffer = makeStoredZip([
      {
        name: "xl/sharedStrings.xml",
        content: `<sst><si><t>Header</t></si><si><t>Value &amp; Unit</t></si></sst>`,
      },
      {
        name: "xl/worksheets/sheet1.xml",
        content: `
          <worksheet>
            <sheetData>
              <row><c t="s"><v>0</v></c><c><v>235057</v></c></row>
              <row><c t="inlineStr"><is><t>Total</t></is></c><c t="s"><v>1</v></c></row>
            </sheetData>
          </worksheet>
        `,
      },
    ]);

    const text = extractTextFromXlsxBuffer(buffer);

    expect(text).toContain("# Sheet: xl/worksheets/sheet1.xml");
    expect(text).toContain("Header | 235057");
    expect(text).toContain("Total | Value & Unit");
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
