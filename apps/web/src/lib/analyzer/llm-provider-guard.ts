import type { LLMProviderType } from "./types";

type ProviderGateState = {
  active: number;
  waiters: Array<() => void>;
};

type LlmConcurrencyLane = {
  key: string;
  envSuffixes: string[];
};

function getProviderGateStore(): Map<string, ProviderGateState> {
  const g = globalThis as {
    __fhLlmProviderGateStore?: Map<string, ProviderGateState>;
  };

  if (!g.__fhLlmProviderGateStore) {
    g.__fhLlmProviderGateStore = new Map();
  }

  return g.__fhLlmProviderGateStore;
}

function getProviderGateState(laneKey: string): ProviderGateState {
  const store = getProviderGateStore();
  const existing = store.get(laneKey);
  if (existing) return existing;

  const created: ProviderGateState = { active: 0, waiters: [] };
  store.set(laneKey, created);
  return created;
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

function resolveConcurrencyLane(
  provider: LLMProviderType,
  modelName: string,
): LlmConcurrencyLane {
  const normalizedModel = (modelName || "").toLowerCase();

  if (provider === "anthropic") {
    if (normalizedModel.includes("sonnet")) {
      return {
        key: "anthropic:sonnet",
        envSuffixes: ["ANTHROPIC_SONNET", "ANTHROPIC"],
      };
    }

    if (normalizedModel.includes("haiku")) {
      return {
        key: "anthropic:haiku",
        envSuffixes: ["ANTHROPIC_HAIKU", "ANTHROPIC"],
      };
    }

    if (normalizedModel.includes("opus")) {
      return {
        key: "anthropic:opus",
        envSuffixes: ["ANTHROPIC_OPUS", "ANTHROPIC"],
      };
    }
  }

  return {
    key: provider,
    envSuffixes: [provider.toUpperCase()],
  };
}

export function getLlmProviderConcurrencyLimit(
  provider: LLMProviderType,
  modelName: string,
  env: Record<string, string | undefined> = process.env,
): number {
  const lane = resolveConcurrencyLane(provider, modelName);

  for (const envSuffix of lane.envSuffixes) {
    const override = parsePositiveInt(env[`FH_LLM_MAX_CONCURRENCY_${envSuffix}`]);
    if (override) return override;
  }

  const defaultOverride = parsePositiveInt(env.FH_LLM_MAX_CONCURRENCY_DEFAULT);
  if (defaultOverride) return defaultOverride;

  // Anthropic Sonnet is the burstiest Stage-4 path and shares org-level RPM/token
  // pressure with other Sonnet calls. Keep that lane slightly tighter by default.
  return lane.key === "anthropic:sonnet" ? 2 : 3;
}

async function acquireProviderSlot(
  laneKey: string,
  limit: number,
): Promise<() => void> {
  const state = getProviderGateState(laneKey);

  return new Promise((resolve) => {
    const grant = () => {
      state.active += 1;
      let released = false;

      resolve(() => {
        if (released) return;
        released = true;
        state.active = Math.max(0, state.active - 1);
        const next = state.waiters.shift();
        if (next) next();
      });
    };

    if (state.active < limit) {
      grant();
      return;
    }

    state.waiters.push(grant);
  });
}

export async function withLlmProviderConcurrencyLimit<T>(
  provider: LLMProviderType,
  modelName: string,
  task: () => Promise<T>,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  const lane = resolveConcurrencyLane(provider, modelName);
  const limit = getLlmProviderConcurrencyLimit(provider, modelName, env);
  const release = await acquireProviderSlot(lane.key, limit);

  try {
    return await task();
  } finally {
    release();
  }
}

export async function runWithLlmProviderGuard<T>(
  provider: LLMProviderType,
  modelName: string,
  task: () => Promise<T>,
  env: Record<string, string | undefined> = process.env,
): Promise<T> {
  return withLlmProviderConcurrencyLimit(provider, modelName, task, env);
}

export function __resetLlmProviderGuardForTests(): void {
  const store = getProviderGateStore();
  store.clear();
}
