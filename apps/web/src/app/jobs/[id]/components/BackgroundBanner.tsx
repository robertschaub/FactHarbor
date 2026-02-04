import styles from "./BackgroundBanner.module.css";

type BackgroundBannerProps = {
  backgroundDetails: string;
};

export function BackgroundBanner({ backgroundDetails }: BackgroundBannerProps) {
  const background = (backgroundDetails || "").trim();
  if (!background) return null;

  return (
    <div className={styles.banner} role="note" aria-label="Background">
      <div className={styles.label}>Background</div>
      <div className={styles.text}>{background}</div>
    </div>
  );
}
