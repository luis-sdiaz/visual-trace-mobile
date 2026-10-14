export const MAX_FREE_TIER_LIMITS = {
  globalPerMinute: 3,
  globalPerDay: 10,
  userPerDay: 6,
} as const;

export type UsageLimits = {
  globalPerMinute: number;
  globalPerDay: number;
  userPerDay: number;
};

function readLimit(value: string | undefined, maximum: number): number {
  const parsed = Number(value);
  if (!value || !Number.isInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new Error("AI usage limit configuration is unavailable or unsafe.");
  }
  return parsed;
}

export function readUsageLimits(getEnv: (name: string) => string | undefined): UsageLimits {
  return {
    globalPerMinute: readLimit(
      getEnv("AI_GLOBAL_PER_MINUTE"),
      MAX_FREE_TIER_LIMITS.globalPerMinute,
    ),
    globalPerDay: readLimit(getEnv("AI_GLOBAL_PER_DAY"), MAX_FREE_TIER_LIMITS.globalPerDay),
    userPerDay: readLimit(getEnv("AI_USER_PER_DAY"), MAX_FREE_TIER_LIMITS.userPerDay),
  };
}
