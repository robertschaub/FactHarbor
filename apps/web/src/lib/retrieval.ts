import dns from "dns/promises";
import net from "net";
import { URL } from "url";

const MAX_BYTES = 2_000_000; // 2MB

function isPrivateIp(ip: string): boolean {
  // IPv4
  if (net.isIP(ip) === 4) {
    const parts = ip.split(".").map((x) => parseInt(x, 10));
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }
  // IPv6 (coarse)
  if (net.isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1") return true;
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

export async function extractTextFromUrl(urlStr: string): Promise<string> {
  const url = new URL(urlStr);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }
  if (url.username || url.password) {
    throw new Error("URLs with embedded credentials are not allowed");
  }

  await resolveAndCheck(url.hostname);

  const res = await fetch(url.toString(), { redirect: "follow" });
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
