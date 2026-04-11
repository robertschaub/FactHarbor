/**
 * CoverageMatrix component tests — PR 2 (Rev B Track 2)
 *
 * Verifies the matrix renders count-only semantics:
 *  - cells colored by evidence count, never by verdict
 *  - no verdict-related Props remain
 *  - no row header styling depends on a dominantVerdict() helper
 *
 * Also asserts live UI / HTML export semantic alignment by checking that
 * the static HTML report builder also uses count-only cellClass(count) and
 * does not pass any verdict color into matrix cells.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "fs";
import path from "path";
import { CoverageMatrixDisplay } from "@/app/jobs/[id]/components/CoverageMatrix";
import type { CoverageMatrix } from "@/lib/analyzer/types";

// Lightweight stub of CoverageMatrix that satisfies the prop type without
// pulling in the full builder. Only the typed fields the component reads
// are populated; the unused getter methods are present as no-ops to keep
// TypeScript happy.
const makeMatrix = (claims: string[], boundaries: string[], counts: number[][]): CoverageMatrix => ({
  claims,
  boundaries,
  counts,
  // The component does not call these helpers, but the type requires them.
  getCellCount: (claimId: string, boundaryId: string) => {
    const ci = claims.indexOf(claimId);
    const bi = boundaries.indexOf(boundaryId);
    if (ci < 0 || bi < 0) return 0;
    return counts[ci]?.[bi] ?? 0;
  },
  getBoundariesForClaim: (claimId: string) => {
    const ci = claims.indexOf(claimId);
    if (ci < 0) return [];
    return boundaries.filter((_, bi) => (counts[ci]?.[bi] ?? 0) > 0);
  },
  getClaimsForBoundary: (boundaryId: string) => {
    const bi = boundaries.indexOf(boundaryId);
    if (bi < 0) return [];
    return claims.filter((_, ci) => (counts[ci]?.[bi] ?? 0) > 0);
  },
  getTotalEvidenceForClaim: (claimId: string) => {
    const ci = claims.indexOf(claimId);
    if (ci < 0) return 0;
    return counts[ci]?.reduce((s, c) => s + c, 0) ?? 0;
  },
  getTotalEvidenceForBoundary: (boundaryId: string) => {
    const bi = boundaries.indexOf(boundaryId);
    if (bi < 0) return 0;
    return counts.reduce((s, row) => s + (row[bi] ?? 0), 0);
  },
} as unknown as CoverageMatrix);

describe("CoverageMatrixDisplay (PR 2 — count-only semantics)", () => {
  it("renders without verdict-color props (props are dropped from the type)", () => {
    const matrix = makeMatrix(
      ["AC_01", "AC_02"],
      ["CB_01", "CB_02"],
      [
        [3, 1],
        [0, 2],
      ],
    );

    const html = renderToStaticMarkup(
      <CoverageMatrixDisplay
        matrix={matrix}
        claimLabels={["Claim A", "Claim B"]}
        boundaryShortLabels={["B1", "B2"]}
      />,
    );

    // Cells contain the literal counts.
    expect(html).toContain(">3<");
    expect(html).toContain(">2<");
    // Empty cells render as em dash.
    expect(html).toContain(">—<");
    // Legend says Evidence Count, not Verdict.
    expect(html).toContain("Evidence Count:");
    expect(html).not.toContain("Verdict:");
  });

  it("legend shows count buckets (0 / 1 / 2 / 3+) and never verdict bands", () => {
    const matrix = makeMatrix(["AC_01"], ["CB_01"], [[1]]);
    const html = renderToStaticMarkup(<CoverageMatrixDisplay matrix={matrix} />);

    expect(html).toContain("Evidence Count:");
    expect(html).toContain(">0<");
    expect(html).toContain(">1<");
    expect(html).toContain(">2<");
    expect(html).toContain(">3+<");
    // No verdict band labels should appear.
    for (const band of ["TRUE", "FALSE", "Mostly True", "Leaning False", "Mixed"]) {
      expect(html, `Verdict band "${band}" leaked into the matrix`).not.toContain(band);
    }
  });

  it("renders Total row and column totals consistent with the count grid", () => {
    const matrix = makeMatrix(
      ["AC_01", "AC_02"],
      ["CB_01"],
      [
        [3],
        [4],
      ],
    );
    const html = renderToStaticMarkup(<CoverageMatrixDisplay matrix={matrix} />);
    // Grand total = 7
    expect(html).toContain(">7<");
  });

  it("renders empty state when claims or boundaries are missing", () => {
    const empty = makeMatrix([], [], []);
    const html = renderToStaticMarkup(<CoverageMatrixDisplay matrix={empty} />);
    expect(html).toContain("No coverage data available");
  });
});

describe("PR 2: dominantVerdict() and verdict prop deletion (structural)", () => {
  // The component file must not contain dominantVerdict() helper at all,
  // and Props must not declare cellVerdicts/claimVerdicts/overallVerdict/verdictColorMap.
  const componentPath = path.resolve(
    __dirname,
    "../../../../../../src/app/jobs/[id]/components/CoverageMatrix.tsx",
  );
  const source = readFileSync(componentPath, "utf-8");

  it("dominantVerdict() helper is fully deleted", () => {
    expect(source, "dominantVerdict identifier still present").not.toContain("dominantVerdict");
  });

  it("verdict-related props are removed from the Props interface", () => {
    expect(source).not.toMatch(/cellVerdicts\??:/);
    expect(source).not.toMatch(/claimVerdicts\??:/);
    expect(source).not.toMatch(/overallVerdict\??:/);
    expect(source).not.toMatch(/verdictColorMap\??:/);
  });

  it("verdictStyle() helper is fully deleted", () => {
    expect(source, "verdictStyle helper still present").not.toContain("verdictStyle");
  });

  it("percentageToClaimVerdict import is no longer used by the matrix", () => {
    expect(source, "matrix should not depend on verdict scale anymore").not.toContain("percentageToClaimVerdict");
  });
});

describe("PR 2: live UI ↔ HTML export semantic alignment", () => {
  // Both the React component and the HTML report builder must use count-only
  // cell semantics. The HTML builder uses a `cellClass(count)` function and
  // never reads any verdict field on the matrix.
  const reportPath = path.resolve(
    __dirname,
    "../../../../../../src/app/jobs/[id]/utils/generateHtmlReport.ts",
  );
  const reportSource = readFileSync(reportPath, "utf-8");

  it("HTML matrix builder is count-only (uses cellClass on count)", () => {
    expect(reportSource).toContain("cellClass(cnt)");
  });

  it("HTML matrix builder does not branch on verdict colors for matrix cells", () => {
    // The buildCoverageMatrix() function in generateHtmlReport.ts must not
    // read claimVerdicts or any verdict-band string when rendering the matrix
    // cells. Extract the function body and assert.
    const start = reportSource.indexOf("function buildCoverageMatrix");
    expect(start, "buildCoverageMatrix() not found in HTML report").toBeGreaterThan(-1);
    // Find the end of the function: look for the next top-level "function "
    const nextFn = reportSource.indexOf("\nfunction ", start + 1);
    const body = reportSource.slice(start, nextFn === -1 ? undefined : nextFn);

    // No verdict colors should be looked up inside the matrix builder.
    expect(body).not.toContain("verdictStyle");
    expect(body).not.toContain("dominantVerdict");
    expect(body).not.toMatch(/percentageToClaimVerdict/);
  });
});
