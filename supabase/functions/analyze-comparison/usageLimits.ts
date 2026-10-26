export const MAX_FREE_TIER_LIMITS = {
  globalPerMinute: 3,
  globalPerDay: 10,
  userPerDay: 6,
  comparisonPerDay: 3,
} as const;

export type UsageLimits = {
  globalPerMinute: number;
  globalPerDay: number;
  userPerDay: number;
  comparisonPerDay: number;
};

export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  globalPerMinute: MAX_FREE_TIER_LIMITS.globalPerMinute,
  globalPerDay: MAX_FREE_TIER_LIMITS.globalPerDay,
  userPerDay: MAX_FREE_TIER_LIMITS.userPerDay,
  comparisonPerDay: MAX_FREE_TIER_LIMITS.comparisonPerDay,
};

function readLimit(
  value: string | undefined | null,
  maximum: number,
  fallback: number,
): number {
  if (value === undefined || value === null || typeof value !== "string" || value.trim() === "") {
    return fallback;
  }
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    return fallback;
  }
  return parsed;
}

export function readUsageLimits(
  getEnv: (name: string) => string | undefined | null,
  defaults: UsageLimits = DEFAULT_USAGE_LIMITS,
): UsageLimits {
  return {
    globalPerMinute: readLimit(
      getEnv("AI_GLOBAL_PER_MINUTE"),
      MAX_FREE_TIER_LIMITS.globalPerMinute,
      defaults.globalPerMinute,
    ),
    globalPerDay: readLimit(
      getEnv("AI_GLOBAL_PER_DAY"),
      MAX_FREE_TIER_LIMITS.globalPerDay,
      defaults.globalPerDay,
    ),
    userPerDay: readLimit(
      getEnv("AI_USER_PER_DAY"),
      MAX_FREE_TIER_LIMITS.userPerDay,
      defaults.userPerDay,
    ),
    comparisonPerDay: readLimit(
      getEnv("AI_COMPARISON_PER_DAY"),
      MAX_FREE_TIER_LIMITS.comparisonPerDay,
      defaults.comparisonPerDay,
    ),
  };
}
