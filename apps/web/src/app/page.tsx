/**
 * Root route: redirect to the canonical Analyze page.
 *
 * Rationale: we previously had two separate analysis entrypoints (`/` and `/analyze`),
 * and only `/analyze` included the pipeline variant selector + request forwarding.
 */

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/analyze");
}
