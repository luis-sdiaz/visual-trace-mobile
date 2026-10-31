export function localizeAiReportText(
  value: string,
  knownTranslations: Record<string, string>,
): string {
  return knownTranslations[value] ?? value;
}

export function localizeAiReportList(
  values: string[],
  knownTranslations: Record<string, string>,
): string[] {
  return values.map((value) => localizeAiReportText(value, knownTranslations));
}
