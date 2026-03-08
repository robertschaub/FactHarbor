import { useState } from "react";
import styles from "./InputBanner.module.css";

type InputBannerProps = {
  inputType: string;
  inputValue: string;
  textColor?: string;
  textBackgroundColor?: string;
  textBorderColor?: string;
};

export function InputBanner({ inputType, inputValue, textColor, textBackgroundColor, textBorderColor }: InputBannerProps) {
  const text = (inputValue || "").trim();
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  const isLongInput = text.length > 200;

  const type = (inputType || "text").trim().toLowerCase();
  const typeLabel =
    type === "url"
      ? "URL"
      : type === "text"
        ? "Text"
        : type.charAt(0).toUpperCase() + type.slice(1);
  const showTypeLabel = type !== "text";

  return (
    <div className={styles.banner} role="note" aria-label="Input">
      {showTypeLabel ? <div className={styles.sectionLabel}>Type: {typeLabel}</div> : null}
      <div
        className={`${styles.text} ${isLongInput ? styles.textCompact : ""} ${isLongInput && !expanded ? styles.textClamped : ""}`}
        style={{
          ...(textColor ? { color: textColor } : {}),
          ...(textBackgroundColor ? { backgroundColor: textBackgroundColor } : {}),
          ...(textBorderColor ? { borderColor: textBorderColor } : {}),
        }}
      >
        {text}
      </div>
      {isLongInput && (
        <button className={styles.expandToggle} onClick={() => setExpanded(v => !v)}>
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
