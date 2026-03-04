/**
 * ExpandableText Component
 *
 * Displays long text in a collapsed container with a fade gradient.
 * Provides "Show more" (inline expand) and "Open in overlay" (modal) options.
 * Short texts (<= threshold) are rendered inline without any controls.
 */

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ExpandableText.module.css";

/** Render inline markdown: **bold** and reference IDs (CP_AC_01_0, EV_12345…) */
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold** or reference IDs (2+ uppercase letters + underscore + alphanumeric)
  const regex = /\*\*(.+?)\*\*|(\b[A-Z]{2,}_[A-Z0-9_]+\b)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      // **bold**
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      // Reference ID
      parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{match[2]}</strong>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

/** Render a single paragraph with **bold** and single-newline line breaks */
function renderParagraph(text: string, key?: number) {
  const lines = text.split(/\n/);
  if (lines.length <= 1) {
    return <>{renderInlineMarkdown(text)}</>;
  }
  return (
    <span key={key}>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {renderInlineMarkdown(line)}
        </span>
      ))}
    </span>
  );
}

/**
 * For long continuous text without any newlines, insert paragraph breaks
 * before sentences that start with reference-like identifiers (e.g., CP_AC_01_0, EV_123456).
 * Also breaks before "Adjusting" / "The self-consistency" sentence starters that follow a period.
 */
function normalizeText(text: string): string {
  if (text.includes("\n") || text.length < 500) return text;
  // Break before reference IDs: ". CP_AC_01_0 ..." or ". EV_12345 ..."
  let normalized = text.replace(/(\.) ([A-Z]{2,}_[A-Z0-9_]+\b)/g, "$1\n\n$2");
  // Break before common structural transitions after a sentence end
  normalized = normalized.replace(/(\.) ((?:Adjusting|Overall|In summary|In conclusion|However|The self-consistency)\b)/g, "$1\n\n$2");
  return normalized;
}

/** Render text with **bold**, paragraph breaks (\n\n), and line breaks (\n) */
function FormattedText({ text }: { text: string }) {
  const paragraphs = normalizeText(text).split(/\n{2,}/);
  if (paragraphs.length <= 1) {
    return <>{renderParagraph(text)}</>;
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ margin: "0 0 0.6em" }}>{renderParagraph(p, i)}</p>
      ))}
    </>
  );
}

interface ExpandableTextProps {
  text: string;
  /** Character count above which the text is collapsed (default 600) */
  threshold?: number;
  className?: string;
  modalTitle?: string;
  /** Skip the styled box wrapper (use when parent already provides container styling) */
  bare?: boolean;
}

function TextModal({ text, title, onClose }: { text: string; title: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{title}</span>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className={styles.modalBody}><FormattedText text={text} /></div>
      </div>
    </div>,
    document.body
  );
}

export function ExpandableText({
  text,
  threshold = 600,
  className = "",
  modalTitle = "Full Text",
  bare = false,
}: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [overflows, setOverflows] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setShowModal(false), []);

  // Measure whether the collapsed content actually overflows
  useEffect(() => {
    const el = contentRef.current;
    if (el && !expanded) {
      setOverflows(el.scrollHeight > el.clientHeight + 2); // 2px tolerance
    }
  }, [text, expanded]);

  if (!text) return null;

  const isLong = text.length > threshold;
  const boxClass = bare ? className : `${styles.styledBox} ${className}`;
  const collapsedClass = bare ? `${styles.bareCollapsed} ${className}` : `${styles.collapsedText} ${className}`;

  if (!isLong) {
    return <div className={className}><FormattedText text={text} /></div>;
  }

  if (expanded) {
    return (
      <>
        <div className={boxClass}><FormattedText text={text} /></div>
        <div className={styles.expandBar}>
          <button className={styles.expandButton} onClick={() => setExpanded(false)}>
            Show less
          </button>
          <button className={styles.expandButton} onClick={() => setShowModal(true)}>
            Open in overlay
          </button>
        </div>
        {showModal && <TextModal text={text} title={modalTitle} onClose={handleClose} />}
      </>
    );
  }

  // Text fits — render without controls
  if (!overflows) {
    return <div ref={contentRef} className={collapsedClass}><FormattedText text={text} /></div>;
  }

  return (
    <>
      <div className={styles.container}>
        <div ref={contentRef} className={collapsedClass}><FormattedText text={text} /></div>
        {!bare && <div className={styles.fadeOverlay} />}
      </div>
      <div className={styles.expandBar}>
        <button className={styles.expandButton} onClick={() => setExpanded(true)}>
          Show more
        </button>
        <button className={styles.expandButton} onClick={() => setShowModal(true)}>
          Open in overlay
        </button>
      </div>
      {showModal && <TextModal text={text} title={modalTitle} onClose={handleClose} />}
    </>
  );
}
