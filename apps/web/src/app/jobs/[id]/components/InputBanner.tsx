import styles from "./InputBanner.module.css";

type InputBannerProps = {
  inputType: string;
  inputValue: string;
};

export function InputBanner({ inputType, inputValue }: InputBannerProps) {
  const text = (inputValue || "").trim();
  if (!text) return null;

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
      {showTypeLabel ? <div className={styles.sectionLabel}>{typeLabel}</div> : null}
      <div className={styles.text}>{text}</div>
    </div>
  );
}
