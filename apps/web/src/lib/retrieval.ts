/**
 * FactHarbor URL Retrieval Module
 *
 * Extracts text content from URLs, including:
 * - HTML pages (via cheerio)
 * - PDF documents (via pdf2json)
 *
 * @version 1.3.0 - SSRF hardening: private IP blocking, scheme enforcement, redirect validation, size cap
 */

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import { lookup } from "dns/promises";
import * as os from "os";
import * as path from "path";
import { Worker } from "worker_threads";
import { getFamilyDomain } from "@/lib/domain-utils";

// Default timeout for PDF parsing (ms)
const DEFAULT_PDF_PARSE_TIMEOUT_MS = 60000;

// Maximum response body size to buffer (10 MB). Enforced both via Content-Length pre-check
// and streaming cumulative-byte checks for chunked responses without Content-Length.
const MAX_RESPONSE_SIZE_BYTES = 10 * 1024 * 1024;

export interface ExtractedUrlContent {
  text: string;
  title: string;
  contentType: string;
  discoveredDocumentUrls?: string[];
  discoveredFollowUpUrls?: string[];
}

const HTML_CONTENT_REMOVAL_SELECTORS =
  "script, style, nav, footer, header, aside, .sidebar, .menu, .nav, .advertisement, .ad";

const MAIN_CONTENT_SELECTORS = [
  "article",
  "main",
  "[role='main']",
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content",
  "#content",
  ".post",
  ".article",
] as const;

const BLOCK_TEXT_SELECTORS = [
  "p",
  "li",
  "section",
  "article",
  "main",
  "div",
  "blockquote",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "dl",
  "dt",
  "dd",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
].join(", ");

/**
 * Returns true if the hostname resolves to a private, loopback, link-local, or
 * otherwise reserved address range. Used to block SSRF attempts.
 *
 * Checks:
 *  - Loopback / localhost / *.localhost
 *  - RFC 1918 private ranges (10/8, 172.16/12, 192.168/16)
 *  - Link-local / AWS metadata (169.254/16)
 *  - Shared address space (100.64/10)
 *  - Multicast (224/4) and reserved (240/4)
 *  - IPv6 loopback, link-local, unique-local, multicast
 */
function isPrivateOrReservedHost(hostname: string): boolean {
  // Strip IPv6 brackets e.g. [::1]
  const host = hostname.startsWith("[")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();

  // Obvious name-based loopback
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  // IPv4
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 127) return true;                          // 127.0.0.0/8 loopback
    if (a === 0) return true;                             // 0.0.0.0/8 this-network
    if (a === 10) return true;                            // 10.0.0.0/8 RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true;    // 172.16.0.0/12 RFC1918
    if (a === 192 && b === 168) return true;              // 192.168.0.0/16 RFC1918
    if (a === 169 && b === 254) return true;              // 169.254.0.0/16 link-local / AWS metadata
    if (a === 100 && b >= 64 && b <= 127) return true;   // 100.64.0.0/10 shared address space
    if (a >= 224 && a <= 239) return true;               // 224.0.0.0/4 multicast
    if (a >= 240) return true;                            // 240.0.0.0/4 reserved
    return false;
  }

  // IPv6
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;  // loopback
  if (host === "::" || host === "0:0:0:0:0:0:0:0") return true;   // unspecified
  if (host.startsWith("fe80:") || host.startsWith("fe80::")) return true; // link-local
  if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique-local (fc00::/7)
  if (host.startsWith("ff")) return true;                           // multicast
  if (host.startsWith("::ffff:")) {
    // IPv6-mapped IPv4 literal, e.g. ::ffff:127.0.0.1
    const mappedIpv4 = host.slice("::ffff:".length);
    return isPrivateOrReservedHost(mappedIpv4);
  }
  const uncompressedMappedIpv4 = host.match(
    /^(?:0{1,4}:){5}ffff:(\d{1,3}(?:\.\d{1,3}){3})$/,
  );
  if (uncompressedMappedIpv4) {
    // Uncompressed IPv6-mapped IPv4 literal, e.g. 0:0:0:0:0:ffff:127.0.0.1
    return isPrivateOrReservedHost(uncompressedMappedIpv4[1]);
  }

  return false;
}

