/**
 * FactHarbor URL Retrieval Module
 * 
 * Extracts text content from URLs, including:
 * - HTML pages (via cheerio)
 * - PDF documents (via pdf-parse v1)
 * 
 * @version 1.1.5 - Using pdf-parse v1 for Next.js compatibility
 */

import * as cheerio from "cheerio";

/**
 * Extract text from PDF buffer using pdf-parse v1
 * v1 API: pdf(buffer) returns Promise<{text, numpages, info}>
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

    // pdf-parse v1 is a simple function
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require("pdf-parse");

    console.log("[Retrieval] Using pdf-parse v1 to extract text from", buffer.length, "bytes");

    const data = await pdfParse(buffer);

    console.log(`[Retrieval] PDF parsed: ${data.numpages} pages, ${data.text?.length || 0} chars`);

    return data.text || "";
  } catch (err: any) {
    console.error("[Retrieval] PDF parse error:", err);
    // Provide more helpful error message
    if (err.message && err.message.includes('ENOENT')) {
      throw new Error(`PDF parsing failed: This appears to be a library test error. The PDF content may be corrupted or the server may have returned an error page instead of a PDF.`);
    }
    throw new Error(`Failed to parse PDF: ${err.message || err}`);
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
  const { timeoutMs = 10000, maxLength = 50000 } = options;
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    console.log("[Retrieval] Fetching URL:", url);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
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
