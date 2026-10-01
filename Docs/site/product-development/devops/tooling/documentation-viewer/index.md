# Documentation website

Read the [FactHarbor documentation](https://robertschaub.github.io/FactHarbor/) through the navigation menu or search. The same Markdown pages are readable in the GitHub repository.

## Reading diagrams

Shared diagrams are static SVG images. Use **Fit width** for an overview, **100%** to inspect labels, or **Open full-size** for a separate view. Each diagram also links to its Mermaid source. On a narrow screen, the diagram area scrolls without widening the whole page.

## Contributing and previewing

Edit Markdown in `Docs/site/` and keep links, navigation and diagram assets consistent. See [authoring and preview instructions](https://github.com/robertschaub/FactHarbor/blob/main/Docs/DEVELOPMENT/Documentation.md). The local preview uses MkDocs; publication is handled by the documentation workflow after an authorized push to `main`.

Existing public page addresses are supported by explicit route aliases. An unknown destination leads to the site's not-found page. No source-content parser or account is needed to read the documentation.

## Browser storage

The site provides local search and display controls. Its documentation pages do not load third-party fonts or a diagram-rendering service. The effective [privacy policy](../../../../privacy-policy.md) describes the public website and the separate analysis application.
