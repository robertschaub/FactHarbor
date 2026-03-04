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

  return (
    <div className={styles.banner} role="note" aria-label="Input">
      <div className={styles.text}>
        <span className={styles.typeLabel}>{typeLabel}:</span>
        <br />
        {text}
      </div>
    </div>
  );
}
