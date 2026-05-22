import { inflateRawSync } from "node:zlib";

export const SERPER_XLSX_ATTACHMENT_MAX_LINKS_PER_PAGE = 3;
export const SERPER_XLSX_ATTACHMENT_FETCH_RESPONSE_BYTE_CAP = 1_048_576;
export const SERPER_XLSX_ATTACHMENT_MAX_SHEETS = 3;
export const SERPER_XLSX_ATTACHMENT_MAX_ROWS_PER_SHEET = 120;
export const SERPER_XLSX_ATTACHMENT_MAX_CELLS_PER_ROW = 24;
export const SERPER_XLSX_ATTACHMENT_MAX_ENTRY_UNCOMPRESSED_BYTES = 1_048_576;
export const SERPER_XLSX_ATTACHMENT_MAX_TEXT_BYTES = 4_096;

type ZipEntry = {
  readonly fileName: string;
  readonly compressionMethod: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
};

export type BoundedXlsxAttachmentTextOutcome =
  | {
      readonly status: "success";
      readonly text: string;
      readonly byteLength: number;
      readonly truncated: boolean;
      readonly sheetCount: number;
      readonly rowCount: number;
      readonly cellCount: number;
    }
  | {
      readonly status: "failed";
      readonly stopReason:
        | "xlsx_buffer_empty"
        | "xlsx_zip_invalid"
        | "xlsx_entry_too_large"
        | "xlsx_shared_strings_invalid"
        | "xlsx_sheet_missing"
        | "xlsx_text_empty"
        | "xlsx_text_structural_rejected";
    };

const FORBIDDEN_TEXT_FRAGMENTS = [
  "://",
  "www.",
  "api_key",
  "apikey",
  "secret",
  "token",
  "password",
  "credential",
  "bearer",
  "sk_",
] as const;

function decodeHtmlEntity(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d{1,6});/g, (_match, code: string) => {
      const parsed = Number(code);
      return Number.isInteger(parsed) && parsed > 0 ? String.fromCodePoint(parsed) : " ";
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (_match, code: string) => {
      const parsed = Number.parseInt(code, 16);
      return Number.isInteger(parsed) && parsed > 0 ? String.fromCodePoint(parsed) : " ";
    });
}

function normalizeText(value: string): string {
  return decodeHtmlEntity(value)
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

function containsForbiddenTextFragment(value: string): boolean {
  const lower = value.toLowerCase();
  return FORBIDDEN_TEXT_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const signature = 0x06054b50;
  const minimumOffset = Math.max(0, buffer.length - 0xffff - 22);
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === signature) {
      return offset;
    }
  }
  return -1;
}

function listZipEntries(buffer: Buffer): readonly ZipEntry[] {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) {
    throw new Error("xlsx_zip_invalid");
  }
  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  if (entryCount <= 0 || centralDirectoryOffset <= 0 || centralDirectoryOffset >= buffer.length) {
    throw new Error("xlsx_zip_invalid");
  }

  const entries: ZipEntry[] = [];
  let offset = centralDirectoryOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("xlsx_zip_invalid");
    }
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const fileNameStart = offset + 46;
    const fileNameEnd = fileNameStart + fileNameLength;
    if (fileNameEnd > buffer.length || localHeaderOffset >= buffer.length) {
      throw new Error("xlsx_zip_invalid");
    }
    entries.push({
      fileName: buffer.subarray(fileNameStart, fileNameEnd).toString("utf8"),
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset = fileNameEnd + extraLength + commentLength;
  }
  return entries;
}

function readZipEntry(buffer: Buffer, entry: ZipEntry): Buffer {
  if (entry.uncompressedSize > SERPER_XLSX_ATTACHMENT_MAX_ENTRY_UNCOMPRESSED_BYTES) {
    throw new Error("xlsx_entry_too_large");
  }
  const offset = entry.localHeaderOffset;
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== 0x04034b50) {
    throw new Error("xlsx_zip_invalid");
  }
  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const dataEnd = dataStart + entry.compressedSize;
  if (dataStart > buffer.length || dataEnd > buffer.length) {
    throw new Error("xlsx_zip_invalid");
  }
  const compressed = buffer.subarray(dataStart, dataEnd);
  if (entry.compressionMethod === 0) {
    return compressed;
  }
  if (entry.compressionMethod === 8) {
    const inflated = inflateRawSync(compressed);
    if (inflated.byteLength > SERPER_XLSX_ATTACHMENT_MAX_ENTRY_UNCOMPRESSED_BYTES) {
      throw new Error("xlsx_entry_too_large");
    }
    return inflated;
  }
  throw new Error("xlsx_zip_invalid");
}

