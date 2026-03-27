export function pickLocalizedJson(
  value: Record<string, string> | null | undefined,
  locale: string
): string {
  if (!value || typeof value !== "object") return "";
  return (
    value[locale] ??
    value.en ??
    value.nb ??
    Object.values(value).find((v) => typeof v === "string") ??
    ""
  );
}