/**
 * Resolves a hostname to its IP address(es) and validates them against
 * private/reserved ranges to prevent DNS rebinding attacks.
 */
async function resolveAndValidateHost(hostname: string): Promise<void> {
  // Fast-path: check the hostname string itself (no DNS needed for obvious IPs or localhost)
  if (isPrivateOrReservedHost(hostname)) {
    throw new Error(
      "URL host not allowed: private or reserved address ranges are blocked",
    );
  }

  try {
    // Resolve hostname to all associated IP addresses
    const addresses = await lookup(hostname, { all: true });
    for (const { address } of addresses) {
      if (isPrivateOrReservedHost(address)) {
        throw new Error(
          "URL host not allowed: private or reserved address ranges are blocked",
        );
      }
    }
  } catch (err: any) {
    // If DNS resolution fails, the host is unreachable anyway.
    // ENOTFOUND is common for invalid domains.
    if (err.code === "ENOTFOUND") return;
    // For other errors (timeout, system error), we block to be safe.
    if (err.message?.includes("URL host not allowed")) throw err;
    throw new Error("URL host validation failed");
  }
}

/**
 * Validates a URL is safe for outbound fetching.
 * Throws an Error with a descriptive message if the URL is unsafe.
 *
 * Enforces:
 *  - Only http: and https: schemes are permitted
 *  - Private/reserved IP ranges and localhost are blocked (SSRF protection)
 */
async function validateUrlForFetch(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL provided");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `URL scheme not allowed: ${parsed.protocol} (only http and https are permitted)`,
    );
  }

  await resolveAndValidateHost(parsed.hostname);
}

/**
 * Clean up PDF-extracted text that has spurious spaces from character-level extraction.
 * Fixes issues like "so cial m edia" -> "social media"
 */