function tagAttribute(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return match?.[1] ?? null;
}

function extractTextElements(xml: string): string {
  const parts: string[] = [];
  for (const match of xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/gi)) {
    const text = normalizeText(match[1] ?? "");
    if (text.length > 0) {
      parts.push(text);
    }
  }
  return parts.join(" ");
}

function extractSharedStrings(xml: string | null): readonly string[] {
  if (!xml) {
    return [];
  }
  const strings: string[] = [];
  for (const match of xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/gi)) {
    strings.push(extractTextElements(match[1] ?? ""));
  }
  return strings;
}

function cellReference(cellXml: string, fallbackIndex: number, rowNumber: string): string {
  const explicit = tagAttribute(cellXml, "r");
  if (explicit && /^[A-Z]{1,4}[0-9]{1,7}$/i.test(explicit)) {
    return explicit.toUpperCase();
  }
  return `${columnName(fallbackIndex)}${rowNumber}`;
}

function columnName(index: number): string {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function extractCellValue(cellXml: string, sharedStrings: readonly string[]): string | null {
  const type = tagAttribute(cellXml, "t") ?? "";
  const inlineText = type === "inlineStr" ? extractTextElements(cellXml) : "";
  if (inlineText.length > 0) {
    return inlineText;
  }
  const valueMatch = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/i);
  const rawValue = normalizeText(valueMatch?.[1] ?? "");
  if (rawValue.length === 0) {
    return null;
  }
  if (type === "s") {
    const index = Number.parseInt(rawValue, 10);
    return sharedStrings[index] && sharedStrings[index].length > 0 ? sharedStrings[index] : rawValue;
  }
  return rawValue;
}

function appendBoundedLine(
  output: string[],
  line: string,
  currentBytes: number,
): { readonly byteLength: number; readonly appended: boolean; readonly truncated: boolean } {
  const separatorBytes = output.length > 0 ? 1 : 0;
  const lineBytes = utf8ByteLength(line);
  if (currentBytes + separatorBytes + lineBytes <= SERPER_XLSX_ATTACHMENT_MAX_TEXT_BYTES) {
    output.push(line);
    return {
      byteLength: currentBytes + separatorBytes + lineBytes,
      appended: true,
      truncated: false,
    };
  }
  return {
    byteLength: currentBytes,
    appended: false,
    truncated: true,
  };
}

