import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getEventListeners } from "node:events";
import { createMinIntervalThrottle } from "@/lib/search-throttle";

describe("createMinIntervalThrottle", () => {
  it("spaces sequential acquisitions at least intervalMs apart", async () => {
    const acquire = createMinIntervalThrottle(50);
    const stamps: number[] = [];
    await Promise.all([
      acquire().then(() => stamps.push(Date.now())),
      acquire().then(() => stamps.push(Date.now())),
      acquire().then(() => stamps.push(Date.now())),
    ]);
    stamps.sort((a, b) => a - b);
    expect(stamps[1] - stamps[0]).toBeGreaterThanOrEqual(45);
    expect(stamps[2] - stamps[1]).toBeGreaterThanOrEqual(45);
  });

  it("does not delay when intervalMs is 0", async () => {
    const acquire = createMinIntervalThrottle(0);
    const start = Date.now();
    await Promise.all([acquire(), acquire(), acquire()]);
    expect(Date.now() - start).toBeLessThan(40);
  });

  it("serializes acquisitions in call order", async () => {
    const acquire = createMinIntervalThrottle(20);
    const order: number[] = [];
    const p1 = acquire().then(() => order.push(1));
    const p2 = acquire().then(() => order.push(2));
    const p3 = acquire().then(() => order.push(3));
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });
});

describe("cancelled throttle waiters", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2030-01-01")); });
  afterEach(() => { vi.useRealTimers(); });

  it("rejects a pre-aborted waiter without delaying the next acquisition", async () => {
    const acquire = createMinIntervalThrottle(100);
    const signal = AbortSignal.abort(new Error("cancelled before queuing"));
    await expect(acquire(signal)).rejects.toBe(signal.reason);
    await acquire();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects a queued waiter immediately and preserves other consumers' order and spacing", async () => {
    const acquire = createMinIntervalThrottle(100);
    const start = Date.now();
    await acquire();
    const stamps: number[] = [];
    const live = acquire().then(() => stamps.push(Date.now() - start));
    const parent = new AbortController();
    const cancelled = acquire(parent.signal).catch(error => error);
    const next = acquire().then(() => stamps.push(Date.now() - start));
    await vi.advanceTimersByTimeAsync(0);
    parent.abort(new Error("queued cancellation"));
    expect(await cancelled).toBe(parent.signal.reason);
    expect(Date.now() - start).toBe(0);
    expect(stamps).toEqual([]);
    await vi.advanceTimersByTimeAsync(100);
    await live;
    expect(stamps).toEqual([100]);
    await vi.advanceTimersByTimeAsync(100);
    await next;
    expect(stamps).toEqual([100, 200]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears an active cancelled timer without shortening the next live interval", async () => {
    const acquire = createMinIntervalThrottle(100);
    await acquire();
    const parent = new AbortController();
    const cancelled = acquire(parent.signal).catch(error => error);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    parent.abort(new Error("active cancellation"));
    expect(await cancelled).toBe(parent.signal.reason);
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
    let granted = false;
    const next = acquire().then(() => { granted = true; });
    await vi.advanceTimersByTimeAsync(99);
    expect(granted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await next;
    expect(granted).toBe(true);
  });

  it("settles forty cancellations without advancing time, leaked listeners or warnings", async () => {
    const acquire = createMinIntervalThrottle(100);
    await acquire();
    const parent = new AbortController();
    const signals: AbortSignal[] = [];
    const originalAdd = AbortSignal.prototype.addEventListener;
    const spy = vi.spyOn(AbortSignal.prototype, "addEventListener").mockImplementation(function (...args) {
      if (args[0] === "abort") signals.push(this);
      return originalAdd.apply(this, args);
    });
    const warnings: Error[] = [];
    const onWarning = (warning: Error) => warnings.push(warning);
    process.on("warning", onWarning);
    try {
      const start = Date.now();
      const pending = Promise.allSettled(Array.from({ length: 40 }, () => acquire(parent.signal)));
      await vi.advanceTimersByTimeAsync(0);
      parent.abort();
      const results = await pending;
      await vi.advanceTimersByTimeAsync(0);
      expect(results.every(result => result.status === "rejected" && result.reason === parent.signal.reason)).toBe(true);
      expect(Date.now()).toBe(start);
      expect(vi.getTimerCount()).toBe(0);
      for (const signal of [parent.signal, ...signals]) expect(getEventListeners(signal, "abort")).toHaveLength(0);
      expect(warnings.filter(warning => warning.name === "MaxListenersExceededWarning")).toEqual([]);
    } finally { spy.mockRestore(); process.off("warning", onWarning); }
  });
});
