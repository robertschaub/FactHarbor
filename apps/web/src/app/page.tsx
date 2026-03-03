/**
 * Root route: redirect to the Jobs page (landing page).
 */

import { redirect } from "next/navigation";

export default function Page() {
  redirect("/jobs");
}
