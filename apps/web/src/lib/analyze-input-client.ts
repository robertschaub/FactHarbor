export type AnalyzeInputType = "url" | "text";

export function isLikelyUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return true;
  }

  return /^(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed);
}

export function normalizeAnalyzeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function getAnalyzeInputType(input: string): AnalyzeInputType {
  return isLikelyUrl(input) ? "url" : "text";
}

export function normalizeAnalyzeInputValue(input: string): {
  inputType: AnalyzeInputType;
  inputValue: string;
} {
  const inputType = getAnalyzeInputType(input);
  return {
    inputType,
    inputValue: inputType === "url" ? normalizeAnalyzeUrl(input) : input.trim(),
  };
}
