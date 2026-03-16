import { getDomain } from "tldts";

export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "").replace(/\.+$/, "");
}

export function extractNormalizedHostname(url: string): string | null {
  try {
    return normalizeHostname(new URL(url).hostname);
  } catch {
    return null;
  }
}

export function getFamilyDomain(domain: string): string {
  const normalized = normalizeHostname(domain);
  return getDomain(normalized, {
    allowIcannDomains: true,
    allowPrivateDomains: true,
  }) ?? normalized;
}

export function getDomainLookupChain(domain: string): string[] {
  const normalized = normalizeHostname(domain);
  const familyDomain = getFamilyDomain(normalized);
  return familyDomain === normalized ? [normalized] : [normalized, familyDomain];
}
