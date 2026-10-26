import { describe, expect, it } from "vitest";
import { zodSchema } from "ai";
import { z } from "zod";
import { withFallback, withOptionalFallback } from "@/lib/analyzer/schema-fallback";
import { Pass2AtomicClaimSchema, ClaimContractOutputSchema } from "@/lib/analyzer/claim-extraction-stage";

describe("Provider schema fallback compatibility", () => {
  it("keeps missing and invalid inputs as runtime fallbacks without wire defaults", () => {
    const schema = z.object({
      text: withFallback(z.string(), ""),
      flag: withFallback(z.boolean(), false),
      list: withFallback(z.array(z.string()), []),
      choice: withFallback(z.enum(["keep", "retry"]), "keep"),
    });
    const expected = { text: "", flag: false, list: [], choice: "keep" };
    expect(schema.parse({})).toEqual(expected);
    expect(schema.parse({ text: null, flag: null, list: null, choice: null })).toEqual(expected);
    expect(schema.parse({ text: undefined, flag: undefined, list: undefined, choice: undefined })).toEqual(expected);
    const wire = zodSchema(schema).jsonSchema as Record<string, any>;
    expect(wire.required).toBeUndefined();
    for (const value of Object.values(wire.properties)) expect(value).not.toHaveProperty("default");
  });

  it("preserves optional omission and preprocess defaults", () => {
    const schema = z.object({ list: withOptionalFallback(z.array(z.string()).optional(), []) });
    const omitted: z.infer<typeof schema> = {};
    expect(schema.parse(omitted)).toEqual({});
    expect(schema.parse({ list: undefined })).toEqual({ list: undefined });
    expect(schema.parse({ list: null })).toEqual({ list: [] });
    const preprocessed = withOptionalFallback(z.preprocess(value => value ?? [], z.array(z.string())), []);
    expect(preprocessed.parse(undefined)).toEqual([]);
    expect(preprocessed.parse(42)).toEqual([]);
  });

  it("returns raw fallbacks without applying transforms or nested defaults", () => {
    const text = withFallback(z.string().transform(value => value.toUpperCase()), "raw");
    expect(text.parse(undefined)).toBe("raw");
    expect(text.parse(null)).toBe("raw");
    expect(text.parse("valid")).toBe("VALID");
    const nested = withFallback(z.object({ value: z.string().default("child").transform(value => value.toUpperCase()) }), { value: "fallback" });
    expect(nested.parse(undefined)).toEqual({ value: "fallback" });
    expect(nested.parse(null)).toEqual({ value: "fallback" });
    expect(nested.parse({})).toEqual({ value: "CHILD" });
  });

  it("preserves the actual claim extraction and contract wire requirements", () => {
    const claim = zodSchema(Pass2AtomicClaimSchema).jsonSchema as Record<string, any>;
    expect(claim.required).toBeUndefined();
    expect(claim.properties.id).toEqual({ type: "string" });
    expect(claim.properties.expectedEvidenceProfile.required).toBeUndefined();
    const contract = zodSchema(ClaimContractOutputSchema).jsonSchema as Record<string, any>;
    expect(contract.properties.inputAssessment.required).toEqual([
      "preservesOriginalClaimContract", "rePromptRequired",
    ]);
    expect(contract.properties.claims.items.required).toEqual([
      "claimId", "preservesEvaluativeMeaning", "usesNeutralDimensionQualifier", "isInputDerived",
    ]);
  });
});
