import styles from "./ArticleFrameBanner.module.css";

type ArticleFrameBannerProps = {
  articleFrame: string;
};

export function ArticleFrameBanner({ articleFrame }: ArticleFrameBannerProps) {
  const frame = (articleFrame || "").trim();
  if (!frame) return null;

  return (
    <div className={styles.banner} role="note" aria-label="Article context">
      <div className={styles.label}>Article context</div>
      <div className={styles.text}>{frame}</div>
    </div>
  );
}
