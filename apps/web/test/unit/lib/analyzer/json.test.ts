import { describe, expect, it } from "vitest";

import {
  extractFirstJsonObjectFromText,
  tryParseFirstJsonObject,
  extractFirstJsonValueFromText,
  tryParseFirstJsonValue,
  repairTruncatedJsonValue,
  repairUnescapedInnerQuotes,
  tryParseJsonWithInnerQuoteRepair,
} from "@/lib/analyzer/json";

describe("analyzer/json", () => {
  it("extracts and parses a plain JSON object", () => {
    const txt = `{"a":1,"b":"x"}`;
    expect(extractFirstJsonObjectFromText(txt)).toBe(txt);
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1, b: "x" });
  });

  it("extracts JSON object from surrounding text", () => {
    const txt = `prefix\n{ "a": 1, "b": "x" }\npost`;
    expect(extractFirstJsonObjectFromText(txt)).toBe(`{ "a": 1, "b": "x" }`);
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1, b: "x" });
  });

  it("handles braces inside quoted strings", () => {
    const txt = `leading {"a":"{not a brace}","b":2} trailing`;
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: "{not a brace}", b: 2 });
  });

  it("returns null when no JSON object exists", () => {
    expect(extractFirstJsonObjectFromText("nope")).toBeNull();
    expect(tryParseFirstJsonObject("nope")).toBeNull();
  });

  it("parses the first JSON object when multiple exist", () => {
    const txt = `x {"a":1} y {"b":2}`;
    expect(tryParseFirstJsonObject(txt)).toEqual({ a: 1 });
  });

  it("extracts and parses a JSON array", () => {
    const txt = `[{"a":1},{"b":2}]`;
    expect(extractFirstJsonValueFromText(txt)).toBe(txt);
    expect(tryParseFirstJsonValue(txt)).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("chooses the first structure (object vs array)", () => {
    expect(extractFirstJsonValueFromText(`{ "a": 1 } [2, 3]`)).toBe(`{ "a": 1 }`);
    expect(extractFirstJsonValueFromText(`[1, 2] { "b": 3 }`)).toBe(`[1, 2]`);
  });

  it("respects expectedStart in tryParseFirstJsonValue", () => {
    const txt = `noise [1, 2] more noise { "a": 3 }`;
    expect(tryParseFirstJsonValue(txt, "[")).toEqual([1, 2]);
    expect(tryParseFirstJsonValue(txt, "{")).toEqual({ a: 3 });
  });

  it("repairs unescaped inner quotes inside string values", () => {
    const txt = '[{"reasoning":"Die Behauptung bringe „nichts" in Bezug auf Umweltwirkungen."}]';
    const repaired = repairUnescapedInnerQuotes(txt);
    expect(JSON.parse(repaired)).toEqual([
      { reasoning: 'Die Behauptung bringe „nichts" in Bezug auf Umweltwirkungen.' },
    ]);
  });

  it("parses JSON with inner-quote repair when a string contains an unescaped quote", () => {
    const txt = '```json\n[{"reasoning":"Die Behauptung bringe „nichts" in Bezug auf Umweltwirkungen."}]\n```';
    const fenced = txt.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim() ?? "";
    expect(tryParseJsonWithInnerQuoteRepair(fenced)).toEqual([
      { reasoning: 'Die Behauptung bringe „nichts" in Bezug auf Umweltwirkungen.' },
    ]);
  });
});

describe("repairTruncatedJsonValue", () => {
  it("returns parsed object for complete JSON", () => {
    const obj = { a: 1, b: [{ c: 2 }, { c: 3 }] };
    expect(repairTruncatedJsonValue(JSON.stringify(obj))).toEqual(obj);
  });

  it("repairs JSON truncated mid-array-item", () => {
    // Simulates: {"items":[{"id":1,"val":"ok"},{"id":2,"val":"trun
    const result = repairTruncatedJsonValue('{"items":[{"id":1,"val":"ok"},{"id":2,"val":"trun');
    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({ id: 1, val: "ok" });
  });

  it("repairs a truncated top-level array", () => {
    const txt = `[{"id": 1}, {"id": 2`;
    const result = repairTruncatedJsonValue(txt);
    expect(result).toEqual([{ id: 1 }]);
  });

  it("repairs a truncated array with nested objects", () => {
    const txt = `[{"id": 1, "data": {"val": 10}}, {"id": 2, "data": {"v`;
    const result = repairTruncatedJsonValue(txt);
    expect(result).toEqual([{ id: 1, data: { val: 10 } }]);
  });

  it("respects expectedStart parameter", () => {
    const txt = `prefix { "obj": 1 } [ {"id": 1}, {"id": 2`;
    expect(repairTruncatedJsonValue(txt, "{")).toEqual({ obj: 1 });
    expect(repairTruncatedJsonValue(txt, "[")).toEqual([{ id: 1 }]);
  });

  it("handles strings with braces inside quoted values", () => {
    const result = repairTruncatedJsonValue('{"items":[{"text":"a {b} c","id":1},{"text":"trunc');
    expect(result).not.toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0].text).toBe("a {b} c");
  });
});
