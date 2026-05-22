import { describe, expect, it } from "vitest";
import {
  SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_HTML_LINKS_PER_PAGE,
  discoverSameHostHtmlExpansionUrls,
  discoverSameHostXlsxAttachmentUrls,
  extractBoundedTextFromXlsxAttachmentBuffer,
} from "@/lib/analyzer-v2-runtime/source-acquisition-xlsx-attachment-source-material";

function localFileHeader(name: string, data: Buffer): Buffer {
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(data.byteLength, 18);
  header.writeUInt32LE(data.byteLength, 22);
  header.writeUInt16LE(nameBytes.byteLength, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, nameBytes, data]);
}

function centralDirectoryHeader(name: string, data: Buffer, localOffset: number): Buffer {
  const nameBytes = Buffer.from(name, "utf8");
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(0, 16);
  header.writeUInt32LE(data.byteLength, 20);
  header.writeUInt32LE(data.byteLength, 24);
  header.writeUInt16LE(nameBytes.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  return Buffer.concat([header, nameBytes]);
}

function minimalZip(entries: readonly { readonly name: string; readonly data: string }[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const data = Buffer.from(entry.data, "utf8");
    const local = localFileHeader(entry.name, data);
    const central = centralDirectoryHeader(entry.name, data, offset);
    localParts.push(local);
    centralParts.push(central);
    offset += local.byteLength;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDirectory.byteLength, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

function minimalXlsx(): Buffer {
  return minimalZip([
    {
      name: "xl/sharedStrings.xml",
      data: [
        "<sst>",
        "<si><t>Monthly stock table</t></si>",
        "<si><t>Total persons in process</t></si>",
        "</sst>",
      ].join(""),
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: [
        "<worksheet><sheetData>",
        "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c></row>",
        "<row r=\"7\"><c r=\"A7\" t=\"s\"><v>1</v></c><c r=\"B7\"><v>135078</v></c></row>",
        "</sheetData></worksheet>",
      ].join(""),
    },
  ]);
}

describe("source acquisition XLSX attachment source material", () => {
  it("extracts bounded cell-coordinate text from an XLSX buffer", () => {
    const outcome = extractBoundedTextFromXlsxAttachmentBuffer(minimalXlsx());

    expect(outcome.status).toBe("success");
    if (outcome.status !== "success") {
      return;
    }
    expect(outcome.text).toContain("# Worksheet 1: xl/worksheets/sheet1.xml");
    expect(outcome.text).toContain("A7=Total persons in process");
    expect(outcome.text).toContain("B7=135078");
    expect(outcome.byteLength).toBeLessThanOrEqual(4_096);
    expect(outcome.cellCount).toBe(3);
    expect(outcome.text).not.toContain("://");
  });

  it("fails closed for invalid buffers", () => {
    expect(extractBoundedTextFromXlsxAttachmentBuffer(Buffer.from("not a zip"))).toEqual({
      status: "failed",
      stopReason: "xlsx_zip_invalid",
    });
  });

  it("discovers only same-host HTTPS XLSX attachments from a linked page", () => {
    const urls = discoverSameHostXlsxAttachmentUrls({
      pageUrl: new URL("https://example.admin.test/path/page.html"),
      htmlText: [
        "<a href=\"/data/report.xlsx\">ok</a>",
        "<a href=\"https://other.admin.test/data/other.xlsx\">cross host</a>",
        "<a href=\"http://example.admin.test/data/insecure.xlsx\">insecure</a>",
        "<a href=\"https://example.admin.test/data/report.xlsx#frag\">hash</a>",
        "<a href=\"https://example.admin.test/data/report.xlsx.download.xlsx/file.xlsx\">ok2</a>",
      ].join(""),
    });

    expect(urls.map((url) => url.toString())).toEqual([
      "https://example.admin.test/data/report.xlsx",
      "https://example.admin.test/data/report.xlsx.download.xlsx/file.xlsx",
    ]);
  });

  it("discovers same-section same-host HTML expansion links in document order", () => {
    const urls = discoverSameHostHtmlExpansionUrls({
      pageUrl: new URL("https://example.admin.test/path/statistics.html"),
      htmlText: [
        "<a href=\"/home.html\">shallower navigation</a>",
        "<a href=\"/path/archive/2026/04.html\">first same section</a>",
        "<a href=\"https://example.admin.test/path/archive/2026/03.html#frag\">hash rejected</a>",
        "<a href=\"http://example.admin.test/path/archive/2026/02.html\">http rejected</a>",
        "<a href=\"https://other.admin.test/path/archive/2026/01.html\">cross host rejected</a>",
        "<a href=\"https://example.admin.test/path/archive/2025/12.xlsx\">xlsx handled elsewhere</a>",
        "<a href=\"https://example.admin.test/path/archive/2025/11.pdf\">non-html file rejected</a>",
        "<a href=\"/path/archive/2025/10.html\">second same section</a>",
        "<a href=\"/path/archive/2025/09.html\">cap rejected</a>",
      ].join(""),
    });

    expect(urls).toHaveLength(SERPER_XLSX_ATTACHMENT_MAX_EXPANSION_HTML_LINKS_PER_PAGE);
    expect(urls.map((url) => url.toString())).toEqual([
      "https://example.admin.test/path/archive/2026/04.html",
      "https://example.admin.test/path/archive/2025/10.html",
    ]);
  });
});
