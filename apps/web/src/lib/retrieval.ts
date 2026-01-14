/**
 * FactHarbor URL Retrieval Module
 *
 * Extracts text content from URLs, including:
 * - HTML pages (via cheerio)
 * - PDF documents (via pdf2json)
 *
 * @version 1.2.3 - Added timeout to PDF parsing to prevent hangs
 */

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { Worker } from "worker_threads";

// Default timeout for PDF parsing (ms) - can be overridden via environment variable
const PDF_PARSE_TIMEOUT_MS = parseInt(process.env.FH_PDF_PARSE_TIMEOUT_MS || "60000", 10);

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
async function extractTextFromPdfBuffer(buffer: Buffer, timeoutMs: number = PDF_PARSE_TIMEOUT_MS): Promise<string> {
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
            console.log(`[Retrieval] Extracted ${String(msg.text || "").length} characters of text`);
            resolve(String(msg.text || ""));
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
  const { timeoutMs = 30000, maxLength = 50000, pdfParseTimeoutMs = PDF_PARSE_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.log("[Retrieval] Fetching URL:", url);

    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive",
      },
    });

    console.log("[Retrieval] Response status:", response.status, "Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    // Handle PDF
    if (isPdfUrl(url, contentType)) {
      console.log("[Retrieval] Processing as PDF");
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

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
    
    // Handle HTML
    const html = await response.text();
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

/**
 * Batch extract text from multiple URLs
 */
export async function extractTextFromUrls(
  urls: string[],
  options: {
    timeoutMs?: number;
    maxLength?: number;
    concurrency?: number;
  } = {}
): Promise<Array<{ url: string; text: string; title: string; error?: string }>> {
  const { concurrency = 3 } = options;
  const results: Array<{ url: string; text: string; title: string; error?: string }> = [];
  
  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        try {
          const { text, title } = await extractTextFromUrl(url, options);
          return { url, text, title };
        } catch (err) {
          return { url, text: "", title: "", error: String(err) };
        }
      })
    );
    results.push(...batchResults);
  }
  
  return results;
}
