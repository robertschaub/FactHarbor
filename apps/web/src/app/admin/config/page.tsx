/**
 * Admin Config Page
 *
 * Unified configuration management for search, calculation, and prompt configs.
 * Phase 2: Form-based editors with validation.
 *
 * @module admin/config
 */

"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAdminAuth } from "../admin-auth-context";
import styles from "./config.module.css";

// ============================================================================
// TYPES
// ============================================================================

type ConfigType = "search" | "calculation" | "prompt";
type Tab = "active" | "history" | "edit" | "effective";

interface OverrideRecord {
  envVar: string;
  fieldPath: string;
  wasSet: boolean;
  appliedValue?: string | number | boolean;
}

interface EffectiveConfig {
  configType: string;
  profileKey: string;
  base: object;
  overrides: OverrideRecord[];
  effective: object;
  overridePolicy: string;
}

interface ConfigVersion {
  contentHash: string;
  configType: ConfigType;
  profileKey: string;
  schemaVersion: string;
  versionLabel: string;
  content: string;
  createdUtc: string;
  createdBy: string | null;
  isActive: boolean;
  activatedUtc: string | null;
  activatedBy: string | null;
}

interface HistoryResponse {
  versions: ConfigVersion[];
  total: number;
  limit: number;
  offset: number;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canonicalizedHash?: string;
}

// Search config type
interface SearchConfig {
  enabled: boolean;
  provider: "auto" | "google-cse" | "serpapi";
  mode: "standard" | "grounded";
  maxResults: number;
  maxSourcesPerIteration: number;
  timeoutMs: number;
  dateRestrict: "y" | "m" | "w" | null;
  domainWhitelist: string[];
  domainBlacklist: string[];
}

// Calculation config type (simplified for form)
interface CalcConfig {
  verdictBands: {
    true: [number, number];
    mostlyTrue: [number, number];
    leaningTrue: [number, number];
    mixed: [number, number];
    leaningFalse: [number, number];
    mostlyFalse: [number, number];
    false: [number, number];
  };
  aggregation: {
    centralityWeights: { high: number; medium: number; low: number };
    harmPotentialMultiplier: number;
    contestationWeights: { established: number; disputed: number; opinion: number };
  };
  sourceReliability: {
    confidenceThreshold: number;
    consensusThreshold: number;
    defaultScore: number;
  };
  qualityGates: {
    gate1OpinionThreshold: number;
    gate1SpecificityThreshold: number;
    gate1MinContentWords: number;
    gate4MinSourcesHigh: number;
    gate4MinSourcesMedium: number;
    gate4QualityThresholdHigh: number;
    gate4QualityThresholdMedium: number;
    gate4AgreementThresholdHigh: number;
    gate4AgreementThresholdMedium: number;
  };
  contestationPenalties: { established: number; disputed: number };
  deduplication: {
    evidenceScopeThreshold: number;
    claimSimilarityThreshold: number;
    contextMergeThreshold: number;
  };
  mixedConfidenceThreshold: number;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enabled: true,
  provider: "auto",
  mode: "standard",
  maxResults: 6,
  maxSourcesPerIteration: 4,
  timeoutMs: 12000,
  dateRestrict: null,
  domainWhitelist: [],
  domainBlacklist: [],
};

const DEFAULT_CALC_CONFIG: CalcConfig = {
  verdictBands: {
    true: [86, 100],
    mostlyTrue: [72, 85],
    leaningTrue: [58, 71],
    mixed: [43, 57],
    leaningFalse: [29, 42],
    mostlyFalse: [15, 28],
    false: [0, 14],
  },
  aggregation: {
    centralityWeights: { high: 3.0, medium: 2.0, low: 1.0 },
    harmPotentialMultiplier: 1.5,
    contestationWeights: { established: 0.3, disputed: 0.5, opinion: 1.0 },
  },
  sourceReliability: {
    confidenceThreshold: 0.8,
    consensusThreshold: 0.2,
    defaultScore: 0.5,
  },
  qualityGates: {
    gate1OpinionThreshold: 0.7,
    gate1SpecificityThreshold: 0.3,
    gate1MinContentWords: 3,
    gate4MinSourcesHigh: 3,
    gate4MinSourcesMedium: 2,
    gate4QualityThresholdHigh: 0.7,
    gate4QualityThresholdMedium: 0.5,
    gate4AgreementThresholdHigh: 0.7,
    gate4AgreementThresholdMedium: 0.5,
  },
  contestationPenalties: { established: -12, disputed: -8 },
  deduplication: {
    evidenceScopeThreshold: 0.85,
    claimSimilarityThreshold: 0.85,
    contextMergeThreshold: 0.7,
  },
  mixedConfidenceThreshold: 60,
};

// ============================================================================
// CONFIG TYPE DEFINITIONS
// ============================================================================

const CONFIG_TYPES: { type: ConfigType; title: string; description: string }[] = [
  {
    type: "search",
    title: "Web Search",
    description: "Search provider, max results, timeouts, domain filters",
  },
  {
    type: "calculation",
    title: "Calculation",
    description: "Verdict bands, centrality weights, quality gates",
  },
  {
    type: "prompt",
    title: "Prompts",
    description: "LLM prompts for analysis pipelines",
  },
];

