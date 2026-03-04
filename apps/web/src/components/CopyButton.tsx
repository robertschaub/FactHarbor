import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import styles from "./CopyButton.module.css";

interface CopyButtonProps {
  text: string;
  title?: string;
  className?: string;
  size?: number;
}

/**
 * A small, reusable copy-to-clipboard button with toast feedback.
 */
export function CopyButton({ text, title = "Copy to clipboard", className = "", size = 14 }: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Copied to clipboard", { id: "copy-toast" });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  }, [text]);

  return (
    <button
      className={`${styles.copyBtn} ${className}`}
      onClick={handleCopy}
      title={title}
      aria-label={title}
      type="button"
    >
      {isCopied ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      )}
    </button>
  );
}
