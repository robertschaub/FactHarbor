import { describe, expect, it } from "vitest";

import {
  formatBudgetDurationDisplay,
  formatBudgetFitRationaleDisplay,
} from "@/lib/claim-selection-budget-display";

describe("claim selection budget display", () => {
  it("formats millisecond budgets as readable durations", () => {
    expect(formatBudgetDurationDisplay(480000)).toBe("8 minutes");
    expect(formatBudgetDurationDisplay(60000)).toBe("1 minute");
    expect(formatBudgetDurationDisplay(90000)).toBe("1 min 30 sec");
    expect(formatBudgetDurationDisplay(30000)).toBe("30 sec");
  });

  it("converts legacy millisecond rationale text for display", () => {
    const rationale =
      "Adding AC_06 would dilute depth within the 480 000 ms main budget and 120000ms reserve.";

    expect(formatBudgetFitRationaleDisplay(rationale)).toBe(
      "Adding AC_06 would dilute depth within the 8 minutes main budget and 2 minutes reserve.",
    );
  });
});