function cleanupPdfText(text: string): string {
  if (!text) return text;
  
  // Step 1: Fix single-letter words that should be joined (e.g., "so cial" -> "social")
  // Pattern: lowercase letter, space, lowercase letter(s) where the result would be a word
  // We do this iteratively to handle cases like "m e d i a"
  let cleaned = text;
  let prev = "";
  
  // Iterate up to 10 times to handle severely fragmented text
  for (let i = 0; i < 10 && cleaned !== prev; i++) {
    prev = cleaned;
    // Join single lowercase letter followed by space and more lowercase letters
    // This handles "so cial" -> "social", "m edia" -> "media"
    cleaned = cleaned.replace(/\b([a-zäöüß])\s+([a-zäöüß]+)\b/gi, (match, p1, p2) => {
      // Only join if it looks like a fragmented word (both parts are short or p1 is single char)
      if (p1.length === 1 && p2.length <= 10) {
        return p1 + p2;
      }
      return match;
    });
  }
  
  // Step 2: Collapse multiple spaces into single space
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  
  // Step 3: Fix spacing around punctuation
  cleaned = cleaned.replace(/\s+([.,;:!?)])/g, "$1");
  cleaned = cleaned.replace(/([(\[])\s+/g, "$1");
  
  // Step 4: Fix common patterns like "– " at start becoming " – "
  cleaned = cleaned.replace(/\s+([-–—])\s+/g, " $1 ");
  
  return cleaned.trim();
}

const PDF2JSON_WORKER_CODE = `
/* eslint-disable */
const { parentPort, workerData } = require("worker_threads");

// Reduce noisy pdf.js warnings that can flood logs and make dev servers appear hung.
// Keep other warnings intact.
const originalWarn = console.warn;
console.warn = (...args) => {
  try {
    const msg = args && args.length ? String(args[0]) : "";
    if (
      msg.startsWith("Warning: TT:") ||
      msg.includes("Unsupported: field.type of Link") ||
      msg.includes("NOT valid form element") ||
      msg.includes("complementing a missing function tail")
    ) {
      return;
    }
  } catch {}
  return originalWarn(...args);
};

async function run() {
  const tmpFile = workerData && workerData.tmpFile;
  if (!tmpFile) throw new Error("Missing tmpFile");

  const PDFParser = require("pdf2json");
  const pdfParser = new PDFParser();

  const text = await new Promise((resolve, reject) => {
    pdfParser.on("pdfParser_dataError", (errData) => {
      reject(new Error((errData && errData.parserError) || "PDF parsing failed"));
    });

    pdfParser.on("pdfParser_dataReady", (pdfData) => {
      try {
        let fullText = "";
        if (pdfData && pdfData.Pages && Array.isArray(pdfData.Pages)) {
          for (const page of pdfData.Pages) {
            if (page && page.Texts && Array.isArray(page.Texts)) {
              for (const text of page.Texts) {
                if (text && text.R && Array.isArray(text.R)) {
                  for (const run of text.R) {
                    if (run && run.T) {
                      try {
                        fullText += decodeURIComponent(run.T) + " ";
                      } catch {
                        fullText += String(run.T) + " ";
                      }
                    }
                  }
                }
              }
            }
            // Append a real newline between pages (avoid escape-sequence ambiguity in embedded worker code).
            fullText += String.fromCharCode(10);
          }
        }
        resolve(fullText.trim());
      } catch (e) {
        reject(e);
      }
    });

    pdfParser.loadPDF(tmpFile);
  });

  return text;
}

run()
  .then((text) => {
    parentPort.postMessage({ ok: true, text });
  })
  .catch((err) => {
    parentPort.postMessage({ ok: false, error: (err && err.message) ? err.message : String(err) });
  })
  .finally(() => {
    try { parentPort.close(); } catch {}
  });
`;

/**
 * Extract text from PDF buffer using pdf2json
 * This library works reliably in Node.js/Next.js environments
 * 
 * @param buffer - PDF file buffer
 * @param timeoutMs - Parsing timeout in ms (default: 60 seconds)
 */
async function extractTextFromPdfBuffer(buffer: Buffer, timeoutMs: number = DEFAULT_PDF_PARSE_TIMEOUT_MS): Promise<string> {
  try {
    // Validate buffer before parsing
    if (!buffer || buffer.length === 0) {
      throw new Error("PDF buffer is empty");
    }

    // Check if buffer starts with PDF magic bytes (%PDF)
    const pdfMagic = buffer.toString('ascii', 0, 4);
    if (pdfMagic !== '%PDF') {
      console.error("[Retrieval] Buffer does not contain valid PDF data. First 200 bytes:", buffer.toString('utf8', 0, Math.min(200, buffer.length)));
      throw new Error(`Invalid PDF format. Content starts with: ${pdfMagic}`);
    }

    console.log("[Retrieval] Using pdf2json to extract text from", buffer.length, "bytes");
    console.log("[Retrieval] PDF magic bytes verified:", pdfMagic);

    // pdf2json requires a file path, so write buffer to temp file
    const tmpDir = os.tmpdir();
    const tmpFile = path.join(tmpDir, `pdf-${Date.now()}-${Math.random().toString(36).substring(7)}.pdf`);

    try {
      await fs.writeFile(tmpFile, buffer);
      console.log("[Retrieval] Wrote PDF to temp file:", tmpFile);

      console.log("[Retrieval] Starting PDF extraction (timeout:", timeoutMs, "ms)...");

      // IMPORTANT: pdf2json parsing can continue running even after a Promise.race timeout rejects.
      // To make timeouts actually stop CPU/log spam, we run pdf2json in a Worker thread and terminate it on timeout.
      const text = await new Promise<string>((resolve, reject) => {
        const worker = new Worker(PDF2JSON_WORKER_CODE, {
          eval: true,
          workerData: { tmpFile },
        });

        let finished = false;
        const timeout = setTimeout(async () => {
          if (finished) return;
          finished = true;
          try {
            await worker.terminate();
          } catch {
            // ignore
          }
          reject(
            new Error(
              `PDF parsing timeout after ${timeoutMs}ms - PDF may be malformed, too large, or very slow to parse`,
            ),
          );
        }, timeoutMs);

        worker.once("message", async (msg: any) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);

          try {
            await worker.terminate();
          } catch {
            // ignore
          }

          if (msg?.ok) {
            console.log("[Retrieval] PDF extraction completed successfully");
            const rawText = String(msg.text || "");
            const cleanedText = cleanupPdfText(rawText);
            console.log(`[Retrieval] Extracted ${rawText.length} chars, cleaned to ${cleanedText.length} chars`);
            resolve(cleanedText);
            return;
          }
          reject(new Error(msg?.error || "PDF parsing failed"));
        });

        worker.once("error", async (err: any) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          try {
            await worker.terminate();
          } catch {
            // ignore
          }
          reject(err);
        });

        worker.once("exit", (code) => {
          // If the worker exits before sending a message, treat it as an error.
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          reject(new Error(`PDF parsing worker exited unexpectedly (code ${code})`));
        });
      });

      return text;

    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tmpFile);
        console.log("[Retrieval] Cleaned up temp file");
      } catch (cleanupErr) {
        console.warn("[Retrieval] Failed to clean up temp file:", cleanupErr);
      }
    }
  } catch (err: any) {
    console.error("[Retrieval] PDF extraction error:", err);
    console.error("[Retrieval] Error stack:", err.stack);
    throw new Error(`Failed to extract PDF text: ${err.message || err}`);
  }
}

