/**
 * DisclaimerBanner — persistent pre-release disclaimer at top of every page.
 * NOT dismissible during alpha phase.
 */
import styles from "./DisclaimerBanner.module.css";

export function DisclaimerBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        FactHarbor pre-release reports still contain imperfections and should not be cited as authoritative. Reports are provided without warranty.
      </div>
    </div>
  );
}
