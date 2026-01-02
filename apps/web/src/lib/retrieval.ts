/**
 * FactHarbor URL Retrieval Module
 *
 * Extracts text content from URLs, including:
 * - HTML pages (via cheerio)
 * - PDF documents (via pdf2json)
 *
 * @version 1.2.2 - Using pdf2json for reliable Node.js PDF parsing
 */

import * as cheerio from "cheerio";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";

/**
 * Extract text from PDF buffer using pdf2json
 * This library works reliably in Node.js/Next.js environments
 */
async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
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

      // Use pdf2json to parse the PDF
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const PDFParser = require("pdf2json");
      const pdfParser = new PDFParser();

      console.log("[Retrieval] Starting PDF extraction...");

      // Parse the PDF
      const parsePromise = new Promise<string>((resolve, reject) => {
        pdfParser.on("pdfParser_dataError", (errData: any) => {
          reject(new Error(errData.parserError || "PDF parsing failed"));
        });

        pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
          try {
            let fullText = "";

            // Extract text from all pages
            if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
              for (const page of pdfData.Pages) {
                if (page.Texts && Array.isArray(page.Texts)) {
                  for (const text of page.Texts) {
                    if (text.R && Array.isArray(text.R)) {
                      for (const run of text.R) {
                        if (run.T) {
                          // Decode URI-encoded text, handle malformed URIs
                          try {
                            const decodedText = decodeURIComponent(run.T);
                            fullText += decodedText + " ";
                          } catch (decodeErr) {
                            // If decoding fails, use the raw text
                            fullText += run.T + " ";
                          }
                        }
                      }
                    }
                  }
                }
                fullText += "\n";
              }
            }

            console.log("[Retrieval] PDF extraction completed successfully");
            console.log(`[Retrieval] PDF has ${pdfData.Pages?.length || 0} pages`);
            console.log(`[Retrieval] Extracted ${fullText.length} characters of text`);

            resolve(fullText.trim());
          } catch (err) {
            reject(err);
          }
        });

        pdfParser.loadPDF(tmpFile);
      });

      const text = await parsePromise;
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
  } = {}
): Promise<{ text: string; title: string; contentType: string }> {
  const { timeoutMs = 30000, maxLength = 50000 } = options;

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

      const text = await extractTextFromPdfBuffer(buffer);

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
