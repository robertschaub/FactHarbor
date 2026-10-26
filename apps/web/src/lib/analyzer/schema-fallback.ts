import { z } from "zod";

/** Keep parsing fallbacks out of the provider-facing JSON Schema contract. */
export function withFallback<T extends z.ZodType>(schema: T, fallback: Exclude<z.output<T>, undefined>) {
  // Zod 4 advertises catch values as defaults and unwraps catch when deciding
  // whether input is required. Preserve the previous optional-input contract.
  const caught = withOptionalFallback(schema, fallback);
  // Default returns the raw fallback, as catch did; prefault would parse it.
  // Clear metadata on both wrappers so neither contributes a JSON default.
  return caught.default(fallback).meta({ default: undefined });
}

/** Preserve missing-input behavior when the source schema already accepts it. */
export function withOptionalFallback<T extends z.ZodType>(schema: T, fallback: z.output<T>) {
  return schema.catch(fallback).meta({ default: undefined });
}
