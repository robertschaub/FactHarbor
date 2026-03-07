/**
 * useReportNavigation — Cross-navigation hook for the report page.
 *
 * Provides navigateTo(refId) to scroll to any element by reference ID,
 * with cross-tab switching (Summary ↔ Sources) and back navigation.
 *
 * ID conventions:
 *   AC_01, AC_02       → claim cards (Summary tab)
 *   CB_01, CB_02       → boundary legend entries (Summary tab)
 *   EV_001, EV_12345   → evidence items (Sources tab)
 *   CP_AC_01_0          → challenge points → resolves to parent claim (Summary tab)
 *   SRC_0, SRC_1        → fetched source entries (Sources tab)
 *   SQ_0, SQ_1          → search query entries (Sources tab)
 */

import { useCallback, useRef, useState, useEffect } from "react";

export type ReportTab = "report" | "json" | "events";

interface NavTarget {
  domId: string;
  tab: ReportTab;
}

interface NavHistoryEntry {
  fromTab: ReportTab;
  scrollY: number;
}

const MAX_HISTORY = 10;

/**
 * Map a reference ID (e.g. "EV_001", "AC_01", "CB_02", "CP_AC_01_0")
 * to the corresponding DOM element id and the tab it lives on.
 */
export function refIdToNavTarget(refId: string): NavTarget | null {
  if (!refId) return null;

  // Evidence items → Report tab
  if (refId.startsWith("EV_")) {
    return { domId: `nav-ev-${refId}`, tab: "report" };
  }

  // Atomic claims → Report tab
  if (refId.startsWith("AC_")) {
    return { domId: `nav-claim-${refId}`, tab: "report" };
  }

  // Claim assessment boundaries → Report tab (legend)
  if (refId.startsWith("CB_")) {
    return { domId: `nav-cb-${refId}`, tab: "report" };
  }

  // Challenge points → parent claim on Report tab
  // Format: CP_AC_01_0 → extract AC_01
  if (refId.startsWith("CP_")) {
    const match = refId.match(/CP_(AC_\d+)/);
    if (match) {
      return { domId: `nav-claim-${match[1]}`, tab: "report" };
    }
  }

  // Boundary finding rows → Report tab (first occurrence in claim cards)
  if (refId.startsWith("BF_")) {
    return { domId: `nav-bf-${refId.slice(3)}`, tab: "report" };
  }

  // Fetched sources → Report tab
  if (refId.startsWith("SRC_")) {
    return { domId: `nav-${refId.toLowerCase()}`, tab: "report" };
  }

  // Search queries → Report tab
  if (refId.startsWith("SQ_")) {
    return { domId: `nav-${refId.toLowerCase()}`, tab: "report" };
  }

  return null;
}

/**
 * Scroll to an element and apply a highlight flash animation.
 * Opens any closed <details> ancestors so the element is visible.
 */
function scrollToAndHighlight(elementId: string): boolean {
  const el = document.getElementById(elementId);
  if (!el) return false;

  // Open any closed <details> ancestors (e.g. neutral evidence section)
  let openedDetails = false;
  let node: Element | null = el.parentElement;
  while (node && node !== document.body) {
    if (node.tagName === "DETAILS" && !(node as HTMLDetailsElement).open) {
      (node as HTMLDetailsElement).open = true;
      openedDetails = true;
    }
    node = node.parentElement;
  }

  const doScroll = () => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Apply highlight animation
    el.classList.add("nav-highlight");
    const onEnd = () => {
      el.classList.remove("nav-highlight");
      el.removeEventListener("animationend", onEnd);
    };
    el.addEventListener("animationend", onEnd);
    // Fallback cleanup if animation doesn't fire
    setTimeout(() => el.classList.remove("nav-highlight"), 2000);
  };

  // If we opened any <details>, defer scroll by double-rAF to let the browser
  // fully reflow (nested <details> may need more than one layout pass)
  if (openedDetails) {
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  } else {
    doScroll();
  }

  return true;
}

export interface ReportNavigation {
  /** Navigate to a reference ID (e.g. "EV_001", "AC_01"). Handles tab switching. */
  navigateTo: (refId: string) => void;
  /** Go back to the previous navigation origin. */
  goBack: () => void;
  /** Whether there is a back history entry available. */
  canGoBack: boolean;
  /** Label for back button context (e.g. "AC_01"). */
  backLabel: string;
  /** Clear navigation history (e.g. on manual tab switch). */
  clearHistory: () => void;
}

export function useReportNavigation(
  currentTab: ReportTab,
  setTab: (tab: ReportTab) => void,
): ReportNavigation {
  const [history, setHistory] = useState<NavHistoryEntry[]>([]);
  const pendingNavRef = useRef<string | null>(null);

  // After tab switch, scroll to the pending navigation target
  useEffect(() => {
    if (!pendingNavRef.current) return;

    const targetId = pendingNavRef.current;
    pendingNavRef.current = null;

    // Use requestAnimationFrame to let React render the new tab content
    requestAnimationFrame(() => {
      // Double-RAF to ensure DOM is fully painted
      requestAnimationFrame(() => {
        scrollToAndHighlight(targetId);
      });
    });
  }, [currentTab]);

  const navigateTo = useCallback((refId: string) => {
    const target = refIdToNavTarget(refId);
    if (!target) return;

    // Push current position to history
    setHistory(prev => {
      const entry: NavHistoryEntry = {
        fromTab: currentTab,
        scrollY: window.scrollY,
      };
      const next = [entry, ...prev];
      return next.slice(0, MAX_HISTORY);
    });

    if (target.tab !== currentTab) {
      // Cross-tab: set pending target, then switch tab
      pendingNavRef.current = target.domId;
      setTab(target.tab);
    } else {
      // Same-tab: scroll immediately
      scrollToAndHighlight(target.domId);
    }
  }, [currentTab, setTab]);

  const goBack = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const [entry, ...rest] = prev;

      if (entry.fromTab !== currentTab) {
        // Need to switch tab first, then scroll
        const scrollAfterSwitch = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: entry.scrollY, behavior: "smooth" });
            });
          });
        };
        setTab(entry.fromTab);
        scrollAfterSwitch();
      } else {
        window.scrollTo({ top: entry.scrollY, behavior: "smooth" });
      }

      return rest;
    });
  }, [currentTab, setTab]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  return {
    navigateTo,
    goBack,
    canGoBack: history.length > 0,
    backLabel: "",
    clearHistory,
  };
}
