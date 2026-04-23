type JobLike = {
  jobId: string;
  status: string;
  progress: number;
  updatedUtc: string;
};

function parseUtcTimestampMs(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = /(?:Z|[+\-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`;
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
}

export function mergePolledJobSnapshot<T extends JobLike>(previous: T | null, incoming: T): T {
  if (!previous || previous.jobId !== incoming.jobId) {
    return incoming;
  }

  const previousUpdatedMs = parseUtcTimestampMs(previous.updatedUtc);
  const incomingUpdatedMs = parseUtcTimestampMs(incoming.updatedUtc);
  if (
    previousUpdatedMs !== null &&
    incomingUpdatedMs !== null &&
    incomingUpdatedMs < previousUpdatedMs
  ) {
    return previous;
  }

  const shouldPreserveRunningProgress =
    previous.status === "RUNNING" &&
    incoming.status === "RUNNING" &&
    incoming.progress < previous.progress;

  if (!shouldPreserveRunningProgress) {
    return incoming;
  }

  return {
    ...incoming,
    progress: previous.progress,
  };
}

export function mergePolledJobSummaries<T extends JobLike>(previous: T[], incoming: T[]): T[] {
  if (previous.length === 0) return incoming;

  const previousByJobId = new Map(previous.map((job) => [job.jobId, job]));
  return incoming.map((job) => mergePolledJobSnapshot(previousByJobId.get(job.jobId) ?? null, job));
}
