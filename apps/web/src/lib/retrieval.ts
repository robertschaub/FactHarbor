import dns from "dns/promises";
import net from "net";
import { URL } from "url";

const MAX_BYTES = 2_000_000; // 2MB
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 15_000;

function isPrivateIp(ip: string): boolean {
  // IPv4
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map((x) => parseInt(x, 10));
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 192 && b === 0) return true; // 192.0.0.0/24 (protocol assignments)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 (benchmarking)
    if (a >= 224) return true; // multicast/reserved/broadcast
    return false;
  }
  // IPv6 (coarse)
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
    if (lower === "::") return true;
    if (lower.startsWith("fe80:")) return true; // link-local
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
    return false;
  }
  return true;
}

async function resolveAndCheck(hostname: string) {
  const addrs = await dns.lookup(hostname, { all: true });
  for (const a of addrs) {
    if (isPrivateIp(a.address)) {
      throw new Error("Blocked URL host (private/loopback address)");
    }
  }
}

function validateUrlForFetch(url: URL) {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }
}

async function checkHost(url: URL) {
  // Block obvious local hostnames even if DNS is weird.
  const hostLower = url.hostname.toLowerCase();
  if (hostLower === "localhost" || hostLower.endsWith(".localhost")) {
    throw new Error("Blocked URL host (localhost)");
  }

  // If the hostname is a literal IP, validate it directly.
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) {
      throw new Error("Blocked URL host (private/loopback address)");
    }
    return;
  }

  await resolveAndCheck(url.hostname);
}

async function fetchWithSafeRedirects(initialUrl: URL): Promise<Response> {
  let current = new URL(initialUrl.toString());

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    validateUrlForFetch(current);
    await checkHost(current);

    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(current.toString(), { redirect: "manual", signal: ac.signal });
    } finally {
      clearTimeout(t);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("Redirect without location header");

      const next = new URL(location, current);
      current = next;
      continue;
    }

    return res;
  }

  throw new Error("Too many redirects");
}

export async function extractTextFromUrl(urlStr: string): Promise<string> {
  const url = new URL(urlStr);

  validateUrlForFetch(url);
  const res = await fetchWithSafeRedirects(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const contentType = res.headers.get("content-type") ?? "";
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  let total = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > MAX_BYTES) throw new Error("Response too large");
      chunks.push(value);
    }
  }

  const buf = Buffer.concat(chunks);
  const raw = buf.toString("utf-8");

  // POC: naive extraction (strip tags lightly)
  if (contentType.includes("text/html")) {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return raw.trim();
}
