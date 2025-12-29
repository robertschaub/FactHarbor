import fs from "node:fs";
import path from "node:path";

import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWeb } from "@/lib/web-search";

type SourceInput = {
  url: string;
  title?: string;
  sourceType?: "NewsOutlet" | "AcademicJournal" | "GovernmentAgency" | "NGO" | "ThinkTank" | "Court" | "InternationalOrg" | "Other";
  trackRecordScore?: number;
};

type SourceBundleConfig = {
  sources: SourceInput[];
};

export type SourceBundle = {
  sources: Array<{
    id: string;
    url: string;
    title: string | null;
    sourceType: SourceInput["sourceType"] | null;
    trackRecordScore: number | null;
    excerpt: string;
  }>;
};

type BuildSourceBundleOptions = {
  inputText: string;
  onEvent?: (message: string, progress: number) => void;
};

const DEFAULT_MAX_SOURCES = 6;
const DEFAULT_EXCERPT_CHARS = 1200;

function parseUrls(text: string): string[] {
  const matches = text.match(/\bhttps?:\/\/[^\s)]+/gi) ?? [];
  const unique = new Set(matches.map((m) => m.replace(/[),.;]+$/, "")));
  return Array.from(unique);
}

function loadSourceConfig(configPath: string): SourceBundleConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as SourceBundleConfig;
}

function resolveConfigPath(): string | null {
  const custom = process.env.FH_SOURCE_BUNDLE_PATH;
  if (!custom) return null;
  if (path.isAbsolute(custom)) return custom;
  return path.resolve(process.cwd(), custom);
}

export async function buildSourceBundle(opts: BuildSourceBundleOptions): Promise<SourceBundle> {
  const onEvent = opts.onEvent ?? (() => {});
  const maxSources = Math.max(1, parseInt(process.env.FH_SOURCE_BUNDLE_MAX_SOURCES ?? "", 10) || DEFAULT_MAX_SOURCES);
  const excerptChars = Math.max(200, parseInt(process.env.FH_SOURCE_BUNDLE_EXCERPT_CHARS ?? "", 10) || DEFAULT_EXCERPT_CHARS);

  const sources: SourceInput[] = [];
  const configPath = resolveConfigPath();
  if (configPath) {
    const config = loadSourceConfig(configPath);
    if (config?.sources?.length) {
      sources.push(...config.sources);
    }
  }

  for (const url of parseUrls(opts.inputText)) {
    if (!sources.some((s) => s.url === url)) {
      sources.push({ url });
    }
  }

  const enableSearch = (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() !== "false";
  if (enableSearch) {
    const query = (process.env.FH_SEARCH_QUERY ?? opts.inputText).slice(0, 400).trim();
    const hasSearchKey = Boolean(process.env.SERPAPI_API_KEY || (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID));
    if (query && hasSearchKey) {
      await onEvent("Searching web", 25);
      const domainWhitelist = (process.env.FH_SEARCH_DOMAIN_WHITELIST ?? "")
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
      const results = await searchWeb({
        query,
        maxResults: Math.max(1, parseInt(process.env.FH_SEARCH_MAX_RESULTS ?? "", 10) || 6),
        domainWhitelist
      });
      for (const r of results) {
        if (!sources.some((s) => s.url === r.url)) {
          sources.push({ url: r.url, title: r.title });
        }
      }
    }
  }

  const trimmed = sources.slice(0, maxSources);
  if (trimmed.length === 0) {
    return { sources: [] };
  }

  await onEvent("Fetching sources", 30);

  const results: SourceBundle["sources"] = [];
  for (let i = 0; i < trimmed.length; i += 1) {
    const source = trimmed[i];
    try {
      const text = await extractTextFromUrl(source.url);
      const excerpt = text.slice(0, excerptChars);
      results.push({
        id: `S${i + 1}`,
        url: source.url,
        title: source.title ?? null,
        sourceType: source.sourceType ?? null,
        trackRecordScore: source.trackRecordScore ?? null,
        excerpt
      });
    } catch {
      results.push({
        id: `S${i + 1}`,
        url: source.url,
        title: source.title ?? null,
        sourceType: source.sourceType ?? null,
        trackRecordScore: source.trackRecordScore ?? null,
        excerpt: ""
      });
    }
  }

  return { sources: results };
}