/**
 * Check if URL points to a PDF
 */
function isPdfUrl(url: string, contentType?: string): boolean {
  // Check content-type header
  if (contentType?.includes("application/pdf")) {
    return true;
  }
  // Check URL extension
  const urlLower = url.toLowerCase();
  return urlLower.endsWith(".pdf") || urlLower.includes(".pdf?");
}

function extractYearScore(value: string): number {
  const matches = value.match(/\b(?:19|20)\d{2}\b/g);
  if (!matches) return 0;
  return Math.max(...matches.map((match) => Number.parseInt(match, 10)));
}

/**
 * Discover linked PDF artifacts from an already-fetched HTML page.
 * Restricting follow-ups to the same family domain keeps navigation bounded
 * while still allowing common publisher asset hosts (for example sibling CDN/CMS hosts).
 */
export function extractSameFamilyPdfUrlsFromHtml(html: string, pageUrl: string): string[] {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return [];
  }

  const pageFamilyDomain = getFamilyDomain(page.hostname);
  const $ = cheerio.load(html);
  const discovered = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    let resolved: URL;
    try {
      resolved = new URL(href, page);
    } catch {
      return;
    }

    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return;
    if (!isPdfUrl(resolved.href)) return;
    if (resolved.href === page.href) return;
    if (getFamilyDomain(resolved.hostname) !== pageFamilyDomain) return;

    discovered.add(resolved.toString());
  });

  return Array.from(discovered).sort((left, right) => {
    const yearDelta = extractYearScore(right) - extractYearScore(left);
    if (yearDelta !== 0) return yearDelta;
    const pathDelta = right.split("/").length - left.split("/").length;
    if (pathDelta !== 0) return pathDelta;
    return left.localeCompare(right);
  });
}

function normalizeDiscoveryUrl(resolved: URL): string {
  resolved.hash = "";
  return resolved.toString();
}

function resolveSameFamilyUrl(rawUrl: string, pageUrl: string): string | null {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return null;
  }

  let resolved: URL;
  try {
    resolved = new URL(rawUrl, page);
  } catch {
    return null;
  }

  if (resolved.protocol !== "http:" && resolved.protocol !== "https:") return null;
  if (getFamilyDomain(resolved.hostname) !== getFamilyDomain(page.hostname)) return null;

  const normalized = normalizeDiscoveryUrl(resolved);
  if (normalized === normalizeDiscoveryUrl(page)) return null;
  return normalized;
}

