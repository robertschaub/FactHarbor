/**
 * ExpandableText Component
 *
 * Displays long text in a collapsed container with a fade gradient.
 * Provides "Show more" (inline expand) and "Open in overlay" (modal) options.
 * Short texts (<= threshold) are rendered inline without any controls.
 */

import { useState, useCallback, useEffect, useLayoutEffect, useRef, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./ExpandableText.module.css";
import { getTextParagraphs } from "../utils/getTextParagraphs";

/** Render inline markdown fragments for common generic patterns. */
function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Match **bold**, `inline code`, or reference IDs (e.g. EV_12345, CP_AC_01_0)
  const regex = /\*\*(.+?)\*\*|`([^`]+)`|(\b[A-Z]{2,}_[A-Z0-9_]+\b)/g;
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
    } else if (match[2]) {
      // `inline code`
      parts.push(<code key={key++}>{match[2]}</code>);
    } else if (match[3]) {
      // Reference ID (auto-bold for scanning)
      parts.push(<strong key={key++} style={{ fontWeight: 600 }}>{match[3]}</strong>);
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

/** Render text with **bold**, paragraph breaks (\n\n), and line breaks (\n) */
function FormattedText({ text }: { text: string }) {
  const paragraphs = getTextParagraphs(text);

  if (paragraphs.length <= 1) {
    return <>{renderParagraph(paragraphs[0] ?? text)}</>;
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
  const titleId = useId();

  // v2.6.40: Lock body scroll while modal is open
  useLayoutEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle} id={titleId}>{title}</span>
          <button className={styles.modalClose} onClick={onClose} aria-label="Close modal">
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
  const contentId = useId();

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
        <div id={contentId} className={boxClass}><FormattedText text={text} /></div>
        <div className={styles.expandBar}>
          <button 
            className={styles.expandButton} 
            onClick={() => setExpanded(false)}
            aria-expanded="true"
            aria-controls={contentId}
          >
            Show less
          </button>
          <button className={styles.expandButton} onClick={() => setShowModal(true)} aria-haspopup="dialog">
            Open in overlay
          </button>
        </div>
        {showModal && <TextModal text={text} title={modalTitle} onClose={handleClose} />}
      </>
    );
  }

  // Text fits — render without controls
  if (!overflows) {
    return <div ref={contentRef} id={contentId} className={collapsedClass}><FormattedText text={text} /></div>;
  }

  return (
    <>
      <div className={styles.container}>
        <div ref={contentRef} id={contentId} className={collapsedClass} aria-expanded="false"><FormattedText text={text} /></div>
        {!bare && <div className={styles.fadeOverlay} />}
      </div>
      <div className={styles.expandBar}>
        <button 
          className={styles.expandButton} 
          onClick={() => setExpanded(true)}
          aria-expanded="false"
          aria-controls={contentId}
        >
          Show more
        </button>
        <button className={styles.expandButton} onClick={() => setShowModal(true)} aria-haspopup="dialog">
          Open in overlay
        </button>
      </div>
      {showModal && <TextModal text={text} title={modalTitle} onClose={handleClose} />}
    </>
  );
}