// ============================================================================
// SEARCH CONFIG FORM COMPONENT
// ============================================================================

function SearchConfigForm({
  config,
  onChange,
}: {
  config: SearchConfig;
  onChange: (config: SearchConfig) => void;
}) {
  const updateField = <K extends keyof SearchConfig>(key: K, value: SearchConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className={styles.formSection}>
      <h3 className={styles.formSectionTitle}>Search Settings</h3>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => updateField("enabled", e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Enable Web Search
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Provider</label>
        <select
          className={styles.formInput}
          value={config.provider}
          onChange={(e) => updateField("provider", e.target.value as SearchConfig["provider"])}
        >
          <option value="auto">Auto (prefer available)</option>
          <option value="google-cse">Google CSE</option>
          <option value="serpapi">SerpAPI</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Search Mode</label>
        <select
          className={styles.formInput}
          value={config.mode}
          onChange={(e) => updateField("mode", e.target.value as SearchConfig["mode"])}
        >
          <option value="standard">Standard</option>
          <option value="grounded">Grounded (Gemini only)</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Max Results</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxResults}
            min={1}
            max={20}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxResults", isNaN(v) ? 6 : v);
            }}
          />
          <div className={styles.formHelp}>1-20 results per query</div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Sources per Iteration</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.maxSourcesPerIteration}
            min={1}
            max={10}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("maxSourcesPerIteration", isNaN(v) ? 4 : v);
            }}
          />
          <div className={styles.formHelp}>1-10 sources</div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Timeout (ms)</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.timeoutMs}
            min={1000}
            max={60000}
            step={1000}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              updateField("timeoutMs", isNaN(v) ? 12000 : v);
            }}
          />
          <div className={styles.formHelp}>1000-60000 ms</div>
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Date Restrict</label>
        <select
          className={styles.formInput}
          value={config.dateRestrict || ""}
          onChange={(e) => updateField("dateRestrict", (e.target.value || null) as SearchConfig["dateRestrict"])}
        >
          <option value="">No restriction</option>
          <option value="y">Past year</option>
          <option value="m">Past month</option>
          <option value="w">Past week</option>
        </select>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Domain Whitelist (comma-separated)</label>
        <input
          type="text"
          className={styles.formInput}
          value={config.domainWhitelist.join(", ")}
          placeholder="e.g., reuters.com, apnews.com"
          onChange={(e) => updateField("domainWhitelist", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className={styles.formHelp}>Only search these domains (empty = all)</div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.formLabel}>Domain Blacklist (comma-separated)</label>
        <input
          type="text"
          className={styles.formInput}
          value={config.domainBlacklist.join(", ")}
          placeholder="e.g., example.com, spam.net"
          onChange={(e) => updateField("domainBlacklist", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
        />
        <div className={styles.formHelp}>Never search these domains</div>
      </div>
    </div>
  );
}

// ============================================================================
// CALCULATION CONFIG FORM COMPONENT
// ============================================================================

function CalcConfigForm({
  config,
  onChange,
}: {
  config: CalcConfig;
  onChange: (config: CalcConfig) => void;
}) {
  const updateNested = <K extends keyof CalcConfig>(
    key: K,
    nested: Partial<CalcConfig[K]>,
  ) => {
    onChange({
      ...config,
      [key]: { ...(config[key] as object), ...nested },
    });
  };

  return (
    <div>
      {/* Centrality Weights */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Centrality Weights</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>High</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.high}
              min={1}
              max={10}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    high: isNaN(v) ? 3 : v,
                  },
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Medium</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.medium}
              min={1}
              max={10}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    medium: isNaN(v) ? 2 : v,
                  },
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Low</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.aggregation.centralityWeights.low}
              min={0.1}
              max={5}
              step={0.1}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("aggregation", {
                  centralityWeights: {
                    ...config.aggregation.centralityWeights,
                    low: isNaN(v) ? 1 : v,
                  },
                });
              }}
            />
          </div>
        </div>
        <div className={styles.formHelp}>
          Must be monotonic: high &gt;= medium &gt;= low
        </div>
      </div>

      {/* Source Reliability */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Source Reliability</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Confidence Threshold</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.confidenceThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  confidenceThreshold: isNaN(v) ? 0.8 : v,
                });
              }}
            />
            <div className={styles.formHelp}>Min LLM confidence (0-1)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Consensus Threshold</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.consensusThreshold}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  consensusThreshold: isNaN(v) ? 0.2 : v,
                });
              }}
            />
            <div className={styles.formHelp}>Max disagreement (0-1)</div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Default Score</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.sourceReliability.defaultScore}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                updateNested("sourceReliability", {
                  defaultScore: isNaN(v) ? 0.5 : v,
                });
              }}
            />
            <div className={styles.formHelp}>For unknown sources (0-1)</div>
          </div>
        </div>
      </div>

      {/* Contestation Penalties */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Contestation Penalties</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Established (strong counter-evidence)</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.contestationPenalties.established}
              min={-50}
              max={0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                updateNested("contestationPenalties", {
                  established: isNaN(v) ? -12 : v,
                });
              }}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Disputed (some counter-evidence)</label>
            <input
              type="number"
              className={styles.formInput}
              value={config.contestationPenalties.disputed}
              min={-50}
              max={0}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                updateNested("contestationPenalties", {
                  disputed: isNaN(v) ? -8 : v,
                });
              }}
            />
          </div>
        </div>
        <div className={styles.formHelp}>
          Penalties should be negative. Established should be &lt;= disputed (more severe).
        </div>
      </div>

      {/* Mixed Confidence */}
      <div className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Other Settings</h3>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>Mixed Confidence Threshold (%)</label>
          <input
            type="number"
            className={styles.formInput}
            value={config.mixedConfidenceThreshold}
            min={0}
            max={100}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              onChange({
                ...config,
                mixedConfidenceThreshold: isNaN(v) ? 60 : v,
              });
            }}
          />
          <div className={styles.formHelp}>
            Below this, MIXED becomes UNVERIFIED (0-100)
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ConfigAdminPage() {
  // Admin auth for API requests
  const { getHeaders } = useAdminAuth();

  // Query params for deep linking from job reports
  const searchParams = useSearchParams();
  const urlType = searchParams.get("type") as ConfigType | null;
  const urlProfile = searchParams.get("profile");
  const urlHash = searchParams.get("hash");
  const urlTab = searchParams.get("tab") as Tab | null;

  // State
  const [selectedType, setSelectedType] = useState<ConfigType>(urlType || "search");
  const [profileKey, setProfileKey] = useState<string>(urlProfile || "default");
  const [activeTab, setActiveTab] = useState<Tab>(urlTab || "active");
  const [targetHash, setTargetHash] = useState<string | null>(urlHash);
  const [activeConfig, setActiveConfig] = useState<ConfigVersion | null>(null);
  const [viewingVersion, setViewingVersion] = useState<ConfigVersion | null>(null); // Specific version from URL
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [effectiveConfig, setEffectiveConfig] = useState<EffectiveConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state (for JSON configs)
  const [editConfig, setEditConfig] = useState<SearchConfig | CalcConfig | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saving, setSaving] = useState(false);

  // Prompt edit state
  const [promptContent, setPromptContent] = useState<string>("");
  const [promptDirty, setPromptDirty] = useState(false);

  // Track if JSON config has been modified (compare with activeConfig)
  const hasUnsavedJsonChanges = useMemo(() => {
    if (!editConfig || selectedType === "prompt") return false;
    if (!activeConfig?.content) return !!editConfig; // New config = unsaved
    try {
      const current = JSON.stringify(editConfig);
      const active = activeConfig.content;
      // Compare normalized JSON (activeConfig.content is already a string)
      return current !== active;
    } catch {
      return false;
    }
  }, [editConfig, activeConfig, selectedType]);

  // Combined unsaved changes check
  const hasUnsavedChanges = promptDirty || hasUnsavedJsonChanges;

  // Warn user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Profile options
  // Fetch profile options from backend
  const [profileOptions, setProfileOptions] = useState<string[]>(
    selectedType === "prompt"
      ? ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"]
      : ["default"]
  );
  const [profileNotFound, setProfileNotFound] = useState(false);

  useEffect(() => {
    // Fetch profiles from backend
    fetch(`/api/admin/config/${selectedType}/profiles`, { headers: getHeaders() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profiles?.length) {
          let profiles = data.profiles as string[];

          // If URL specifies a profile not in the list, inject it so dropdown works
          // (the config may still exist even if not in "known" profiles)
          if (urlProfile && !profiles.includes(urlProfile)) {
            profiles = [urlProfile, ...profiles];
            setProfileNotFound(true);
          } else {
            setProfileNotFound(false);
          }

          setProfileOptions(profiles);

          // If current profile is not in new list, and no URL profile, select first
          if (!urlProfile && !profiles.includes(profileKey)) {
            setProfileKey(profiles[0]);
          }
        }
      })
      .catch(() => {
        // Fallback to defaults on error
        const defaults = selectedType === "prompt"
          ? ["orchestrated", "monolithic-canonical", "monolithic-dynamic", "source-reliability"]
          : ["default"];
        // Still inject urlProfile if present
        if (urlProfile && !defaults.includes(urlProfile)) {
          setProfileOptions([urlProfile, ...defaults]);
          setProfileNotFound(true);
        } else {
          setProfileOptions(defaults);
          setProfileNotFound(false);
        }
      });
  }, [selectedType, getHeaders, urlProfile]);

  // Update profile when type changes (but not on initial load with URL params)
  useEffect(() => {
    if (!urlProfile && profileOptions.length > 0 && !profileOptions.includes(profileKey)) {
      setProfileKey(profileOptions[0]);
    }
    setEditConfig(null);
    setValidation(null);
    setPromptContent("");
    setPromptDirty(false);
  }, [selectedType, profileOptions, urlProfile, profileKey]);

  // Load specific version from URL hash (deep link from job report)
  useEffect(() => {
    if (targetHash && selectedType && profileKey) {
      setLoading(true);
      fetch(`/api/admin/config/${selectedType}/${profileKey}/version/${targetHash}`, {
        headers: getHeaders(),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setViewingVersion(data);
          } else {
            setError(`Version ${targetHash.slice(0, 8)}... not found`);
          }
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [targetHash, selectedType, profileKey, getHeaders]);

  // Initialize edit config when switching to edit tab
  // Only use activeConfig if it matches the current selectedType to prevent race conditions
  useEffect(() => {
    if (activeTab === "edit" && !editConfig && selectedType !== "prompt") {
      // Only initialize from activeConfig if it matches the current type
      if (activeConfig?.content && activeConfig.configType === selectedType) {
        try {
          setEditConfig(JSON.parse(activeConfig.content));
        } catch {
          // Use default on parse failure
          setEditConfig(selectedType === "search" ? DEFAULT_SEARCH_CONFIG : DEFAULT_CALC_CONFIG);
        }
      } else if (activeConfig === null && !loading) {
        // No config exists for this type/profile - use defaults
        setEditConfig(selectedType === "search" ? DEFAULT_SEARCH_CONFIG : DEFAULT_CALC_CONFIG);
      }
      // If activeConfig exists but wrong type, wait for fetchActiveConfig() to complete
    }
  }, [activeTab, activeConfig, editConfig, selectedType, loading]);

  // Fetch active config
  const fetchActiveConfig = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}`, {
        headers: getHeaders(),
      });
      if (res.status === 404) {
        setActiveConfig(null);
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setActiveConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setActiveConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/history`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setHistory(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Fetch effective config (with overrides)
  const fetchEffectiveConfig = useCallback(async () => {
    if (selectedType === "prompt") {
      setEffectiveConfig(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/effective`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setEffectiveConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setEffectiveConfig(null);
    } finally {
      setLoading(false);
    }
  }, [selectedType, profileKey, getHeaders]);

  // Validate config
  const validateConfig = useCallback(async () => {
    if (!editConfig) return;

    try {
      const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/validate`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content: JSON.stringify(editConfig, null, 2) }),
      });
      const data = await res.json();
      setValidation(data);
    } catch (err) {
      setValidation({
        valid: false,
        errors: [err instanceof Error ? err.message : String(err)],
        warnings: [],
      });
    }
  }, [editConfig, selectedType, profileKey, getHeaders]);

  // Save and activate config
  const saveConfig = async (activate: boolean) => {
    if (!editConfig) return;

    setSaving(true);
    setError(null);

    try {
      const content = JSON.stringify(editConfig, null, 2);
      const label = versionLabel || suggestVersionLabel();

      // Save
      const saveRes = await fetch(`/api/admin/config/${selectedType}/${profileKey}`, {
        method: "PUT",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ content, versionLabel: label }),
      });

      if (!saveRes.ok) {
        const data = await saveRes.json();
        throw new Error(data.error || "Failed to save");
      }

      const saveData = await saveRes.json();

      // Activate if requested
      if (activate) {
        const activateRes = await fetch(`/api/admin/config/${selectedType}/${profileKey}/activate`, {
          method: "POST",
          headers: { ...getHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ contentHash: saveData.contentHash }),
        });

        if (!activateRes.ok) {
          throw new Error("Saved but failed to activate");
        }
      }

      // Refresh data
      fetchActiveConfig();
      fetchHistory();
      setVersionLabel("");
      alert(activate ? "Config saved and activated!" : "Config saved as draft");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  // Load data when tab/type/profile changes
  useEffect(() => {
    if (activeTab === "active") {
      fetchActiveConfig();
    } else if (activeTab === "history") {
      fetchHistory();
    } else if (activeTab === "effective") {
      fetchEffectiveConfig();
    } else if (activeTab === "edit" && selectedType === "prompt" && !promptContent && !promptDirty) {
      // Load prompt content for editing
      fetchActiveConfig();
    } else if (activeTab === "edit" && selectedType !== "prompt" && !editConfig) {
      // Load JSON config for editing (search/calculation)
      fetchActiveConfig();
    }
  }, [activeTab, selectedType, profileKey, fetchActiveConfig, fetchHistory, fetchEffectiveConfig, promptContent, promptDirty, editConfig]);

  // Initialize prompt content from active config when available
  // Only use activeConfig if it matches current type AND profile to prevent race conditions
  useEffect(() => {
    if (
      selectedType === "prompt" &&
      activeConfig?.content &&
      activeConfig.configType === "prompt" &&
      activeConfig.profileKey === profileKey &&
      !promptContent &&
      !promptDirty
    ) {
      setPromptContent(activeConfig.content);
    }
  }, [selectedType, activeConfig, profileKey, promptContent, promptDirty]);

  // Copy content to clipboard
  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  // Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString();
  };

  // Truncate hash for display
  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  // Generate suggested version label with timestamp
  const suggestVersionLabel = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.toTimeString().slice(0, 5).replace(":", ""); // HHMM
    return `v${date}-${time}`;
  };

  // Import JSON handler with schema validation
  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Validate structure matches expected config type
        if (selectedType === "search") {
          // Check required top-level keys for search config
          if (typeof parsed.enabled !== "boolean" || typeof parsed.provider !== "string") {
            throw new Error("Invalid search config: missing 'enabled' or 'provider' fields");
          }
        } else if (selectedType === "calculation") {
          // Check required top-level keys for calculation config
          if (!parsed.aggregation || !parsed.verdictBands || !parsed.sourceReliability) {
            throw new Error("Invalid calculation config: missing 'aggregation', 'verdictBands', or 'sourceReliability' fields");
          }
        }

        setEditConfig(parsed);
        setValidation(null);
      } catch (err) {
        alert(`Failed to import: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    input.click();
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Configuration Management</h1>
        <p className={styles.subtitle}>
          View and manage search, calculation, and prompt configurations
        </p>
      </div>

      {/* Config Type Selector */}
      <div className={styles.typeSelector}>
        {CONFIG_TYPES.map((ct) => (
          <div
            key={ct.type}
            className={`${styles.typeCard} ${selectedType === ct.type ? styles.selected : ""}`}
            onClick={() => {
              if (ct.type === selectedType) return;
              if (hasUnsavedChanges) {
                if (!confirm("You have unsaved changes. Switch config type anyway?")) return;
              }
              setSelectedType(ct.type);
            }}
            role="button"
            tabIndex={0}
          >
            <div className={styles.typeCardTitle}>{ct.title}</div>
            <div className={styles.typeCardDesc}>{ct.description}</div>
          </div>
        ))}
      </div>

      {/* Profile Selector */}
      <div className={styles.profileSelector}>
        <label htmlFor="profile-select" style={{ marginRight: 8, fontWeight: 500 }}>
          Profile:
        </label>
        <select
          id="profile-select"
          className={styles.profileSelect}
          value={profileKey}
          onChange={(e) => {
            if (e.target.value === profileKey) return;
            if (hasUnsavedChanges) {
              if (!confirm("You have unsaved changes. Switch profile anyway?")) {
                // Reset the select to current value (user cancelled)
                e.target.value = profileKey;
                return;
              }
            }
            setProfileKey(e.target.value);
          }}
        >
          {profileOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        {profileNotFound && profileKey === urlProfile && (
          <span style={{
            marginLeft: 12,
            padding: "4px 8px",
            backgroundColor: "#fff3cd",
            color: "#856404",
            borderRadius: 4,
            fontSize: "0.85em",
          }}>
            Profile &quot;{urlProfile}&quot; not in known list (may still load)
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "active" ? styles.active : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active Config
        </button>
        <button
          className={`${styles.tab} ${activeTab === "history" ? styles.active : ""}`}
          onClick={() => setActiveTab("history")}
        >
          History
        </button>
        <button
          className={`${styles.tab} ${activeTab === "edit" ? styles.active : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          Edit {hasUnsavedChanges && <span style={{ color: "#f59e0b", marginLeft: 4 }}>●</span>}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "effective" ? styles.active : ""}`}
          onClick={() => setActiveTab("effective")}
          disabled={selectedType === "prompt"}
          title={selectedType === "prompt" ? "N/A for prompts (no env overrides)" : "View config with environment overrides applied"}
        >
          Effective
        </button>
        {selectedType === "prompt" && (
          <button
            className={`${styles.tab}`}
            onClick={async () => {
              const url = `/api/admin/config/prompt/${profileKey}/export`;
              const res = await fetch(url, { headers: getHeaders() });
              if (res.ok) {
                const blob = await res.blob();
                const filename = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `${profileKey}.prompt.md`;
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = filename;
                a.click();
              } else {
                alert("Export failed: " + (await res.json()).error);
              }
            }}
          >
            Export
          </button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loading}>
          Loading...
        </div>
      )}

      {/* Active Config Tab */}
      {activeTab === "active" && !loading && (
        <>
          {/* Show banner if viewing a specific version from URL */}
          {viewingVersion && targetHash && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#dbeafe",
              border: "1px solid #93c5fd",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}>
              <div>
                <span style={{ fontWeight: 500 }}>📌 Viewing specific version from job report:</span>
                <span style={{ marginLeft: 8, fontFamily: "monospace", fontSize: 12 }}>
                  {truncateHash(targetHash)}
                </span>
                {viewingVersion.contentHash !== activeConfig?.contentHash && (
                  <span style={{ marginLeft: 8, color: "#92400e", fontSize: 12 }}>
                    (not the currently active version)
                  </span>
                )}
              </div>
              <button
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => {
                  setTargetHash(null);
                  setViewingVersion(null);
                  // Clear URL params
                  window.history.replaceState({}, "", "/admin/config");
                }}
              >
                Clear &amp; show active
              </button>
            </div>
          )}

          {/* Show either the specific version or active config */}
          {(viewingVersion || activeConfig) ? (
            <div className={styles.configViewer}>
              <div className={styles.configHeader}>
                <div className={styles.configMeta}>
                  <div className={styles.configLabel}>
                    {(viewingVersion || activeConfig)!.versionLabel}
                    {viewingVersion && viewingVersion.contentHash === activeConfig?.contentHash ? (
                      <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                        Active
                      </span>
                    ) : viewingVersion ? (
                      <span className={styles.status} style={{ marginLeft: 8, background: "#dbeafe", color: "#1e40af" }}>
                        Historical
                      </span>
                    ) : (
                      <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div className={styles.configHash} title={(viewingVersion || activeConfig)!.contentHash}>
                    Hash: {truncateHash((viewingVersion || activeConfig)!.contentHash)}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Schema: {(viewingVersion || activeConfig)!.schemaVersion} |
                    Created: {formatDate((viewingVersion || activeConfig)!.createdUtc)}
                    {(viewingVersion || activeConfig)!.createdBy && ` by ${(viewingVersion || activeConfig)!.createdBy}`}
                  </div>
                </div>
                <div className={styles.configActions}>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => copyToClipboard((viewingVersion || activeConfig)!.content)}
                  >
                    Copy
                  </button>
                  <button
                    className={`${styles.button} ${styles.buttonSecondary}`}
                    onClick={() => {
                      const cfg = viewingVersion || activeConfig;
                      const blob = new Blob([cfg!.content], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedType}-${profileKey}-${cfg!.contentHash.slice(0, 8)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download
                  </button>
                  {selectedType !== "prompt" && (
                    <button
                      className={`${styles.button} ${styles.buttonPrimary}`}
                      onClick={() => {
                        try {
                          setEditConfig(JSON.parse((viewingVersion || activeConfig)!.content));
                          setActiveTab("edit");
                        } catch {
                          alert("Failed to parse config for editing");
                        }
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
              <pre className={styles.configContent}>
                {(viewingVersion || activeConfig)!.content}
              </pre>
            </div>
          ) : !error && !viewingVersion && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📋</div>
              <div className={styles.emptyText}>No active config found</div>
              <div className={styles.emptyHint}>
                Create a new config using the Edit tab
              </div>
              {selectedType !== "prompt" && (
                <button
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  style={{ marginTop: 16 }}
                  onClick={() => {
                    setEditConfig(selectedType === "search" ? DEFAULT_SEARCH_CONFIG : DEFAULT_CALC_CONFIG);
                    setActiveTab("edit");
                  }}
                >
                  Create Default Config
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* History Tab */}
      {activeTab === "history" && !loading && (
        <>
          {history && history.versions.length > 0 ? (
            <div className={styles.historyList}>
              {history.versions.map((v) => (
                <div key={v.contentHash} className={styles.historyItem}>
                  <div className={styles.historyMeta}>
                    <div className={styles.historyLabel}>
                      {v.versionLabel}
                      {v.isActive && (
                        <span className={`${styles.status} ${styles.statusActive}`} style={{ marginLeft: 8 }}>
                          Active
                        </span>
                      )}
                    </div>
                    <div className={styles.historyHash} title={v.contentHash}>
                      {truncateHash(v.contentHash)}
                    </div>
                    <div className={styles.historyDate}>
                      Created: {formatDate(v.createdUtc)}
                      {v.createdBy && ` by ${v.createdBy}`}
                    </div>
                  </div>
                  <div className={styles.historyActions}>
                    <button
                      className={`${styles.button} ${styles.buttonSecondary}`}
                      onClick={async () => {
                        const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/version/${v.contentHash}`, {
                          headers: getHeaders(),
                        });
                        const data = await res.json();
                        if (data.content) {
                          const blob = new Blob([data.content], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank");
                        }
                      }}
                    >
                      View
                    </button>
                    {!v.isActive && (
                      <button
                        className={`${styles.button} ${styles.buttonPrimary}`}
                        onClick={async () => {
                          if (!confirm(`Activate version "${v.versionLabel}"?`)) return;
                          try {
                            const res = await fetch(`/api/admin/config/${selectedType}/${profileKey}/activate`, {
                              method: "POST",
                              headers: { ...getHeaders(), "Content-Type": "application/json" },
                              body: JSON.stringify({ contentHash: v.contentHash }),
                            });
                            if (!res.ok) throw new Error("Failed to activate");
                            fetchHistory();
                            fetchActiveConfig();
                          } catch (err) {
                            alert(`Error: ${err}`);
                          }
                        }}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: 13, color: "#6b7280" }}>
                Showing {history.versions.length} of {history.total} versions
              </div>
            </div>
          ) : !error && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📜</div>
              <div className={styles.emptyText}>No version history</div>
              <div className={styles.emptyHint}>
                Save a config to start tracking versions
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Tab - Prompt (Markdown Editor) */}
      {activeTab === "edit" && selectedType === "prompt" && (
        <div className={styles.editorSection}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="text"
                placeholder="Version label (optional)"
                className={styles.formInput}
                style={{ width: 200 }}
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVersionLabel(suggestVersionLabel())}
                title="Generate timestamp-based version label"
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                📅
              </button>
            </div>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={async () => {
                // Validate prompt
                const res = await fetch(`/api/admin/config/prompt/${profileKey}/validate`, {
                  method: "POST",
                  headers: { ...getHeaders(), "Content-Type": "application/json" },
                  body: JSON.stringify({ content: promptContent }),
                });
                const data = await res.json();
                setValidation(data);
              }}
            >
              Validate
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={async () => {
                // Save draft
                try {
                  setSaving(true);
                  const res = await fetch(`/api/admin/config/prompt/${profileKey}`, {
                    method: "PUT",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ content: promptContent, versionLabel: versionLabel || suggestVersionLabel() }),
                  });
                  if (!res.ok) throw new Error((await res.json()).error || "Save failed");
                  alert("Saved as draft");
                  setPromptDirty(false);
                  fetchHistory();
                } catch (err) {
                  alert(`Error: ${err}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !promptContent}
            >
              Save Draft
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={async () => {
                // Save and activate
                try {
                  setSaving(true);
                  const saveRes = await fetch(`/api/admin/config/prompt/${profileKey}`, {
                    method: "PUT",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ content: promptContent, versionLabel: versionLabel || suggestVersionLabel() }),
                  });
                  if (!saveRes.ok) throw new Error((await saveRes.json()).error || "Save failed");
                  const saveData = await saveRes.json();

                  const activateRes = await fetch(`/api/admin/config/prompt/${profileKey}/activate`, {
                    method: "POST",
                    headers: { ...getHeaders(), "Content-Type": "application/json" },
                    body: JSON.stringify({ contentHash: saveData.contentHash }),
                  });
                  if (!activateRes.ok) throw new Error("Saved but failed to activate");

                  alert("Saved and activated!");
                  setPromptDirty(false);
                  setVersionLabel("");
                  fetchActiveConfig();
                  fetchHistory();
                } catch (err) {
                  alert(`Error: ${err}`);
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving || !promptContent}
            >
              {saving ? "Saving..." : "Save & Activate"}
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                if (promptDirty && !confirm("Discard your changes and reset to the active version?")) {
                  return;
                }
                if (activeConfig?.content) {
                  setPromptContent(activeConfig.content);
                  setPromptDirty(false);
                }
              }}
              disabled={!activeConfig || !promptDirty}
            >
              Reset
            </button>
          </div>

          {/* Validation results */}
          {validation && (
            <div style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: validation.valid ? "#d1fae5" : "#fee2e2",
              border: `1px solid ${validation.valid ? "#10b981" : "#ef4444"}`,
              borderRadius: 8,
            }}>
              {validation.valid ? (
                <div style={{ color: "#065f46" }}>Valid prompt</div>
              ) : (
                <div>
                  {validation.errors.map((e, i) => (
                    <div key={i} style={{ color: "#b91c1c" }}>Error: {e}</div>
                  ))}
                </div>
              )}
              {validation.warnings.map((w, i) => (
                <div key={i} style={{ color: "#92400e" }}>Warning: {w}</div>
              ))}
            </div>
          )}

          {/* Markdown editor */}
          <div style={{ display: "flex", gap: 16, height: 600 }}>
            {/* Line numbers + editor */}
            <div style={{ flex: 1, display: "flex", border: "1px solid #d1d5db", borderRadius: 8, overflow: "hidden" }}>
              <div style={{
                width: 50,
                background: "#f3f4f6",
                borderRight: "1px solid #d1d5db",
                padding: "8px 0",
                fontFamily: "monospace",
                fontSize: 13,
                lineHeight: "1.5em",
                color: "#9ca3af",
                textAlign: "right",
                overflow: "hidden",
                userSelect: "none",
              }}>
                {promptContent.split("\n").map((_, i) => (
                  <div key={i} style={{ paddingRight: 8 }}>{i + 1}</div>
                ))}
              </div>
              <textarea
                value={promptContent}
                onChange={(e) => {
                  setPromptContent(e.target.value);
                  setPromptDirty(true);
                }}
                style={{
                  flex: 1,
                  border: "none",
                  resize: "none",
                  padding: 8,
                  fontFamily: "monospace",
                  fontSize: 13,
                  lineHeight: "1.5em",
                  outline: "none",
                }}
                spellCheck={false}
                placeholder="Load a prompt to edit, or paste content here..."
              />
            </div>

            {/* Section navigator */}
            <div style={{
              width: 200,
              background: "#f9fafb",
              border: "1px solid #d1d5db",
              borderRadius: 8,
              padding: 12,
              overflow: "auto",
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Sections</div>
              {promptContent.split("\n").map((line, i) => {
                const match = line.match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
                if (match) {
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "4px 8px",
                        cursor: "pointer",
                        fontSize: 12,
                        borderRadius: 4,
                        marginBottom: 2,
                      }}
                      onClick={() => {
                        // Scroll to line (approximate)
                        const textarea = document.querySelector("textarea");
                        if (textarea) {
                          const lines = promptContent.substring(0, promptContent.split("\n").slice(0, i).join("\n").length).split("\n").length;
                          textarea.scrollTop = lines * 19.5;
                          textarea.focus();
                        }
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {match[1]}
                    </div>
                  );
                }
                return null;
              })}
              {!promptContent.includes("## ") && (
                <div style={{ color: "#9ca3af", fontSize: 11 }}>No sections found</div>
              )}
            </div>
          </div>

          {promptDirty && (
            <div style={{ marginTop: 8, color: "#92400e", fontSize: 13 }}>
              Unsaved changes
            </div>
          )}
        </div>
      )}

      {/* Edit Tab - JSON configs (search, calculation) */}
      {activeTab === "edit" && selectedType !== "prompt" && (
        <div>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="text"
                placeholder="Version label (optional)"
                className={styles.formInput}
                style={{ width: 200 }}
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setVersionLabel(suggestVersionLabel())}
                title="Generate timestamp-based version label"
                style={{
                  padding: "6px 10px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: "#f9fafb",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                📅
              </button>
            </div>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={validateConfig}
            >
              Validate
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => saveConfig(false)}
              disabled={saving}
            >
              Save Draft
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => saveConfig(true)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save & Activate"}
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleImport}
            >
              Import JSON
            </button>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => {
                if (hasUnsavedJsonChanges && !confirm("Discard your changes and reset to defaults?")) {
                  return;
                }
                setEditConfig(selectedType === "search" ? DEFAULT_SEARCH_CONFIG : DEFAULT_CALC_CONFIG);
                setValidation(null);
              }}
            >
              Reset to Default
            </button>
          </div>

          {/* Validation results */}
          {validation && (
            <div style={{
              padding: 12,
              marginBottom: 20,
              borderRadius: 6,
              background: validation.valid ? "#dcfce7" : "#fef2f2",
              border: `1px solid ${validation.valid ? "#86efac" : "#fecaca"}`,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {validation.valid ? "✓ Valid" : "✗ Invalid"}
              </div>
              {validation.errors.length > 0 && (
                <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#991b1b" }}>
                  {validation.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {validation.warnings.length > 0 && (
                <ul style={{ margin: "8px 0", paddingLeft: 20, color: "#92400e" }}>
                  {validation.warnings.map((w, i) => <li key={i}>Warning: {w}</li>)}
                </ul>
              )}
              {validation.canonicalizedHash && (
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
                  Hash: {validation.canonicalizedHash}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          {editConfig && selectedType === "search" && (
            <SearchConfigForm
              config={editConfig as SearchConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}
          {editConfig && selectedType === "calculation" && (
            <CalcConfigForm
              config={editConfig as CalcConfig}
              onChange={(c) => {
                setEditConfig(c);
                setValidation(null);
              }}
            />
          )}

          {/* JSON Preview */}
          {editConfig && (
            <div className={styles.formSection}>
              <h3 className={styles.formSectionTitle}>JSON Preview</h3>
              <pre className={styles.configContent} style={{ maxHeight: 300 }}>
                {JSON.stringify(editConfig, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Effective Config Tab */}
      {activeTab === "effective" && !loading && selectedType !== "prompt" && (
        <>
          {effectiveConfig ? (
            <div>
              {/* Override Policy Badge */}
              <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 500 }}>Override Policy:</span>
                <span className={`${styles.status} ${effectiveConfig.overridePolicy === "off" ? styles.statusInactive : styles.statusActive}`}>
                  {effectiveConfig.overridePolicy}
                </span>
                {effectiveConfig.overrides.length > 0 && (
                  <span style={{ fontSize: 13, color: "#92400e" }}>
                    {effectiveConfig.overrides.length} override(s) applied
                  </span>
                )}
              </div>

              {/* Overrides List */}
              {effectiveConfig.overrides.length > 0 && (
                <div style={{
                  marginBottom: 20,
                  padding: 16,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                }}>
                  <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>Environment Variable Overrides</h4>
                  <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: "1px solid #fde68a" }}>
                        <th style={{ padding: "8px 12px" }}>Env Var</th>
                        <th style={{ padding: "8px 12px" }}>Field</th>
                        <th style={{ padding: "8px 12px" }}>Applied Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {effectiveConfig.overrides.map((o, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #fef3c7" }}>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{o.envVar}</td>
                          <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{o.fieldPath}</td>
                          <td style={{ padding: "8px 12px" }}>
                            {o.appliedValue !== undefined ? String(o.appliedValue) : "(complex value)"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Side-by-side comparison */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>Base Config (from DB)</h4>
                  <pre className={styles.configContent} style={{ maxHeight: 400 }}>
                    {JSON.stringify(effectiveConfig.base, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
                    Effective Config (with overrides)
                    {effectiveConfig.overrides.length > 0 && (
                      <span style={{ marginLeft: 8, color: "#92400e", fontWeight: 400, fontSize: 12 }}>
                        modified
                      </span>
                    )}
                  </h4>
                  <pre className={styles.configContent} style={{ maxHeight: 400 }}>
                    {JSON.stringify(effectiveConfig.effective, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : !error && (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>⚡</div>
              <div className={styles.emptyText}>No config to preview</div>
              <div className={styles.emptyHint}>
                Create a config first to see the effective values with overrides
              </div>
            </div>
          )}
        </>
      )}

      {/* Effective Tab - Prompt redirect */}
      {activeTab === "effective" && selectedType === "prompt" && (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📝</div>
          <div className={styles.emptyText}>Effective config not available for prompts</div>
          <div className={styles.emptyHint}>
            Prompts don't support environment variable overrides
          </div>
        </div>
      )}
    </div>
  );
}