function extractSameFamilyFeedUrlsFromHtml(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const discovered = new Set<string>();
  const ordered: string[] = [];

  $("[data-url]").each((_, element) => {
    const dataUrl = $(element).attr("data-url");
    if (!dataUrl) return;
    const resolved = resolveSameFamilyUrl(dataUrl, pageUrl);
    if (!resolved || isPdfUrl(resolved)) return;

    let parsed: URL;
    try {
      parsed = new URL(resolved);
    } catch {
      return;
    }

    if (parsed.pathname.endsWith("/par.html")) return;
    if (discovered.has(resolved)) return;
    discovered.add(resolved);
    ordered.push(resolved);
  });

  return ordered.sort((left, right) => {
    const leftDepth = left.split("/").length;
    const rightDepth = right.split("/").length;
    if (rightDepth !== leftDepth) return rightDepth - leftDepth;
    return left.localeCompare(right);
  });
}

function extractSameFamilyListingUrlsFromHtml(html: string, pageUrl: string): string[] {
  let page: URL;
  try {
    page = new URL(pageUrl);
  } catch {
    return [];
  }

  if (!page.pathname.endsWith(".entries.html")) return [];

  const $ = cheerio.load(html);
  const discovered = new Set<string>();
  const ordered: string[] = [];

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const resolved = resolveSameFamilyUrl(href, pageUrl);
    if (!resolved || isPdfUrl(resolved) || discovered.has(resolved)) return;
    discovered.add(resolved);
    ordered.push(resolved);
  });

  return ordered;
}

