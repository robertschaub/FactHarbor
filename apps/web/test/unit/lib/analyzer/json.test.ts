import { describe, expect, it } from "vitest";

import { extractFirstJsonObjectFromText, tryParseFirstJsonObject, repairTruncatedJson } from "@/lib/analyzer/json";

describe("analyzer/json", () => {
  it("extracts and parses a plain JSON object", () => {
    const txt = `{\"a\":1,\"b\":\"x\"}`;
    expect(extractFirstJsonObjectFromText(txt)).toBe(txt);
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1, b: "x" });
  });

  it("extracts JSON object from surrounding text", () => {
    const txt = `prefix\\n{ \"a\": 1, \"b\": \"x\" }\\npost`;
    expect(extractFirstJsonObjectFromText(txt)).toBe(`{ \"a\": 1, \"b\": \"x\" }`);
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1, b: "x" });
  });

  it("handles braces inside quoted strings", () => {
    const txt = `leading {\"a\":\"{not a brace}\",\"b\":2} trailing`;
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: "{not a brace}", b: 2 });
  });

  it("returns null when no JSON object exists", () => {
    expect(extractFirstJsonObjectFromText("nope")).toBeNull();
    expect(tryParseFirstJsonObject("nope")).toBeNull();
  });

  it("parses the first JSON object when multiple exist", () => {
    const txt = `x {\"a\":1} y {\"b\":2}`;
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1 });
  });
});

describe("repairTruncatedJson", () => {
  it("returns parsed object for complete JSON", () => {
    const obj = { a: 1, b: [{ c: 2 }, { c: 3 }] };
    expect(repairTruncatedJson(JSON.stringify(obj))).toEqual(obj);
  });

  it("returns null for non-JSON text", () => {
    expect(repairTruncatedJson("not json at all")).toBeNull();
    expect(repairTruncatedJson("")).toBeNull();
  });

  it("repairs JSON truncated mid-array-item", () => {
    // Simulates: {"items":[{"id":1,"val":"ok"},{"id":2,"val":"trun
    const result = repairTruncatedJson('{"items":[{"id":1,"val":"ok"},{"id":2,"val":"trun');
    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ id: 1, val: "ok" });
  });

  it("repairs JSON truncated after complete array item", () => {
    const result = repairTruncatedJson('{"summary":"test","items":[{"id":1},{"id":2},{"id":3');
    expect(result).not.toBeNull();
    expect(result.summary).toBe("test");
    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe(1);
    expect(result.items[1].id).toBe(2);
  });

  it("preserves completed top-level fields before truncated array", () => {
    const json = '{"verdictSummary":{"answer":65,"confidence":70},"contexts":[{"id":"a"}],"claims":[{"id":"c1","verdict":72},{"id":"c2","ver';
    const result = repairTruncatedJson(json);
    expect(result).not.toBeNull();
    expect(result.verdictSummary).toEqual({ answer: 65, confidence: 70 });
    expect(result.contexts).toHaveLength(1);
    expect(result.claims).toHaveLength(1);
    expect(result.claims[0]).toEqual({ id: "c1", verdict: 72 });
  });

  it("handles strings with braces inside quoted values", () => {
    const result = repairTruncatedJson('{"items":[{"text":"a {b} c","id":1},{"text":"trunc');
    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("a {b} c");
  });
});

