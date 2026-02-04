/**
 * Centralized Version Constants
 *
 * Import version from package.json to ensure consistency across the app.
 * Used for audit trails, config snapshots, and telemetry.
 *
 * @module version
 */

// Import version from package.json at build time
// TypeScript will resolve this via moduleResolution
import packageJson from "../../package.json";

/**
 * Application version from package.json
 */
export const APP_VERSION = packageJson.version;

/**
 * Analyzer/UCM feature version
 * Increment this when making significant changes to analyzer behavior
 */
export const ANALYZER_VERSION = APP_VERSION;
