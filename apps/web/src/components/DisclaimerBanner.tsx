/**
 * DisclaimerBanner — persistent pre-release disclaimer at top of every page.
 * NOT dismissible during alpha phase.
 */
export function DisclaimerBanner() {
  return (
    <div
      style={{
        background: "#fef3c7",
        color: "#92400e",
        fontSize: 12,
        textAlign: "center",
        padding: "6px 16px",
        lineHeight: 1.4,
      }}
    >
      FactHarbor Alpha &mdash; AI-generated analysis may contain errors. Not a
      substitute for professional fact-checking. No warranty is provided.
    </div>
  );
}
