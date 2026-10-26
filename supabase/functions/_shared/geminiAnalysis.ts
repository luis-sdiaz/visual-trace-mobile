export const GEMINI_ANALYSIS_CONTRACT_VERSION = "1.0" as const;

export const VISUAL_DIFFERENCE_CATEGORIES = [
  "added",
  "removed",
  "modified",
  "moved",
  "appearance",
  "other",
] as const;

export type VisualDifferenceCategory =
  (typeof VISUAL_DIFFERENCE_CATEGORIES)[number];

export type VisualDifference = {
  category: VisualDifferenceCategory;
  description: string;
};

export type GeminiAnalysisReport = {
  contractVersion: typeof GEMINI_ANALYSIS_CONTRACT_VERSION;
  hasVisibleChanges: boolean;
  summary: string;
  differences: VisualDifference[];
  observations: string[];
  uncertainties: string[];
};

export const GEMINI_ANALYSIS_LIMITS = {
  summaryMaxLength: 500,
  differenceDescriptionMaxLength: 500,
  observationMaxLength: 300,
  uncertaintyMaxLength: 300,
  maxDifferences: 12,
  maxObservations: 8,
  maxUncertainties: 8,
} as const;

export const GEMINI_ANALYSIS_RESPONSE_SCHEMA = {
  type: "OBJECT",
  required: [
    "contractVersion",
    "hasVisibleChanges",
    "summary",
    "differences",
    "observations",
    "uncertainties",
  ],
  properties: {
    contractVersion: {
      type: "STRING",
      enum: [GEMINI_ANALYSIS_CONTRACT_VERSION],
    },
    hasVisibleChanges: { type: "BOOLEAN" },
    summary: {
      type: "STRING",
    },
    differences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        required: ["category", "description"],
        properties: {
          category: {
            type: "STRING",
            enum: [...VISUAL_DIFFERENCE_CATEGORIES],
          },
          description: {
            type: "STRING",
          },
        },
      },
    },
    observations: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },
    uncertainties: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },
  },
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isBoundedTextArray(
  value: unknown,
  maxItems: number,
  maxLength: number,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxItems &&
    value.every((item) => isBoundedText(item, maxLength))
  );
}

export function isGeminiAnalysisReport(
  value: unknown,
): value is GeminiAnalysisReport {
  if (!isRecord(value)) {
    return false;
  }

  const expectedKeys = [
    "contractVersion",
    "hasVisibleChanges",
    "summary",
    "differences",
    "observations",
    "uncertainties",
  ];

  if (
    Object.keys(value).some((key) => !expectedKeys.includes(key)) ||
    value.contractVersion !== GEMINI_ANALYSIS_CONTRACT_VERSION ||
    typeof value.hasVisibleChanges !== "boolean" ||
    !isBoundedText(value.summary, GEMINI_ANALYSIS_LIMITS.summaryMaxLength) ||
    !Array.isArray(value.differences) ||
    value.differences.length > GEMINI_ANALYSIS_LIMITS.maxDifferences ||
    !isBoundedTextArray(
      value.observations,
      GEMINI_ANALYSIS_LIMITS.maxObservations,
      GEMINI_ANALYSIS_LIMITS.observationMaxLength,
    ) ||
    !isBoundedTextArray(
      value.uncertainties,
      GEMINI_ANALYSIS_LIMITS.maxUncertainties,
      GEMINI_ANALYSIS_LIMITS.uncertaintyMaxLength,
    )
  ) {
    return false;
  }

  if (
    !value.differences.every(
      (difference) =>
        isRecord(difference) &&
        Object.keys(difference).length === 2 &&
        VISUAL_DIFFERENCE_CATEGORIES.includes(
          difference.category as VisualDifferenceCategory,
        ) &&
        isBoundedText(
          difference.description,
          GEMINI_ANALYSIS_LIMITS.differenceDescriptionMaxLength,
        ),
    )
  ) {
    return false;
  }

  return value.hasVisibleChanges || value.differences.length === 0;
}

export function parseGeminiAnalysisReport(
  value: unknown,
): GeminiAnalysisReport {
  if (!isGeminiAnalysisReport(value)) {
    throw new Error("Invalid Gemini analysis report.");
  }

  return value;
}
