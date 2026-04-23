import { describe, expect, it } from "vitest";

import { mergePolledJobSnapshot, mergePolledJobSummaries } from "@/lib/job-polling";

type TestJob = {
  jobId: string;
  status: string;
  progress: number;
  updatedUtc: string;
};

describe("mergePolledJobSnapshot", () => {
  it("accepts the first snapshot as-is", () => {
    const incoming: TestJob = {
      jobId: "job-1",
      status: "RUNNING",
      progress: 12,
      updatedUtc: "2026-04-23T10:00:00.000Z",
    };

    expect(mergePolledJobSnapshot(null, incoming)).toEqual(incoming);
  });

  it("keeps the newer snapshot when an older response arrives late", () => {
    const previous: TestJob = {
      jobId: "job-1",
      status: "RUNNING",
      progress: 55,
      updatedUtc: "2026-04-23T10:05:00.000Z",
    };
    const incoming: TestJob = {
      jobId: "job-1",
      status: "RUNNING",
      progress: 0,
      updatedUtc: "2026-04-23T10:00:00.000Z",
    };

    expect(mergePolledJobSnapshot(previous, incoming)).toEqual(previous);
  });

  it("preserves monotonic progress for same-job RUNNING snapshots", () => {
    const previous: TestJob = {
      jobId: "job-1",
      status: "RUNNING",
      progress: 55,
      updatedUtc: "2026-04-23T10:05:00.000Z",
    };
    const incoming: TestJob = {
      jobId: "job-1",
      status: "RUNNING",
      progress: 44,
      updatedUtc: "2026-04-23T10:05:00.000Z",
    };

    expect(mergePolledJobSnapshot(previous, incoming)).toEqual({
      ...incoming,
      progress: 55,
    });
  });
});

describe("mergePolledJobSummaries", () => {
  it("merges each incoming job against the previous list by jobId", () => {
    const previous: TestJob[] = [
      {
        jobId: "job-1",
        status: "RUNNING",
        progress: 60,
        updatedUtc: "2026-04-23T10:05:00.000Z",
      },
      {
        jobId: "job-2",
        status: "QUEUED",
        progress: 0,
        updatedUtc: "2026-04-23T10:00:00.000Z",
      },
    ];
    const incoming: TestJob[] = [
      {
        jobId: "job-1",
        status: "RUNNING",
        progress: 15,
        updatedUtc: "2026-04-23T10:01:00.000Z",
      },
      {
        jobId: "job-2",
        status: "RUNNING",
        progress: 5,
        updatedUtc: "2026-04-23T10:06:00.000Z",
      },
    ];

    expect(mergePolledJobSummaries(previous, incoming)).toEqual([
      previous[0],
      incoming[1],
    ]);
  });
});
