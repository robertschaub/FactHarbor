import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";

import {
  buildClaimSelectionDraftForwardHeaders,
  clearDraftAccessCookie,
  getDraftAccessCookieName,
  getDraftAccessCookiePath,
  persistDraftAccessCookie,
} from "@/lib/claim-selection-draft-proxy";

describe("claim-selection-draft-proxy", () => {
  it("falls back to the persistent draft cookie when no draft header is present", () => {
    const request = new Request("http://localhost/api/fh/claim-selection-drafts/draft-1", {
      headers: {
        cookie: `${getDraftAccessCookieName("draft-1")}=token-1`,
      },
    });

    expect(
      buildClaimSelectionDraftForwardHeaders(request, {
        forwardDraftToken: true,
        draftId: "draft-1",
      }),
    ).toEqual(
      expect.objectContaining({
        "X-Draft-Token": "token-1",
      }),
    );
  });

  it("prefers the explicit draft header over the cookie fallback", () => {
    const request = new Request("http://localhost/api/fh/claim-selection-drafts/draft-1", {
      headers: {
        cookie: `${getDraftAccessCookieName("draft-1")}=token-cookie`,
        "x-draft-token": "token-header",
      },
    });

    expect(
      buildClaimSelectionDraftForwardHeaders(request, {
        forwardDraftToken: true,
        draftId: "draft-1",
      }),
    ).toEqual(
      expect.objectContaining({
        "X-Draft-Token": "token-header",
      }),
    );
  });

  it("sets and clears persistent draft access cookies on the scoped draft path", () => {
    const response = NextResponse.json({ ok: true });

    persistDraftAccessCookie(response, "draft-1", "token-1", "2026-04-24T12:00:00.000Z");
    expect(response.headers.get("set-cookie")).toContain(`${getDraftAccessCookieName("draft-1")}=token-1`);
    expect(response.headers.get("set-cookie")).toContain(`Path=${getDraftAccessCookiePath("draft-1")}`);

    clearDraftAccessCookie(response, "draft-1");
    expect(response.headers.get("set-cookie")).toContain("Expires=Thu, 01 Jan 1970");
  });
});
