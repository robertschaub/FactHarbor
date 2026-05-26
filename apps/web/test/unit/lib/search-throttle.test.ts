import { describe, expect, it } from "vitest";
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