export function extractSameFamilyFollowUpUrlsFromHtml(html: string, pageUrl: string): string[] {
  const merged = [
    ...extractSameFamilyFeedUrlsFromHtml(html, pageUrl),
    ...extractSameFamilyListingUrlsFromHtml(html, pageUrl),
    ...extractSameFamilyPdfUrlsFromHtml(html, pageUrl),
  ];

  const seen = new Set<string>();
  return merged.filter((url) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function buildDistributedExcerpt(
  text: string,
  maxLength: number,
  segmentCount = 4,
): string {
  if (text.length <= maxLength) return text;
  if (maxLength <= 0) return "";

  const separator = "\n\n[...] \n\n";
  const boundedSegmentCount = Math.max(2, segmentCount);
  const availableLength = maxLength - separator.length * (boundedSegmentCount - 1);
  if (availableLength <= boundedSegmentCount * 400) {
    return text.slice(0, maxLength);
  }

  const segmentLength = Math.floor(availableLength / boundedSegmentCount);
  const starts: number[] = [];
  for (let index = 0; index < boundedSegmentCount; index++) {
    if (index === 0) {
      starts.push(0);
      continue;
    }
    if (index === boundedSegmentCount - 1) {
      starts.push(Math.max(0, text.length - segmentLength));
      continue;
    }
    const ratio = index / (boundedSegmentCount - 1);
    starts.push(Math.floor((text.length - segmentLength) * ratio));
  }

  const normalizedStarts = starts.filter((start, index) => index === 0 || start > starts[index - 1]);
  const segments = normalizedStarts.map((start) => text.slice(start, start + segmentLength).trim());
  return segments.join(separator).slice(0, maxLength);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function collapseAdjacentDuplicateLines(lines: string[]): string[] {
  const deduplicated: string[] = [];
  for (const rawLine of lines) {
    const line = normalizeWhitespace(rawLine);
    if (!line) continue;
    if (deduplicated[deduplicated.length - 1] === line) continue;
    deduplicated.push(line);
  }
  return deduplicated;
}

function selectPrimaryContentRoot($: cheerio.CheerioAPI): cheerio.Cheerio<any> {
  for (const selector of MAIN_CONTENT_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length > 0) {
      return candidate;
    }
  }

  const body = $("body").first();
  return body.length > 0 ? body : $.root();
}

function extractStructuredTextFromRoot(root: cheerio.Cheerio<any>): string {
  if (root.length === 0) return "";

  const clone = root.clone();
  clone.find(HTML_CONTENT_REMOVAL_SELECTORS).remove();
  clone.find("br").replaceWith("\n");
  clone.find(BLOCK_TEXT_SELECTORS).append("\n");

  const lines = collapseAdjacentDuplicateLines(clone.text().split(/\n+/));
  return lines.join("\n").trim();
}

function getRequestedFragmentIds(requestedUrl?: string): string[] {
  if (!requestedUrl) return [];

  try {
    const parsed = new URL(requestedUrl);
    const rawFragment = parsed.hash.startsWith("#")
      ? parsed.hash.slice(1)
      : parsed.hash;
    if (!rawFragment || rawFragment.startsWith(":~:")) {
      return [];
    }

    const fragmentIds = new Set<string>();
    const normalizedRaw = rawFragment.trim();
    if (normalizedRaw) {
      fragmentIds.add(normalizedRaw);
    }

    try {
      const decoded = decodeURIComponent(rawFragment).trim();
      if (decoded) {
        fragmentIds.add(decoded);
      }
    } catch {
      // Keep the raw hash if decoding fails.
    }

    return Array.from(fragmentIds);
  } catch {
    return [];
  }
}

function findFragmentTarget(
  $: cheerio.CheerioAPI,
  fragmentIds: string[],
): cheerio.Cheerio<any> | null {
  if (fragmentIds.length === 0) return null;

  for (const fragmentId of fragmentIds) {
    const exact = $("[id],[name]")
      .filter((_, element) => {
        const id = $(element).attr("id");
        const name = $(element).attr("name");
        return id === fragmentId || name === fragmentId;
      })
      .first();

    if (exact.length > 0) {
      return exact;
    }
  }

  const normalizedIds = new Set(fragmentIds.map((fragmentId) => fragmentId.trim().toLowerCase()));
  const normalizedMatch = $("[id],[name]")
    .filter((_, element) => {
      const id = ($(element).attr("id") ?? "").trim().toLowerCase();
      const name = ($(element).attr("name") ?? "").trim().toLowerCase();
      return normalizedIds.has(id) || normalizedIds.has(name);
    })
    .first();

  return normalizedMatch.length > 0 ? normalizedMatch : null;
}

function isUsefulFragmentCandidate(candidateText: string, fullTextLength: number): boolean {
  const lines = candidateText.split(/\n+/).filter(Boolean);
  if (candidateText.length >= fullTextLength) return false;
  if (candidateText.length >= 180) return true;
  return candidateText.length >= 120 && lines.length >= 2;
}

function tryExtractFragmentScopedText(
  $: cheerio.CheerioAPI,
  contentRoot: cheerio.Cheerio<any>,
  requestedUrl?: string,
): { text: string; strategy: string } | null {
  const fragmentIds = getRequestedFragmentIds(requestedUrl);
  if (fragmentIds.length === 0) return null;

  const fragmentTarget = findFragmentTarget($, fragmentIds);
  if (!fragmentTarget || fragmentTarget.length === 0) {
    return null;
  }

  const contentRootNode = contentRoot.get(0);
  if (!contentRootNode) {
    return null;
  }

  const fullText = extractStructuredTextFromRoot(contentRoot);
  if (!fullText) {
    return null;
  }

  const ancestorNodes = [fragmentTarget.get(0), ...fragmentTarget.parents().toArray()];
  const seen = new Set<any>();

  for (const node of ancestorNodes) {
    if (!node || seen.has(node)) continue;
    seen.add(node);

    if (node === contentRootNode) {
      break;
    }

    const isInsideRoot = contentRoot.find(node).length > 0;
    if (!isInsideRoot) {
      continue;
    }

    const candidateText = extractStructuredTextFromRoot($(node));
    if (!candidateText) {
      continue;
    }

    if (!isUsefulFragmentCandidate(candidateText, fullText.length)) {
      continue;
    }

    const tagName = String((node as { tagName?: unknown }).tagName ?? "node").toLowerCase();
    return {
      text: candidateText,
      strategy: `fragment:${tagName}`,
    };
  }

  return null;
}

/**
 * Extract text from HTML
 */
export function extractTextFromHtml(
  html: string,
  options: { requestedUrl?: string } = {},
): string {
  const $ = cheerio.load(html);

  $(HTML_CONTENT_REMOVAL_SELECTORS).remove();
  const contentRoot = selectPrimaryContentRoot($);

  const fragmentScoped = tryExtractFragmentScopedText($, contentRoot, options.requestedUrl);
  if (fragmentScoped) {
    console.log(
      `[Retrieval] Applied fragment-scoped HTML extraction (${fragmentScoped.strategy}) for ${options.requestedUrl}`,
    );
    return fragmentScoped.text;
  }

  return extractStructuredTextFromRoot(contentRoot);
}

/**
 * Read a response body while enforcing a strict cumulative byte cap.
 * This closes the chunked-transfer gap where Content-Length is absent.
 */
async function readResponseBodyWithLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
  const stream = response.body;
  if (!stream) {
    throw new Error("Response body is empty");
  }

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("Response exceeds configured size limit");
        throw new Error(
          `Response too large: exceeded the ${maxBytes / 1024 / 1024} MB limit`,
        );
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

/**
 * Fetch and extract text from a URL
 * Supports HTML pages and PDF documents
 */
export async function extractTextFromUrl(
  url: string,
  options: {
    timeoutMs?: number;
    maxLength?: number;
    pdfParseTimeoutMs?: number;
  } = {}
): Promise<ExtractedUrlContent> {
  const { timeoutMs = 30000, maxLength = 50000, pdfParseTimeoutMs = DEFAULT_PDF_PARSE_TIMEOUT_MS } = options;

  // SSRF: validate URL before any network access
  await validateUrlForFetch(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log("[Retrieval] Fetching URL:", url);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
      },
    });

    // SSRF: validate the final URL after redirect following to catch open-redirect attacks
    if (response.url && response.url !== url) {
      try {
        await validateUrlForFetch(response.url);
      } catch {
        throw new Error(`Redirect target blocked: destination is a private or reserved address`);
      }
    }

    console.log("[Retrieval] Response status:", response.status, "Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    // SSRF/DoS: enforce response size cap via Content-Length before buffering
    const contentLengthStr = response.headers.get("content-length");
    if (contentLengthStr) {
      const contentLength = parseInt(contentLengthStr, 10);
      if (!isNaN(contentLength) && contentLength > MAX_RESPONSE_SIZE_BYTES) {
        throw new Error(
          `Response too large: ${contentLength} bytes exceeds the ${MAX_RESPONSE_SIZE_BYTES / 1024 / 1024} MB limit`,
        );
      }
    }

    const contentType = response.headers.get("content-type") || "";

    // Handle PDF
    if (isPdfUrl(url, contentType)) {
      console.log("[Retrieval] Processing as PDF");
      const responseBytes = await readResponseBodyWithLimit(response, MAX_RESPONSE_SIZE_BYTES);
      const buffer = Buffer.from(responseBytes);

      console.log("[Retrieval] Downloaded PDF buffer size:", buffer.length, "bytes");

      const text = await extractTextFromPdfBuffer(buffer, pdfParseTimeoutMs);

      // Extract title from URL (last path segment before .pdf)
      const urlPath = new URL(url).pathname;
      const filename = urlPath.split("/").pop() || "document";
      const title = filename.replace(/\.pdf$/i, "").replace(/[_-]/g, " ");

      console.log("[Retrieval] PDF extraction complete. Title:", title, "Text length:", text.length);

      return {
        text: buildDistributedExcerpt(text, maxLength),
        title,
        contentType: "application/pdf",
      };
    }
    
    // Handle HTML with streaming size enforcement for chunked/no-Content-Length responses.
    const htmlBytes = await readResponseBodyWithLimit(response, MAX_RESPONSE_SIZE_BYTES);
    const html = new TextDecoder("utf-8").decode(htmlBytes);
    const $ = cheerio.load(html);
    
    // Extract title
    let title = $("title").text().trim();
    if (!title) {
      title = $("h1").first().text().trim() || new URL(url).hostname;
    }
    
    // Extract text
    const text = extractTextFromHtml(html, { requestedUrl: url });
    const discoveredDocumentUrls = extractSameFamilyPdfUrlsFromHtml(html, response.url || url);
    
    return {
      text: text.slice(0, maxLength),
      title,
      contentType: contentType.split(";")[0] || "text/html",
      discoveredDocumentUrls,
      discoveredFollowUpUrls: extractSameFamilyFollowUpUrlsFromHtml(html, response.url || url),
    };
    
  } finally {
    clearTimeout(timeout);
  }
}
