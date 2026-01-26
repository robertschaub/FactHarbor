import { describe, expect, it } from "vitest";

import { extractFirstJsonObjectFromText, tryParseFirstJsonObject } from "@/lib/analyzer/json";

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

