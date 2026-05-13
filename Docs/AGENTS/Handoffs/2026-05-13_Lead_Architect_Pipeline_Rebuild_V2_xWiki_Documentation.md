# 2026-05-13 | Lead Architect | Pipeline Rebuild V2 xWiki Documentation

## Summary

Created V2 xWiki documentation equivalent to the requested current architecture pages, plus reusable Mermaid diagram pages and a diagram-only Academic Cooperation appendix.

The work is documentation-only. It does not change V1 runtime behavior, V2 runtime behavior, prompts, config, API behavior, UI behavior, source code, or live-job submission. V1 ClaimAssessmentBoundary remains the production runtime; V2 remains guarded and non-analytical through Slice 6A.

## Files Added

- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline Detail V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Data Model V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Quality Gates V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Verdict Debate Pattern V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Prompt Architecture V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Pipeline Overview/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Pipeline Detail/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Request Lifecycle/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Entity Model ERD/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Quality Gates Flow/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Verdict Debate Pattern/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Prompt Architecture/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/V2 Academic Cooperation Architecture/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Presentations/Academic Cooperation/V2 Diagrams/WebHome.xwiki`

## Files Updated

- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/WebHome.xwiki` - added V2 target navigation.
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/WebHome.xwiki` - linked V2 deep dives.
- `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/WebHome.xwiki` - added V2 diagram index.
- `Docs/xwiki-pages/FactHarbor/Product Development/Presentations/WebHome.xwiki` - linked the diagram-only V2 appendix.

## Design Decisions

- Created sibling V2 pages instead of overwriting current pages, because current xWiki pages still describe the production V1/CB runtime.
- Kept the Academic Cooperation update as a child diagram-only appendix, preserving the original presentation.
- Mirrored the old reader level: overview, detail, ERD, gate flow, verdict debate, prompt architecture, and presentation-level research-platform diagrams.
- Reused the target specification's V2 architecture posture: one run context, one prompt/model gateway, one warning policy, one canonical result writer, and thin compatibility adapters.

## Verification

- Checked Mermaid block balance across the new V2 xWiki pages.
- Searched V2 references in the Product Development xWiki tree.
- Confirmed the worktree diff is documentation-only.
- No live jobs were submitted.

## Warnings

- The V2 xWiki pages describe the target architecture and current guarded implementation posture; they are not evidence of live V2 analytical capability.
- Slice 6B remains blocked until Captain approval and LLM Expert review for prompt-backed Claim Understanding.

## Learnings

- The existing xWiki pages are still valuable as reader-level documentation templates, but their implementation details are V1-oriented and must not be treated as V2 implementation proof.
- Sibling V2 pages keep the current public architecture readable while giving reviewers a clean V2 documentation surface at the same level as the old diagrams.