export function extractBoundedTextFromXlsxAttachmentBuffer(
  buffer: Buffer,
): BoundedXlsxAttachmentTextOutcome {
  if (!buffer || buffer.length === 0) {
    return { status: "failed", stopReason: "xlsx_buffer_empty" };
  }
  let entries: readonly ZipEntry[];
  try {
    entries = listZipEntries(buffer);
  } catch {
    return { status: "failed", stopReason: "xlsx_zip_invalid" };
  }
  const entryByName = new Map(entries.map((entry) => [entry.fileName, entry] as const));
  let sharedStrings: readonly string[];
  try {
    const sharedStringsEntry = entryByName.get("xl/sharedStrings.xml");
    sharedStrings = extractSharedStrings(
      sharedStringsEntry ? readZipEntry(buffer, sharedStringsEntry).toString("utf8") : null,
    );
  } catch (error) {
    return {
      status: "failed",
      stopReason: error instanceof Error && error.message === "xlsx_entry_too_large"
        ? "xlsx_entry_too_large"
        : "xlsx_shared_strings_invalid",
    };
  }

  const sheetEntries = entries
    .filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.fileName))
    .sort((left, right) => left.fileName.localeCompare(right.fileName, undefined, { numeric: true }))
    .slice(0, SERPER_XLSX_ATTACHMENT_MAX_SHEETS);
  if (sheetEntries.length === 0) {
    return { status: "failed", stopReason: "xlsx_sheet_missing" };
  }

  const output: string[] = [];
  let byteLength = 0;
  let rowCount = 0;
  let cellCount = 0;
  let truncated = false;
  try {
    for (const [sheetIndex, sheetEntry] of sheetEntries.entries()) {
      const sheetHeader = `# Worksheet ${sheetIndex + 1}: ${sheetEntry.fileName}`;
      const headerAppend = appendBoundedLine(output, sheetHeader, byteLength);
      byteLength = headerAppend.byteLength;
      truncated = truncated || headerAppend.truncated;
      if (truncated) {
        break;
      }
      const sheetXml = readZipEntry(buffer, sheetEntry).toString("utf8");
      let rowsInSheet = 0;
      for (const rowMatch of sheetXml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/gi)) {
        if (rowsInSheet >= SERPER_XLSX_ATTACHMENT_MAX_ROWS_PER_SHEET) {
          truncated = true;
          break;
        }
        const rowXml = rowMatch[0] ?? "";
        const rowNumber = tagAttribute(rowXml, "r") ?? String(rowCount + 1);
        const cells: string[] = [];
        let cellIndex = 0;
        for (const cellMatch of rowXml.matchAll(/<c(?:\s[^>]*)?>([\s\S]*?)<\/c>/gi)) {
          if (cellIndex >= SERPER_XLSX_ATTACHMENT_MAX_CELLS_PER_ROW) {
            truncated = true;
            break;
          }
          const cellXml = cellMatch[0] ?? "";
          const value = extractCellValue(cellXml, sharedStrings);
          if (value && value.length > 0) {
            const reference = cellReference(cellXml, cellIndex, rowNumber);
            cells.push(`${reference}=${value}`);
            cellCount += 1;
          }
          cellIndex += 1;
        }
        if (cells.length === 0) {
          continue;
        }
        const append = appendBoundedLine(output, `Row ${rowNumber}: ${cells.join(" | ")}`, byteLength);
        byteLength = append.byteLength;
        truncated = truncated || append.truncated;
        if (!append.appended) {
          break;
        }
        rowCount += 1;
        rowsInSheet += 1;
      }
      if (truncated) {
        break;
      }
    }
  } catch (error) {
    return {
      status: "failed",
      stopReason: error instanceof Error && error.message === "xlsx_entry_too_large"
        ? "xlsx_entry_too_large"
        : "xlsx_zip_invalid",
    };
  }

  const text = output.join("\n").trim();
  if (text.length === 0 || rowCount === 0 || cellCount === 0) {
    return { status: "failed", stopReason: "xlsx_text_empty" };
  }
  if (containsForbiddenTextFragment(text)) {
    return { status: "failed", stopReason: "xlsx_text_structural_rejected" };
  }
  return {
    status: "success",
    text,
    byteLength: utf8ByteLength(text),
    truncated,
    sheetCount: sheetEntries.length,
    rowCount,
    cellCount,
  };
}

function decodeHref(value: string): string {
  return decodeHtmlEntity(value).trim();
}

function xlsxPathIsSupported(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return path.endsWith(".xlsx") || path.includes(".xlsx/");
}

function safeSameHostXlsxUrl(rawHref: string, baseUrl: URL): URL | null {
  const decoded = decodeHref(rawHref);
  if (decoded.length === 0 || decoded.length > 2_048) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(decoded, baseUrl);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:"
    || url.username.length > 0
    || url.password.length > 0
    || url.hash.length > 0
    || url.hostname.toLowerCase() !== baseUrl.hostname.toLowerCase()
    || !xlsxPathIsSupported(url)
  ) {
    return null;
  }
  return url;
}

export function discoverSameHostXlsxAttachmentUrls(params: {
  readonly htmlText: string;
  readonly pageUrl: URL;
  readonly maxLinks?: number;
}): readonly URL[] {
  const maxLinks = params.maxLinks ?? SERPER_XLSX_ATTACHMENT_MAX_LINKS_PER_PAGE;
  const links: URL[] = [];
  const seen = new Set<string>();
  for (const match of params.htmlText.matchAll(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    if (links.length >= maxLinks) {
      break;
    }
    const rawHref = match[1] ?? match[2] ?? match[3] ?? "";
    const url = safeSameHostXlsxUrl(rawHref, params.pageUrl);
    if (!url) {
      continue;
    }
    const key = url.toString();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    links.push(url);
  }
  return links;
}

export function responseLooksLikeXlsxAttachment(params: {
  readonly url: URL;
  readonly contentType: string | null;
}): boolean {
  const contentType = (params.contentType ?? "").toLowerCase();
  return contentType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    || contentType.startsWith("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;")
    || xlsxPathIsSupported(params.url);
}
