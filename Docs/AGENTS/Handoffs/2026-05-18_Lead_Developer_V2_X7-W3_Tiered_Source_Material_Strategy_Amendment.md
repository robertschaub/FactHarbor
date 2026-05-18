# Lead Developer Handoff - V2 X7-W3 Tiered Source Material Strategy Amendment

**Date:** 2026-05-18
**Role:** Lead Developer / Captain Deputy
**Task:** Amend the X7-W3 Source Material steering review package before implementation.
**Status:** Review package amended; no implementation and no live jobs authorized.

## Summary

Amended `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md` to incorporate the Wikimedia API observation as a tiered Source Material strategy.

The package now states explicitly that current W2 artifacts do not expose usable titles, URLs, excerpts, descriptions, or page keys. Those fields may be used only if they are safely materialized from the provider-owned search candidate inside the approved W3 path.

## Recommended Direction

- **Tier 0 / W3-A:** bounded search-result materialization and preview diagnostics only, no extra HTTP call, no source-material record.
- **Tier 1 / W3-B:** first real Source Material fetch should be a bounded page-summary fetch if Tier 0 is insufficient.
- **Tier 2:** full page/source/html fetch remains out of scope and requires separate Steering Board approval.

Lead Developer recommendation remains split W3-A/W3-B. Tier 0 should prove the safe materialization seam without treating provider search excerpts as Source Material. Tier 1 should use a project-local Wikimedia page-summary endpoint as the first real fetch path if Steering approves fetch work after Tier 0.

## Endpoint And Cap Posture

- Tier 0 adds no network byte budget and must cap preview diagnostics aggressively.
- Tier 1 must not raise W2 byte caps and should start lower than the W2 page-search cap because summaries should be small.
- Tier 1 should preserve redirect-deny, proxy-none, no-credentials, timeout caps, endpoint allowlist, final-address validation, hidden-only artifacts, and raw-leak protections.
- Tier 2 full source/html/page fetches are not part of W3.

## References Checked

- Wikimedia/MediaWiki search-page reference: `limit` is a GET query parameter and search result objects may include `id`, `key`, `title`, `excerpt`, and `description`.
- Wikimedia Page Content Service: `/page/summary/{title}` is a stable summary endpoint intended for previews and basic page metadata.
- Wikimedia API Portal deprecation notice: Core API deprecation begins gradually in July 2026, so project-local page-summary fetch is the recommended Tier 1 posture.

## Files Changed

- `Docs/WIP/2026-05-18_V2_Slice_X7-W3_Source_Material_Steering_Review_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-18_Lead_Developer_V2_X7-W3_Tiered_Source_Material_Strategy_Amendment.md`
- `Docs/AGENTS/index/handoff-index.json`

## Constraints Preserved

The amended package authorizes no:

- implementation;
- live jobs;
- parser execution;
- EvidenceCorpus;
- EvidenceItems;
- report/verdict/warning/confidence behavior;
- public exposure;
- second provider;
- retries;
- cache IO;
- Source Reliability;
- durable storage;
- ACS/direct URL;
- V1 reuse, V1 work, or V1 cleanup.

## Warnings

Do not treat Tier 0 search excerpts as Source Material. They are provider search-result previews and may be diagnostic-only unless the Steering Board explicitly changes the classification.

Do not implement Tier 1 or run a W3 canary from this amendment alone. A reviewed implementation package remains required.

## Learnings

The first downstream step after W2 should not jump directly from candidate counts to page fetches. A Tier 0 materialization proof lets the team validate locator/preview safety first, while Tier 1 can stay focused on a bounded page-summary fetch if actual Source Material is still needed.
