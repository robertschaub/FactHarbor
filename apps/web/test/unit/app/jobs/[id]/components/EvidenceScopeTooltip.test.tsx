import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EvidenceScopeTooltip } from "@/app/jobs/[id]/components/EvidenceScopeTooltip";

describe("EvidenceScopeTooltip", () => {
  it("returns empty markup when no meaningful data", () => {
    const html = renderToStaticMarkup(
      // @ts-expect-error - evidenceScope is optional in this test
      <EvidenceScopeTooltip evidenceScope={{}} />
    );
    expect(html).toBe("");
  });

  it("renders when scope has data", () => {
    const html = renderToStaticMarkup(
      <EvidenceScopeTooltip evidenceScope={{ methodology: "ISO 14040" } as any} />
    );
    expect(html).toContain("Show evidence scope details");
    expect(html).toContain(">i<");
  });
});
