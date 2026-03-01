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
import * as os from "os";
import * as path from "path";
import { Worker } from "worker_threads";

// Default timeout for PDF parsing (ms)
const DEFAULT_PDF_PARSE_TIMEOUT_MS = 60000;

// Maximum response body size to buffer (10 MB). Enforced both via Content-Length pre-check
// and streaming cumulative-byte checks for chunked responses without Content-Length.
const MAX_RESPONSE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Returns true if the hostname resolves to a private, loopback, link-local, or
 * otherwise reserved address range. Used to block SSRF attempts.
 *
 * Checks:
 *  - Loopback / localhost
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
  if (host === "localhost") return true;

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

  return false;
}

/**
 * Validates a URL is safe for outbound fetching.
 * Throws an Error with a descriptive message if the URL is unsafe.
 *
 * Enforces:
 *  - Only http: and https: schemes are permitted
 *  - Private/reserved IP ranges and localhost are blocked (SSRF protection)
 */
function validateUrlForFetch(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `URL scheme not allowed: ${parsed.protocol} (only http and https are permitted)`,
    );
  }

  if (isPrivateOrReservedHost(parsed.hostname)) {
    throw new Error(
      `URL host not allowed: fetching from private or reserved IP ranges is blocked`,
    );
  }
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

/**
 * Extract text from HTML
 */
function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, footer, header elements
  $("script, style, nav, footer, header, aside, .sidebar, .menu, .nav, .advertisement, .ad").remove();
  
  // Try to find main content
  let content = "";
  
  // Priority selectors for main content
  const contentSelectors = [
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
  ];
  
  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length > 0) {
      content = el.text();
      break;
    }
  }
  
  // Fallback to body
  if (!content) {
    content = $("body").text();
  }
  
  // Clean up whitespace
  return content
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
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
): Promise<{ text: string; title: string; contentType: string }> {
  const { timeoutMs = 30000, maxLength = 50000, pdfParseTimeoutMs = DEFAULT_PDF_PARSE_TIMEOUT_MS } = options;

  // SSRF: validate URL before any network access
  validateUrlForFetch(url);

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
        validateUrlForFetch(response.url);
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
        text: text.slice(0, maxLength),
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
    const text = extractTextFromHtml(html);
    
    return {
      text: text.slice(0, maxLength),
      title,
      contentType: contentType.split(";")[0] || "text/html",
    };
    
  } finally {
    clearTimeout(timeout);
  }
}
