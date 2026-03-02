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
      This is an early pre-release. Analyses are provided without warranty. Verdicts may still contain errors, biases, or contradictions and should not be cited as authoritative.
    </div>
  );
}
