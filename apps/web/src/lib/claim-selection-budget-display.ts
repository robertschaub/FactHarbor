export function formatBudgetDurationDisplay(valueMs: number | undefined): string {
  if (valueMs === undefined) return "";

  const totalSeconds = Math.round(valueMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (seconds === 0) {
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }

  if (minutes === 0) {
    return seconds === 1 ? "1 sec" : `${seconds} sec`;
  }

  return `${minutes} min ${seconds === 1 ? "1 sec" : `${seconds} sec`}`;
}

const MILLISECOND_DURATION_PATTERN = /\b(\d(?:[\d\s,']*\d)?)\s*ms\b/g;

export function formatBudgetFitRationaleDisplay(rationale: string): string {
  return rationale.replace(MILLISECOND_DURATION_PATTERN, (match, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (!digitsOnly) return match;

    const valueMs = Number(digitsOnly);
    if (!Number.isFinite(valueMs)) return match;

    return formatBudgetDurationDisplay(valueMs);
  });
}
