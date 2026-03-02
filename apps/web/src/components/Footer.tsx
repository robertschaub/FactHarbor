/**
 * Footer — minimal site-wide footer for pre-release.
 */
export function Footer() {
  return (
    <footer
      style={{
        background: "#e5e7eb",
        color: "#6b7280",
        fontSize: 12,
        textAlign: "center",
        padding: "10px 16px",
        marginTop: 32,
      }}
    >
      &copy; 2026 FactHarbor &middot; Evidence-based AI fact-checking &middot;{" "}
      <a
        href="https://factharbor.ch"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#6b7280", textDecoration: "underline" }}
      >
        factharbor.ch
      </a>
    </footer>
  );
}
